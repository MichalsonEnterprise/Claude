import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { config } from '../config.js';
import { logger } from '../logger.js';

/**
 * Thin client for the Postiz public API (self-hosted or cloud), based on
 * the OpenAPI spec published in gitroomhq/postiz-docs (public-api/openapi.json,
 * verified 2026-08). All calls go through here — no other module talks to
 * Postiz directly (brief #25).
 *
 * Auth: `Authorization: <POSTIZ_API_KEY>` header (personal API key) or a
 * `pos_...` OAuth2 token, same header. Base path is `/public/v1` on the
 * instance's backend URL.
 */

export interface PostizIntegration {
  id: string;
  name: string;
  identifier: string; // e.g. "linkedin", "x", "facebook", "instagram", "tiktok"
  picture?: string;
  disabled: boolean;
}

export interface PostizUploadResult {
  id: string;
  name: string;
  path: string; // URL Postiz will use to reference this media in a post
}

export interface PostizPostValue {
  content: string;
  image?: { id: string }[];
}

export interface CreatePostInput {
  type: 'schedule' | 'draft' | 'now';
  date: string; // ISO-8601
  integrationId: string;
  value: PostizPostValue[];
  settings?: Record<string, unknown>;
  tags?: { value: string; label: string }[];
  shortLink?: boolean;
}

export interface CreatePostResult {
  postId: string;
  integration: string;
}

export interface PostizPostSummary {
  id: string;
  content: string;
  publishDate: string;
  releaseURL?: string;
  state: string;
  integration: { id: string; providerIdentifier: string; name: string };
}

export class PostizApiError extends Error {
  constructor(message: string, public status?: number, public body?: unknown) {
    super(message);
  }
}

export class PostizClient {
  private baseUrl: string;
  private apiKey: string;
  private mock: boolean;

  constructor(opts?: { baseUrl?: string; apiKey?: string; mock?: boolean }) {
    this.baseUrl = (opts?.baseUrl ?? config.postiz.baseUrl).replace(/\/$/, '');
    this.apiKey = opts?.apiKey ?? config.postiz.apiKey;
    // Force mock mode if no API key is configured, even if POSTIZ_MOCK=false
    // was set by mistake — we never want a silent, doomed real call.
    this.mock = (opts?.mock ?? config.postiz.mock) || !this.apiKey;
  }

  get isMock() {
    return this.mock;
  }

  private async request<T>(path: string, init: RequestInit, retries = 2): Promise<T> {
    if (this.mock) throw new Error('request() called while in mock mode — use the mock* methods instead');

    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`${this.baseUrl}${path}`, {
          ...init,
          headers: { Authorization: this.apiKey, ...(init.headers || {}) },
        });
        if (!res.ok) {
          const body = await res.text().catch(() => undefined);
          // Retry on transient server-side errors and rate limiting only.
          if ((res.status >= 500 || res.status === 429) && attempt < retries) {
            await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
            continue;
          }
          throw new PostizApiError(`Postiz API ${res.status} on ${path}`, res.status, body);
        }
        if (res.status === 204) return undefined as T;
        return (await res.json()) as T;
      } catch (err) {
        lastErr = err;
        if (err instanceof PostizApiError) throw err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
          continue;
        }
      }
    }
    throw new PostizApiError(`Postiz request failed after retries: ${(lastErr as Error)?.message}`, undefined, lastErr);
  }

  async listIntegrations(): Promise<PostizIntegration[]> {
    if (this.mock) return this.mockIntegrations();
    return this.request<PostizIntegration[]>('/integrations', { method: 'GET' });
  }

  async uploadMedia(filePath: string): Promise<PostizUploadResult> {
    if (this.mock) return this.mockUpload(filePath);
    const buf = readFileSync(filePath);
    const form = new FormData();
    form.append('file', new Blob([buf]), basename(filePath));
    return this.request<PostizUploadResult>('/upload', { method: 'POST', body: form });
  }

  async createPost(input: CreatePostInput): Promise<CreatePostResult[]> {
    if (this.mock) return this.mockCreatePost(input);
    const payload = {
      type: input.type,
      date: input.date,
      shortLink: input.shortLink ?? false,
      tags: input.tags ?? [],
      posts: [{ integration: { id: input.integrationId }, value: input.value, settings: input.settings ?? {} }],
    };
    return this.request<CreatePostResult[]>('/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async listPosts(startDate: string, endDate: string): Promise<PostizPostSummary[]> {
    if (this.mock) return [];
    const qs = new URLSearchParams({ startDate, endDate });
    const res = await this.request<{ posts: PostizPostSummary[] }>(`/posts?${qs.toString()}`, { method: 'GET' });
    return res.posts;
  }

  async getIntegrationSettings(integrationId: string): Promise<unknown> {
    if (this.mock) return { output: { rules: 'mock', maxLength: 3000, settings: {}, tools: [] } };
    return this.request(`/integration-settings/${integrationId}`, { method: 'GET' });
  }

  // --- mock implementations --------------------------------------------

  private mockIntegrations(): PostizIntegration[] {
    return (config.publishing.enabledPlatforms as string[]).map((p, i) => ({
      id: `mock-integration-${p}`,
      name: `Mock ${p}`,
      identifier: p,
      disabled: false,
    }));
  }

  private mockUpload(filePath: string): PostizUploadResult {
    const id = `mock-media-${basename(filePath)}-${Date.now()}`;
    logger.info('POSTIZ_MOCK upload', { filePath, id });
    return { id, name: basename(filePath), path: `https://mock.postiz.local/media/${id}` };
  }

  private mockCreatePost(input: CreatePostInput): CreatePostResult[] {
    const postId = `mock-post-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    logger.info('POSTIZ_MOCK WOULD_PUBLISH', { postId, payload: input });
    return [{ postId, integration: input.integrationId }];
  }
}
