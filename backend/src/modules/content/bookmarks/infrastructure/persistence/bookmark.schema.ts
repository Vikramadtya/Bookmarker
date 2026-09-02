import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type BookmarkDocument = HydratedDocument<Bookmark>;

@Schema({ timestamps: true, _id: false })
export class Bookmark {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop()
  title: string;

  @Prop()
  author: string;

  @Prop()
  logoURL: string;

  @Prop({ required: true })
  bookmarkURL: string;

  @Prop()
  description: string;

  @Prop()
  content: string;

  @Prop({ type: Boolean, default: false })
  isArticle: boolean;

  @Prop({ type: Boolean, default: false })
  isDeadLink: boolean;

  @Prop({ type: Date, default: null })
  lastCheckedAt: Date;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [String], default: [] })
  comments: string[];

  @Prop({ type: Boolean, default: false })
  isFavorite: boolean;

  @Prop({ type: String, required: true })
  folderId: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;
}

export const BookmarkSchema = SchemaFactory.createForClass(Bookmark);

// Compound indexes for common query patterns
BookmarkSchema.index({ userId: 1, folderId: 1 });
BookmarkSchema.index({ userId: 1, isFavorite: 1 });
BookmarkSchema.index({ userId: 1, createdAt: -1 });

// Full-text search index
BookmarkSchema.index({ title: 'text', description: 'text', content: 'text' });

BookmarkSchema.virtual('id').get(function (this: BookmarkDocument) {
  return this._id;
});
BookmarkSchema.virtual('creationDate').get(function (this: any) {
  return this.createdAt;
});
BookmarkSchema.virtual('updateDate').get(function (this: any) {
  return this.updatedAt;
});

BookmarkSchema.set('toJSON', { virtuals: true });
BookmarkSchema.set('toObject', { virtuals: true });
