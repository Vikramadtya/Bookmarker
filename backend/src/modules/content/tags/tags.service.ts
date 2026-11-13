import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IBookmarkRepository } from '@content/bookmarks/domain/repositories/bookmark.repository.interface';
import { TagMeta } from './tag-meta.schema';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class TagsService {
  constructor(
    @Inject('IBookmarkRepository')
    private readonly bookmarks: IBookmarkRepository,
    @InjectModel(TagMeta.name) private readonly meta: Model<TagMeta>,
  ) {}

  /** Every tag with its bookmark count and color; nested tags appear as `a/b`. */
  async list(userId: string) {
    const [counts, metas] = await Promise.all([
      this.bookmarks.tagCounts(userId),
      this.meta.find({ userId }).lean().exec(),
    ]);
    const colors = new Map(metas.map((m) => [m.tag, m.color]));
    return counts.map(({ tag, count }) => ({
      tag,
      count,
      color: colors.get(tag) ?? null,
    }));
  }

  /** Renaming onto an existing tag merges the two. Children move with their parent. */
  async rename(userId: string, from: string, to: string) {
    const target = to
      .trim()
      .replace(/\/+/g, '/')
      .replace(/^\/|\/$/g, '');
    if (!target || target === from)
      throw new BadRequestException('Invalid tag name');
    if (target.startsWith(`${from}/`))
      throw new BadRequestException('A tag cannot move inside itself');

    const updated = await this.bookmarks.renameTag(userId, from, target);
    // Colors follow the rename: the tag itself and everything nested below it.
    const moved = await this.meta
      .find({ userId, tag: new RegExp(`^${escapeRegex(from)}(/|$)`) })
      .lean()
      .exec();
    for (const m of moved) {
      const renamed = target + m.tag.slice(from.length);
      await this.meta.deleteOne({ userId, tag: m.tag });
      await this.meta.updateOne(
        { userId, tag: renamed },
        { $setOnInsert: { color: m.color } },
        { upsert: true },
      );
    }
    return { updated };
  }

  async remove(userId: string, tag: string) {
    const updated = await this.bookmarks.removeTag(userId, tag);
    await this.meta.deleteOne({ userId, tag });
    return { updated };
  }

  async setColor(userId: string, tag: string, color: string | null) {
    if (color === null) await this.meta.deleteOne({ userId, tag });
    else
      await this.meta.updateOne(
        { userId, tag },
        { $set: { color } },
        { upsert: true },
      );
    return { tag, color };
  }
}
