import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'node:crypto';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, default: randomUUID })
  _id: string;

  @Prop({ type: String, required: true, unique: true })
  email: string;

  @Prop({ type: String, required: true, unique: true })
  username: string;

  @Prop({ type: String })
  name?: string;

  @Prop({ type: String })
  picture?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
