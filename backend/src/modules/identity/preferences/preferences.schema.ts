import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** Per-user settings that are not part of the profile. Keyed by the user's email. */
@Schema({ timestamps: true })
export class Preferences {
  @Prop({ type: String, required: true, unique: true })
  userId: string;

  /** Secret in the personal inbound-email webhook URL. */
  @Prop({ type: String, index: { unique: true, sparse: true } })
  captureToken?: string;

  @Prop({ type: Boolean, default: false })
  digestEmail: boolean;
}

export const PreferencesSchema = SchemaFactory.createForClass(Preferences);
