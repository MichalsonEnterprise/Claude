/** AUTH-18 variants (server- and client-safe). */
export const RESTRICTED_VARIANTS = [
  'suspended',
  'under-review',
  'self-excluded',
  'region',
] as const;
export type RestrictedVariant = (typeof RESTRICTED_VARIANTS)[number];
