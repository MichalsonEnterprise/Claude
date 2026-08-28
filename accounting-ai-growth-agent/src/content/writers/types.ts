export interface PlatformSlide {
  heading: string;
  bullets: string[];
}

export interface PlatformDraft {
  hook: string;
  body: string;
  hashtags: string[];
  slides?: PlatformSlide[]; // only for platforms that need media (IG/TikTok)
}

export type PlatformKey = 'linkedin' | 'linkedin-page' | 'x' | 'facebook' | 'instagram' | 'tiktok';
