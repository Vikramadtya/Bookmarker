import { Injectable, NotFoundException } from '@nestjs/common';
import { BookmarksRepository } from './bookmarks.repository';
import { CreateBookmarkDto } from './dto/create-bookmark.dto';
import { UpdateBookmarkDto } from './dto/update-bookmark.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

// Allowed searchable fields — prevents arbitrary field injection
const SEARCHABLE_FIELDS = new Set([
  'title',
  'description',
  'tags',
  'author',
  'comments',
  'content',
]);
const FIELD_ALIAS: Record<string, string> = { notes: 'comments' };

@Injectable()
export class BookmarksService {
  constructor(
    private readonly bookmarksRepository: BookmarksRepository,
    @InjectQueue('scrape') private scrapeQueue: Queue,
  ) {}

  async createBookmark(userId: string, createBookmarkDto: CreateBookmarkDto) {
    const { title, description, logoURL, bookmarkURL } = createBookmarkDto;
    const needsScraping = !title || !description || !logoURL;

    const bookmark = await this.bookmarksRepository.create({
      ...createBookmarkDto,
      userId,
      title: title || 'Scraping...',
      description: description || 'Extracting metadata...',
      logoURL: logoURL || '',
    });

    if (needsScraping) {
      await this.scrapeQueue.add(
        'scrape-metadata',
        {
          bookmarkId: bookmark._id.toString(),
          url: bookmarkURL,
          userId,
        },
        {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
    }

    return bookmark;
  }

  async getBookmarks(
    userId: string,
    folderId?: string,
    q?: string,
    fields?: string,
  ) {
    const filter = this.buildFilter(userId, folderId, q, fields);
    return this.bookmarksRepository.findWithFilter(filter);
  }

  async getBookmarkById(userId: string, id: string) {
    const bookmark = await this.bookmarksRepository.findOne({
      _id: id,
      userId,
    });
    if (!bookmark)
      throw new NotFoundException(`Bookmark with id ${id} not found`);
    return bookmark;
  }

  async updateBookmark(
    userId: string,
    id: string,
    updateBookmarkDto: UpdateBookmarkDto,
  ) {
    const updated = await this.bookmarksRepository.update(
      { _id: id, userId },
      updateBookmarkDto,
    );
    if (!updated)
      throw new NotFoundException(`Bookmark with id ${id} not found`);
    return updated;
  }

  async deleteBookmark(userId: string, id: string) {
    const deleted = await this.bookmarksRepository.delete({ _id: id, userId });
    if (!deleted)
      throw new NotFoundException(`Bookmark with id ${id} not found`);
  }

  async bulkDelete(userId: string, ids: string[]) {
    await this.bookmarksRepository.bulkDelete(userId, ids);
  }

  async bulkMove(userId: string, ids: string[], folderId: string) {
    await this.bookmarksRepository.bulkMove(userId, ids, folderId);
  }

  async deleteByFolderId(userId: string, folderId: string) {
    await this.bookmarksRepository.deleteByFolderId(userId, folderId);
  }

  async moveByFolderId(
    userId: string,
    oldFolderId: string,
    newFolderId: string,
  ) {
    await this.bookmarksRepository.moveByFolderId(
      userId,
      oldFolderId,
      newFolderId,
    );
  }

  async getTags(userId: string) {
    return this.bookmarksRepository.getTags(userId);
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private buildFilter(
    userId: string,
    folderId?: string,
    q?: string,
    fields?: string,
  ): Record<string, unknown> {
    const filter: Record<string, unknown> = { userId };

    if (folderId === 'favorites') {
      filter.isFavorite = true;
    } else if (folderId && folderId !== 'root') {
      const folderIds = folderId.split(',').filter(Boolean);
      filter.folderId =
        folderIds.length > 1 ? { $in: folderIds } : folderIds[0];
    }

    if (q) {
      if (fields) {
        // Escape special regex characters to prevent ReDoS / regex injection
        const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const schemaFields = fields
          .split(',')
          .filter(Boolean)
          .map((f) => FIELD_ALIAS[f] ?? f)
          .filter((f) => SEARCHABLE_FIELDS.has(f));

        if (schemaFields.length > 0) {
          filter.$or = schemaFields.map((field) => ({
            [field]: { $regex: safeQ, $options: 'i' },
          }));
        }
      } else {
        // If no specific fields requested, use native MongoDB full-text search
        filter.$text = { $search: q };
      }
    }

    return filter;
  }
}
