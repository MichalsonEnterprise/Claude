import { isPackageId, type PackageId } from "./packages";

export type CheckoutInput = {
  packageId: PackageId;
  email: string;
  project: string;
};

export type ParseResult =
  | { ok: true; data: CheckoutInput }
  | { ok: false; error: string; field?: "packageId" | "email" | "project" | "consent" };

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"|]+@[^\s@<>()[\]\\,;:"|]+\.[a-z]{2,}$/i;

export function isValidEmail(value: string): boolean {
  return value.length >= 6 && value.length <= 254 && EMAIL_RE.test(value);
}

/** Removes control characters and the "|" separator used in order descriptions. */
export function cleanText(value: string, max: number): string {
  return value
    .replace(/[\u0000-\u001f\u007f|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function parseCheckoutInput(body: unknown): ParseResult {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request." };
  const b = body as Record<string, unknown>;

  // Honeypot: real users never see or fill this field.
  if (typeof b.website === "string" && b.website.trim() !== "") {
    return { ok: false, error: "Invalid request." };
  }
  if (!isPackageId(b.packageId)) {
    return { ok: false, error: "Please choose a package.", field: "packageId" };
  }
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!isValidEmail(email)) {
    return { ok: false, error: "Please enter a valid email address.", field: "email" };
  }
  const project = typeof b.project === "string" ? cleanText(b.project, 120) : "";
  if (b.consent !== true) {
    return { ok: false, error: "Please confirm your email address and consent.", field: "consent" };
  }
  return { ok: true, data: { packageId: b.packageId, email, project } };
}
