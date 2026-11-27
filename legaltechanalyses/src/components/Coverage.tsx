import type { CSSProperties } from "react";
import { jurisdictions } from "@/content/site";
import { Button, Coin, Eyebrow } from "./ui";

const W = 1440;
const H = 440;
const C = { x: 720, y: 720 };

function coinPos(R: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { left: `${((C.x + R * Math.sin(a)) / W) * 100}%`, top: `${((C.y - R * Math.cos(a)) / H) * 100}%` };
}

export function Coverage() {
  const coins = [
    ...jurisdictions.outer.map(([deg, code]) => ({ R: 660, deg, code })),
    ...jurisdictions.inner.map(([deg, code]) => ({ R: 470, deg, code })),
  ];
  return (
    <section id="jurisdictions" className="relative overflow-hidden bg-cream pt-24 lg:pt-40">
      <div className="container-x flex flex-col items-center text-center" data-reveal>
        <Eyebrow className="text-brand-700">Jurisdictions</Eyebrow>
        <h2 className="t-h2 mt-6 max-w-[980px]">Regulatory coverage across key crypto hubs</h2>
        <p className="mt-6 max-w-[640px] text-[16px] leading-[1.6] text-ink-2">
          From Warsaw to Vilnius, Malta to Dubai — we analyse where to licence, passport and scale your crypto business,
          with local counsel in every market.
        </p>
        <Button href="/#pricing" size="s" className="mt-9">
          Check your jurisdiction
        </Button>
      </div>
      <div className="relative mt-10 overflow-hidden md:mt-4">
        <div className="relative left-1/2 aspect-[1440/440] w-[max(100%,820px)] -translate-x-1/2">
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden="true">
            <defs>
              <linearGradient id="cov-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#F5F3EF" stopOpacity="0" />
                <stop offset="1" stopColor="#A8C2B5" />
              </linearGradient>
            </defs>
            <g fill="none" stroke="#7FA491" strokeOpacity=".8">
              <circle cx={C.x} cy={C.y} r="660" />
              <circle cx={C.x} cy={C.y} r="470" />
            </g>
            <rect x="0" y="180" width={W} height="260" fill="url(#cov-fade)" />
          </svg>
          <ul aria-label="Covered jurisdictions">
            {coins.map((c, i) => (
              <li
                key={c.code}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={coinPos(c.R, c.deg)}
              >
                <Coin code={c.code} className="anim-float" style={{ ["--d" as string]: `${(i % 4) * 500}ms`, animationDuration: "2.2s" } as CSSProperties} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
