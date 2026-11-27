import type { CSSProperties } from "react";
import { regulators, stats } from "@/content/site";
import { Button, Eyebrow } from "./ui";

/** Hexagon-masked grid of regulator tiles. Sizes are expressed in container units (cqw). */
function RegulationGrid() {
  const cols = 7;
  const rows = 7;
  const step = 90;
  const tile = 76;
  const grid = 560;
  const off = (grid - (cols * step - 14)) / 2;
  const active = new Set([10, 24, 31]);
  let k = 0;
  const tiles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const edge = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
      const [code, region] = regulators[k++ % regulators.length];
      const x = off + c * step + (r % 2 ? 22 : -22);
      const y = off + r * step;
      const tone = active.has(idx) ? "active" : edge ? "muted" : "default";
      tiles.push(
        <div
          key={idx}
          className={`absolute flex flex-col items-center justify-center rounded-[2.5cqw] border-[1.5px] shadow-[0_3px_6px_rgba(41,102,70,0.12),inset_0_1px_0_#fff] ${
            tone === "active"
              ? "border-brand-600 bg-brand-700 text-white"
              : tone === "muted"
                ? "border-brand-200 bg-white/55 text-brand-700/50"
                : "border-brand-200 bg-white text-brand-700"
          }`}
          style={{
            left: `${(x / grid) * 100}%`,
            top: `${(y / grid) * 100}%`,
            width: `${(tile / grid) * 100}%`,
            height: `${(tile / grid) * 100}%`,
          }}
        >
          <span className="text-[2.45cqw] leading-tight font-semibold">{code}</span>
          <span className={`font-mono text-[1.75cqw] ${tone === "active" ? "text-mint" : "text-ink-2"} ${tone === "muted" ? "opacity-50" : ""}`}>
            {region}
          </span>
        </div>,
      );
    }
  }
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[640px] [container-type:inline-size]" aria-hidden="true">
      <svg viewBox="0 0 640 640" className="absolute inset-0 size-full overflow-visible">
        <polygon points="350,-90 760,115 760,525 350,730 -60,525 -60,115" fill="#E7E5E4" fillOpacity=".35" stroke="#D2DFD8" />
        <polygon
          points="410,-40 760,135 760,485 410,660 60,485 60,135"
          fill="#F5F3EF"
          fillOpacity=".6"
          stroke="#D2DFD8"
          transform="rotate(-8 410 310)"
        />
      </svg>
      <div className="hex-clip absolute inset-[6.25%] bg-[linear-gradient(to_bottom,#E8EEEB,#A8C2B5)]">{tiles}</div>
    </div>
  );
}

export function Approach() {
  return (
    <section id="approach" className="relative overflow-hidden bg-cream pt-24 pb-16 lg:pt-[120px] lg:pb-24">
      <div className="container-x grid items-center gap-14 lg:grid-cols-[1fr_minmax(0,640px)] lg:gap-10">
        <div data-reveal className="max-w-[480px]">
          <Eyebrow className="text-brand-700">Our approach</Eyebrow>
          <h2 className="t-h3 mt-6">The fastest way to regulatory clarity for your web3 product</h2>
          <p className="mt-6 text-[16px] leading-[1.6] text-ink-2">
            Send us your whitepaper, smart contracts and business model. Our lawyers map every obligation under MiCA,
            AMLR and DORA — and tell you exactly what you need to launch, list or raise.
          </p>
          <Button href="/#pricing" className="mt-10">
            Get started
          </Button>
        </div>
        <div data-reveal style={{ ["--d" as string]: "150ms" } as CSSProperties}>
          <RegulationGrid />
        </div>
      </div>
    </section>
  );
}

export function Stats() {
  return (
    <div className="bg-[linear-gradient(to_bottom,rgba(190,208,199,0),#A8C2B5)]">
      <dl className="mx-auto grid max-w-[1440px] grid-cols-2 gap-x-6 gap-y-10 px-6 pt-6 pb-16 md:px-10 lg:grid-cols-4 lg:px-[112px] lg:pb-[72px]">
        {stats.map((s, i) => (
          <div key={s.label} data-reveal className="flex gap-2.5" style={{ ["--d" as string]: `${i * 90}ms` } as CSSProperties}>
            <svg viewBox="0 0 12 20" className="mt-1 h-[17px] w-[10px] shrink-0 fill-brand-500" aria-hidden="true">
              <path d="M6 0l6 10-6 10-6-10z" />
            </svg>
            <div>
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-[26px] leading-[1.2] font-bold tracking-[-0.01em] text-ink md:text-[30px]">{s.value}</dd>
              <dd className="mt-1 text-[14px] text-ink-2">{s.label}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
