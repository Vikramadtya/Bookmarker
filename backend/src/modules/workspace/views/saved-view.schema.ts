import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { randomUUID } from 'node:crypto';

/** A saved search that appears in the sidebar and stays current. */
@Schema({ timestamps: true, _id: false })
export class SavedView {
  @Prop({ type: String, default: randomUUID })
  _id: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true, maxlength: 60 })
  name: string;

  /** Search text plus operators, e.g. `is:unread is:article`. */
  @Prop({ type: String, default: '', maxlength: 500 })
  q: string;

  /** Optional folder scope (a folder id, or a comma list for a collection). */
  @Prop({ type: String, default: null, maxlength: 2000 })
  folderId: string;

  @Prop({ type: String, default: null })
  sort: string;

  @Prop({ type: String, default: '', maxlength: 8 })
  icon: string;
}

export const SavedViewSchema = SchemaFactory.createForClass(SavedView);
SavedViewSchema.index({ userId: 1, createdAt: 1 });
