import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { PlatformSlide } from '../content/writers/types.js';

export type MediaFormat = 'instagram' | 'tiktok';

const DIMENSIONS: Record<MediaFormat, { width: number; height: number }> = {
  instagram: { width: 1080, height: 1350 },
  tiktok: { width: 1080, height: 1920 },
};

const BG_DARK = '#0B1220';
const TEXT_LIGHT = '#F5F7FA';
const ACCENT = '#3D8BFD';
const MUTED = '#9CA9BD';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Greedy word-wrap for SVG <text> lines (no text layout engine available). */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function slideSvg(
  width: number,
  height: number,
  slideIndex: number,
  totalSlides: number,
  slide: PlatformSlide,
): string {
  const padding = Math.round(width * 0.08);
  const headingLines = wrapText(slide.heading, 22);
  let y = Math.round(height * 0.22);
  const headingLineHeight = 64;

  const headingSvg = headingLines
    .map((line, i) => `<text x="${padding}" y="${y + i * headingLineHeight}" fill="${TEXT_LIGHT}" font-size="52" font-family="Arial, sans-serif" font-weight="700">${escapeXml(line)}</text>`)
    .join('\n');

  y += headingLines.length * headingLineHeight + 40;

  const bulletsSvg = slide.bullets
    .slice(0, 5)
    .map((bullet, bi) => {
      const bulletLines = wrapText(bullet, 34);
      const block = bulletLines
        .map((line, li) => `<text x="${padding + 40}" y="${y + li * 42}" fill="${MUTED}" font-size="32" font-family="Arial, sans-serif">${li === 0 ? '• ' : '   '}${escapeXml(line)}</text>`)
        .join('\n');
      y += bulletLines.length * 42 + 24;
      return block;
    })
    .join('\n');

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${BG_DARK}" />
  <rect x="0" y="0" width="${width}" height="10" fill="${ACCENT}" />
  <text x="${padding}" y="${Math.round(height * 0.1)}" fill="${ACCENT}" font-size="30" font-family="Arial, sans-serif" font-weight="700">ACCOUNTING AI</text>
  ${headingSvg}
  ${bulletsSvg}
  <text x="${padding}" y="${height - Math.round(height * 0.05)}" fill="${MUTED}" font-size="26" font-family="Arial, sans-serif">${slideIndex + 1} / ${totalSlides}</text>
</svg>`;
}

export interface GeneratedSlide {
  slideIndex: number;
  filePath: string;
  width: number;
  height: number;
}

/**
 * Renders 1-7 branded slides for Instagram/TikTok. Deliberately simple:
 * SVG text layout hand-computed, rendered to PNG via sharp. Ugly-but-legible
 * beats a half-finished generative pipeline (brief #15).
 */
export async function generateCards(
  slides: PlatformSlide[],
  format: MediaFormat,
  outDir: string,
  fileBaseName: string,
): Promise<GeneratedSlide[]> {
  if (slides.length === 0) throw new Error('generateCards requires at least 1 slide');
  const capped = slides.slice(0, 7);
  const { width, height } = DIMENSIONS[format];
  mkdirSync(outDir, { recursive: true });

  const results: GeneratedSlide[] = [];
  for (let i = 0; i < capped.length; i++) {
    const svg = slideSvg(width, height, i, capped.length, capped[i]);
    const filePath = join(outDir, `${fileBaseName}-slide-${i + 1}.png`);
    await sharp(Buffer.from(svg)).png().toFile(filePath);
    results.push({ slideIndex: i, filePath, width, height });
  }
  return results;
}
