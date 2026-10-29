import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, default: uuidv4 })
  _id: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  email: string;

  @Prop({ type: String, required: true, unique: true, index: true })
  username: string;

  @Prop({ type: String })
  name?: string;

  @Prop({ type: String })
  picture?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Ensure virtuals are serialized
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret: any) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});
