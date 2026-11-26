import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { getFrontendUrl } from '@core/config/app.config';
import { OAuthClient, OAuthGrant } from './schemas';
import {
  CODE_TTL_MS,
  CONNECTION_TTL_MS,
  REQUEST_TTL_MS,
  SCOPE,
  isAllowedRedirect,
  randomToken,
  redirectMatches,
  sha256,
  verifyPkce,
} from './rules';
import { OrganizeService } from './organize.service';

/** An error in the shape OAuth clients expect. */
export class OAuthError extends Error {
  constructor(
    readonly error: string,
    description: string,
    readonly status = 400,
  ) {
    super(description);
  }
}

/**
 * The smallest OAuth 2.1 server that Claude needs: public clients, the
 * authorization code flow with PKCE, and long-lived access tokens that the user
 * can revoke. A token identifies the account; it can read only while that user
 * has a session open. There are deliberately no refresh tokens.
 */
@Injectable()
export class OAuthService {
  /** Sign-in steps are logged without codes, tokens or email addresses. */
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly organize: OrganizeService,
    @InjectModel(OAuthClient.name)
    private readonly clients: Model<OAuthClient>,
    @InjectModel(OAuthGrant.name) private readonly grants: Model<OAuthGrant>,
  ) {}

  /** The public address Claude reaches the app at. */
  get issuer() {
    return (
      this.config.get<string>('PUBLIC_URL') || getFrontendUrl(this.config)
    ).replace(/\/+$/, '');
  }

  get resource() {
    return `${this.issuer}/mcp`;
  }

  private get extraRedirects() {
    return (this.config.get<string>('MCP_EXTRA_REDIRECTS') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  resourceMetadata() {
    return {
      resource: this.resource,
      authorization_servers: [this.issuer],
      scopes_supported: [SCOPE],
      bearer_methods_supported: ['header'],
    };
  }

  serverMetadata() {
    return {
      issuer: this.issuer,
      authorization_endpoint: `${this.issuer}/oauth/authorize`,
      token_endpoint: `${this.issuer}/oauth/token`,
      registration_endpoint: `${this.issuer}/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: [SCOPE],
      authorization_response_iss_parameter_supported: true,
    };
  }

  async register(body: Record<string, unknown>) {
    const uris = body?.redirect_uris;
    if (
      !Array.isArray(uris) ||
      uris.length === 0 ||
      uris.length > 10 ||
      !uris.every(
        (u) =>
          typeof u === 'string' && isAllowedRedirect(u, this.extraRedirects),
      )
    )
      throw new OAuthError(
        'invalid_redirect_uri',
        'Only Claude can connect to Bookmarker.',
      );
    const name =
      typeof body.client_name === 'string'
        ? body.client_name.slice(0, 100)
        : 'Claude';
    const client = await this.clients.create({
      clientId: randomUUID(),
      name,
      redirectUris: uris as string[],
    });
    this.logger.log(`Registered client ${client.clientId}`);
    return {
      client_id: client.clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: name,
      redirect_uris: uris,
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    };
  }

  /**
   * Validates an authorization request. Problems with the client or its address
   * are thrown (never redirected to); others are sent back to the client.
   */
  async startAuthorization(query: Record<string, string | undefined>) {
    const client = query.client_id
      ? await this.clients.findOne({ clientId: String(query.client_id) }).lean()
      : null;
    const redirectUri = String(query.redirect_uri ?? '');
    if (!client || !redirectMatches(client.redirectUris, redirectUri)) {
      this.logger.warn(
        `Sign-in refused: ${client ? 'return address not registered' : 'unknown client'}`,
      );
      throw new OAuthError(
        'invalid_request',
        'Unknown application or return address.',
      );
    }

    const fail = (error: string) => {
      this.logger.warn(
        `Sign-in refused for client ${client.clientId}: ${error}`,
      );
      return this.callback(redirectUri, { error, state: query.state });
    };
    if (query.response_type !== 'code')
      return fail('unsupported_response_type');
    if (query.code_challenge_method !== 'S256' || !query.code_challenge)
      return fail('invalid_request');
    if (query.resource && query.resource !== this.resource)
      return fail('invalid_target');

    const key = randomToken();
    await this.grants.create({
      key,
      kind: 'request',
      clientId: client.clientId,
      redirectUri,
      codeChallenge: String(query.code_challenge),
      state: query.state ? String(query.state) : undefined,
      expiresAt: new Date(Date.now() + REQUEST_TTL_MS),
    });
    this.logger.log(`Sign-in started by client ${client.clientId}`);
    const frontend = getFrontendUrl(this.config).replace(/\/+$/, '');
    return `${frontend}/connect?request=${key}`;
  }

  private callback(
    redirectUri: string,
    params: Record<string, string | undefined>,
  ) {
    const url = new URL(redirectUri);
    for (const [k, v] of Object.entries(params))
      if (v) url.searchParams.set(k, String(v));
    url.searchParams.set('iss', this.issuer);
    return url.toString();
  }

  private findRequest(key: string) {
    return this.grants
      .findOne({ key, kind: 'request', expiresAt: { $gt: new Date() } })
      .lean();
  }

  /** What the consent screen shows. */
  async describeRequest(userId: string, key: string) {
    const request = await this.findRequest(key);
    if (!request) return null;
    const client = await this.clients
      .findOne({ clientId: request.clientId })
      .lean();
    const session = await this.organize.openSession(userId);
    const host = new URL(request.redirectUri!).hostname;
    return {
      clientName: client?.name ?? 'Claude',
      returnsTo:
        host === 'localhost' || host === '127.0.0.1'
          ? 'an app on this computer'
          : host,
      session: session
        ? { includeNotes: session.includeNotes, expiresAt: session.expiresAt }
        : null,
    };
  }

  /** The user's answer. Returns where to send the browser. */
  async decide(userId: string, key: string, allow: boolean) {
    // Access needs a session the user started, so a link sent by someone else is useless.
    const session = allow ? await this.organize.openSession(userId) : null;
    if (allow && !session)
      throw new OAuthError(
        'access_denied',
        'Start a session in Settings first, then connect again.',
      );
    // Each request can be answered once.
    const request = await this.grants
      .findOneAndDelete({
        key,
        kind: 'request',
        expiresAt: { $gt: new Date() },
      })
      .lean();
    if (!request)
      throw new OAuthError(
        'invalid_request',
        'This request has expired. Connect again from Claude.',
      );
    this.logger.log(
      `Sign-in ${allow ? 'approved' : 'declined'} for client ${request.clientId}`,
    );
    if (!allow)
      return this.callback(request.redirectUri!, {
        error: 'access_denied',
        state: request.state,
      });

    const code = randomToken();
    await this.grants.create({
      key: sha256(code),
      kind: 'code',
      clientId: request.clientId,
      redirectUri: request.redirectUri,
      codeChallenge: request.codeChallenge,
      userId,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });
    return this.callback(request.redirectUri!, { code, state: request.state });
  }

  async exchange(body: Record<string, string | undefined>) {
    if (body.grant_type !== 'authorization_code')
      throw this.rejected(
        body.grant_type === 'refresh_token'
          ? 'invalid_grant'
          : 'unsupported_grant_type',
        `grant type ${String(body.grant_type).slice(0, 40)}`,
      );
    if (!body.code || !body.code_verifier || !body.client_id)
      throw this.rejected('invalid_grant', 'missing parameters');

    const key = sha256(String(body.code));
    // Marking it used in the same step means a code works once.
    const code = await this.grants
      .findOneAndUpdate(
        { key, kind: 'code', expiresAt: { $gt: new Date() } },
        { $set: { used: true } },
        { returnDocument: 'before' },
      )
      .lean();
    if (!code) throw this.rejected('invalid_grant', 'unknown or expired code');
    const owner = { userId: code.userId, clientId: code.clientId };
    if (code.used) {
      // A replayed code means it leaked: withdraw what it produced.
      await this.grants.deleteMany({ ...owner, kind: 'token' });
      throw this.rejected('invalid_grant', 'code used twice');
    }
    if (code.clientId !== body.client_id)
      throw this.rejected('invalid_grant', 'client mismatch');
    if (code.redirectUri !== body.redirect_uri)
      throw this.rejected('invalid_grant', 'return address mismatch');
    if (!verifyPkce(String(body.code_verifier), code.codeChallenge!))
      throw this.rejected('invalid_grant', 'PKCE verification failed');
    if (body.resource && body.resource !== this.resource)
      throw this.rejected('invalid_target', 'unknown resource');

    const token = randomToken();
    // Reconnecting the same client replaces its earlier sign-in.
    await this.grants.deleteMany({ ...owner, kind: 'token' });
    await this.grants.create({
      ...owner,
      key: sha256(token),
      kind: 'token',
      expiresAt: new Date(Date.now() + CONNECTION_TTL_MS),
    });
    this.logger.log(`Client ${code.clientId} connected`);
    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: Math.floor(CONNECTION_TTL_MS / 1000),
      scope: SCOPE,
    };
  }

  private rejected(error: string, why: string) {
    this.logger.warn(`Token request refused: ${why}`);
    return new OAuthError(error, 'The request could not be granted.');
  }

  /** Whose account an access token belongs to, if it is still good. */
  async ownerOfToken(token: string) {
    const grant = await this.grants
      .findOne({
        key: sha256(token),
        kind: 'token',
        expiresAt: { $gt: new Date() },
      })
      .lean();
    return grant ? { userId: grant.userId!, clientId: grant.clientId } : null;
  }
}
