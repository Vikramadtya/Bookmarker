import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'node:crypto';

export type BookmarkDocument = HydratedDocument<Bookmark>;

@Schema({ timestamps: true, _id: false })
export class Bookmark {
  @Prop({ type: String, default: randomUUID })
  _id: string;

  @Prop({ type: String, maxlength: 500 })
  title: string;

  @Prop({ type: String, maxlength: 200 })
  author: string;

  @Prop({ type: String, maxlength: 2048 })
  logoURL: string;

  @Prop({ type: String, maxlength: 2048 })
  imageURL: string;

  @Prop({ required: true, maxlength: 2048 })
  bookmarkURL: string;

  @Prop({ type: String, maxlength: 2000 })
  description: string;

  @Prop({ type: String })
  content: string;

  @Prop({ type: Boolean, default: false })
  isArticle: boolean;

  @Prop({ type: Boolean, default: false })
  isDeadLink: boolean;

  @Prop({ type: Date, default: null })
  lastCheckedAt: Date;

  @Prop({ type: String, enum: ['pending', 'done', 'failed'], default: 'done' })
  scrapeStatus: string;

  @Prop({
    type: String,
    enum: ['unread', 'reading', 'done', 'archived'],
    default: 'unread',
  })
  status: string;

  @Prop({ type: Boolean, default: false })
  pinned: boolean;

  @Prop({ type: Number, default: 0 })
  openCount: number;

  @Prop({ type: Date })
  lastOpenedAt: Date;

  @Prop({ type: Date, default: null })
  snoozedUntil: Date;

  /** "Revisit this on...": shows up in the Revisit view once the date passes. */
  @Prop({ type: Date, default: null })
  revisitAt: Date;

  @Prop({ type: String, maxlength: 2100 })
  normalizedUrl: string;

  @Prop({ type: String, maxlength: 255 })
  domain: string;

  @Prop({ type: Number })
  position: number;

  @Prop({ type: String, maxlength: 1000 })
  summary: string;

  @Prop({
    type: [
      {
        _id: false,
        id: { type: String, required: true },
        text: { type: String, required: true, maxlength: 1000 },
        note: { type: String, maxlength: 2000, default: '' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  highlights: Record<string, unknown>[];

  @Prop({ type: [String], default: [] })
  suggestedTags: string[];

  @Prop({ type: String, default: null })
  suggestedFolderId: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [String], default: [] })
  comments: string[];

  @Prop({ type: Boolean, default: false })
  isFavorite: boolean;

  @Prop({ type: String, required: true })
  folderId: string;

  @Prop({ type: String, required: true })
  userId: string;
}

export const BookmarkSchema = SchemaFactory.createForClass(Bookmark);

// Every list query is scoped by userId and sorted newest-first, so each index
// ends in createdAt to serve the sort without an in-memory step.
BookmarkSchema.index({ userId: 1, createdAt: -1, _id: -1 });
BookmarkSchema.index({ userId: 1, folderId: 1, createdAt: -1, _id: -1 });
BookmarkSchema.index({ userId: 1, isFavorite: 1, createdAt: -1, _id: -1 });
BookmarkSchema.index({ userId: 1, status: 1, createdAt: -1, _id: -1 });
BookmarkSchema.index({ userId: 1, domain: 1, _id: 1 });
BookmarkSchema.index({ userId: 1, lastOpenedAt: -1, _id: -1 });
BookmarkSchema.index({ userId: 1, position: 1, _id: 1 });
BookmarkSchema.index({ userId: 1, normalizedUrl: 1 });
BookmarkSchema.index({ userId: 1, revisitAt: 1 }, { sparse: true });
BookmarkSchema.index({ userId: 1, tags: 1 });
// Dead-link sweep
BookmarkSchema.index({ lastCheckedAt: 1 });
