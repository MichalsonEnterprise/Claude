import 'dotenv/config';

function envBool(name: string, fallback: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  return v.toLowerCase() === 'true' || v === '1';
}

function envInt(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export type AutopilotMode = 'OFF' | 'DRAFT' | 'FULL_AUTO';

export const config = {
  port: envInt('PORT', 8090),
  timezone: process.env.TIMEZONE || 'Europe/Warsaw',
  nodeEnv: process.env.NODE_ENV || 'development',

  autopilotMode: (process.env.AUTOPILOT_MODE as AutopilotMode) || 'DRAFT',
  dryRun: envBool('DRY_RUN', true),

  ai: {
    provider: (process.env.AI_PROVIDER as 'anthropic' | 'openai' | 'mock') || 'mock',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    researchModel: process.env.AI_RESEARCH_MODEL || '',
    writerModel: process.env.AI_WRITER_MODEL || '',
    verifierModel: process.env.AI_VERIFIER_MODEL || '',
  },

  postiz: {
    baseUrl: process.env.POSTIZ_BASE_URL || 'http://localhost:4007/public/v1',
    apiKey: process.env.POSTIZ_API_KEY || '',
    mock: envBool('POSTIZ_MOCK', true),
  },

  research: {
    intervalHours: envInt('RESEARCH_INTERVAL_HOURS', 4),
    topicMinScore: envInt('TOPIC_MIN_SCORE', 65),
    duplicateWindowDays: envInt('DUPLICATE_WINDOW_DAYS', 60),
  },

  publishing: {
    postsPerWeek: {
      linkedin: envInt('POSTS_PER_WEEK_LINKEDIN', 5),
      x: envInt('POSTS_PER_WEEK_X', 7),
      facebook: envInt('POSTS_PER_WEEK_FACEBOOK', 4),
      instagram: envInt('POSTS_PER_WEEK_INSTAGRAM', 4),
      tiktok: envInt('POSTS_PER_WEEK_TIKTOK', 3),
    },
    enabledPlatforms: (process.env.ENABLED_PLATFORMS || 'linkedin,linkedin-page,x,facebook,instagram,tiktok')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    hourStart: envInt('PUBLISHING_HOUR_START', 8),
    hourEnd: envInt('PUBLISHING_HOUR_END', 18),
  },

  mix: {
    education: envInt('MIX_EDUCATION', 30),
    news: envInt('MIX_NEWS', 25),
    product: envInt('MIX_PRODUCT', 20),
    problems: envInt('MIX_PROBLEMS', 10),
    caseStudy: envInt('MIX_CASE_STUDY', 10),
    directMarketing: envInt('MIX_DIRECT_MARKETING', 5),
  },

  panelToken: process.env.PANEL_TOKEN || '',
};

export function assertValidConfig() {
  const validModes: AutopilotMode[] = ['OFF', 'DRAFT', 'FULL_AUTO'];
  if (!validModes.includes(config.autopilotMode)) {
    throw new Error(`Invalid AUTOPILOT_MODE: ${config.autopilotMode}`);
  }
  const validProviders = ['anthropic', 'openai', 'mock'];
  if (!validProviders.includes(config.ai.provider)) {
    throw new Error(`Invalid AI_PROVIDER: ${config.ai.provider}`);
  }
}
