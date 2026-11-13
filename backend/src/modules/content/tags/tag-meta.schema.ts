import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** Per-user display settings for a tag (just a color for now). */
@Schema({ timestamps: true })
export class TagMeta {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true, maxlength: 200 })
  tag: string;

  @Prop({ type: String, required: true })
  color: string;
}

export const TagMetaSchema = SchemaFactory.createForClass(TagMeta);
TagMetaSchema.index({ userId: 1, tag: 1 }, { unique: true });
