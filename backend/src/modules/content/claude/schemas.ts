import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes } from 'mongoose';
import { randomUUID } from 'node:crypto';

/** One run: Claude may read and propose while it is open; the user reviews afterwards. */
@Schema({ timestamps: true, collection: 'claude_sessions' })
export class OrganizeSession {
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  userId: string;

  /** open: Claude may connect · review: access ended, proposals await · done */
  @Prop({ type: String, enum: ['open', 'review', 'done'], default: 'open' })
  status: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Boolean, default: false })
  includeNotes: boolean;

  @Prop({ type: Date, default: null })
  connectedAt: Date;

  @Prop({ type: [String], default: [] })
  structure: string[];

  @Prop({ type: String, default: '', maxlength: 2000 })
  summary: string;
}
export const OrganizeSessionSchema =
  SchemaFactory.createForClass(OrganizeSession);

/** A suggested change to one bookmark. Nothing changes until the user applies it. */
@Schema({ timestamps: true, collection: 'claude_proposals' })
export class Proposal {
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  @Prop({ type: String, required: true })
  sessionId: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  bookmarkId: string;

  @Prop({ type: SchemaTypes.Mixed, default: undefined })
  tags?: string[];

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String })
  folderPath?: string;

  @Prop({ type: String, default: '', maxlength: 300 })
  reason: string;

  @Prop({
    type: String,
    enum: ['pending', 'applied', 'rejected'],
    default: 'pending',
  })
  status: string;

  /** The values replaced when applied, for undo. */
  @Prop({ type: SchemaTypes.Mixed, default: null })
  before: { tags: string[]; description: string; folderId: string } | null;
}
export const ProposalSchema = SchemaFactory.createForClass(Proposal);
ProposalSchema.index({ sessionId: 1, bookmarkId: 1 }, { unique: true });

/** A program that registered to ask for access (OAuth dynamic registration). */
@Schema({ timestamps: true, collection: 'oauth_clients' })
export class OAuthClient {
  @Prop({ type: String, required: true, unique: true })
  clientId: string;

  @Prop({ type: String, default: 'Claude', maxlength: 100 })
  name: string;

  @Prop({ type: [String], required: true })
  redirectUris: string[];
}
export const OAuthClientSchema = SchemaFactory.createForClass(OAuthClient);

/**
 * Short-lived OAuth records. `kind`:
 *   request  an authorization request waiting for the user's decision
 *   code     a single-use code, exchanged for a token
 *   token    an access token
 * MongoDB removes each one when it expires.
 */
@Schema({ timestamps: true, collection: 'oauth_grants' })
export class OAuthGrant {
  /** request id, or the SHA-256 of the code or token */
  @Prop({ type: String, required: true, unique: true })
  key: string;

  @Prop({ type: String, enum: ['request', 'code', 'token'], required: true })
  kind: string;

  @Prop({ type: String, required: true })
  clientId: string;

  @Prop({ type: String })
  redirectUri?: string;

  @Prop({ type: String })
  codeChallenge?: string;

  @Prop({ type: String })
  state?: string;

  @Prop({ type: String, index: true })
  sessionId?: string;

  @Prop({ type: String })
  userId?: string;

  /** a code that has been exchanged */
  @Prop({ type: Boolean, default: false })
  used: boolean;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}
export const OAuthGrantSchema = SchemaFactory.createForClass(OAuthGrant);
OAuthGrantSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
