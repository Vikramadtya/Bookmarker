import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'node:crypto';

export type FolderDocument = HydratedDocument<Folder>;

@Schema({ timestamps: true, _id: false })
export class Folder {
  @Prop({ type: String, default: randomUUID })
  _id: string;

  @Prop({ type: String, required: true, maxlength: 100 })
  name: string;

  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: String, default: null })
  parentId: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: Boolean, default: false })
  isPublic: boolean;

  @Prop({ type: Boolean, default: false })
  isHidden: boolean;

  @Prop({ type: Boolean, default: false })
  isLocked: boolean;

  @Prop({ type: Boolean, default: false })
  isInbox: boolean;

  @Prop({ type: String, default: null })
  passwordHash: string;
}

export const FolderSchema = SchemaFactory.createForClass(Folder);

FolderSchema.index({ userId: 1, parentId: 1 });
// Concurrent requests cannot create duplicate slugs or a second Inbox.
FolderSchema.index(
  { userId: 1, slug: 1 },
  { unique: true, partialFilterExpression: { slug: { $type: 'string' } } },
);
FolderSchema.index(
  { userId: 1 },
  {
    unique: true,
    name: 'one_inbox_per_user',
    partialFilterExpression: { isInbox: true },
  },
);
