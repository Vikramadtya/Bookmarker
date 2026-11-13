import { Inject, Injectable } from '@nestjs/common';
import { IBookmarkRepository } from '../../domain/repositories/bookmark.repository.interface';
import { FoldersService } from '@workspace/folders/application/services/folders.service';
import { AiService } from '@core/ai/ai.service';
import { domainOf } from '@core/common/url';

export interface Suggestions {
  summary: string;
  tags: string[];
  folderId: string | null;
}

const MAX_TAGS = 3;
const words = (s: string) =>
  new Set(s.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);

/**
 * Suggests tags and a folder for a freshly saved page. Works without any AI
 * (matching existing tags and what you did with the same site before) and gets
 * better when ANTHROPIC_API_KEY is set.
 */
@Injectable()
export class SuggestionsService {
  constructor(
    @Inject('IBookmarkRepository')
    private readonly bookmarks: IBookmarkRepository,
    private readonly folders: FoldersService,
    private readonly ai: AiService,
  ) {}

  async suggest(
    userId: string,
    bookmark: { url: string; title: string; folderId: string; tags: string[] },
    page: { title: string; description: string; text: string },
  ): Promise<Suggestions> {
    const known = (await this.bookmarks.tagCounts(userId)).map((t) => t.tag);
    const have = new Set(bookmark.tags);
    const ranked = new Map<string, number>();
    const bump = (tag: string, score: number) =>
      !have.has(tag) && ranked.set(tag, (ranked.get(tag) ?? 0) + score);

    const aiLabels = await this.ai.labelPage({
      title: page.title || bookmark.title,
      url: bookmark.url,
      text: page.text,
      existingTags: known,
    });
    aiLabels?.tags.forEach((tag) => bump(tag, 10));

    // Tags you already use whose name shows up in the page.
    const pageWords = words(
      `${page.title} ${page.description} ${page.text.slice(0, 3000)}`,
    );
    for (const tag of known) {
      const leaf = tag.split('/').pop()!.toLowerCase();
      if (leaf.length >= 3 && pageWords.has(leaf)) bump(tag, 4);
    }

    // What you did with other pages from the same site.
    const domain = domainOf(bookmark.url);
    const affinity = await this.bookmarks.domainAffinity(userId, domain);
    affinity.tags.forEach(({ tag, count }) => bump(tag, Math.min(count, 3)));

    const tags = [...ranked.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_TAGS)
      .map(([tag]) => tag);

    return {
      summary: aiLabels?.summary ?? '',
      tags,
      folderId: await this.suggestFolder(
        userId,
        bookmark.folderId,
        affinity,
        pageWords,
      ),
    };
  }

  /** Only offered for bookmarks still sitting in the Inbox. */
  private async suggestFolder(
    userId: string,
    currentFolderId: string,
    affinity: { folders: { folderId: string; count: number }[] },
    pageWords: Set<string>,
  ): Promise<string | null> {
    const folders = await this.folders.getAllFolders(userId);
    const current = folders.find((f) => f.id === currentFolderId);
    if (!current?.isInbox) return null;
    const usable = new Map(
      folders.filter((f) => !f.isInbox && !f.isLocked).map((f) => [f.id, f]),
    );

    const sameSite = affinity.folders.find(
      (f) => f.count >= 2 && usable.has(f.folderId),
    );
    if (sameSite) return sameSite.folderId;

    for (const folder of usable.values()) {
      const name = folder.name.toLowerCase();
      if (name.length >= 3 && pageWords.has(name)) return folder.id;
    }
    return null;
  }
}
