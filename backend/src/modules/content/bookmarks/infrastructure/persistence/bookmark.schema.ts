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
// Dead-link sweep
BookmarkSchema.index({ lastCheckedAt: 1 });
