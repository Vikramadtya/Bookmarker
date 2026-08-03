import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type FolderDocument = HydratedDocument<Folder>;

@Schema({ timestamps: true, _id: false })
export class Folder {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, default: null })
  parentId: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;
}

export const FolderSchema = SchemaFactory.createForClass(Folder);

// Compound index for hierarchy queries (get all folders of a user, filter by parentId)
FolderSchema.index({ userId: 1, parentId: 1 });

FolderSchema.virtual('id').get(function (this: FolderDocument) {
  return this._id;
});

FolderSchema.set('toJSON', { virtuals: true });
FolderSchema.set('toObject', { virtuals: true });
