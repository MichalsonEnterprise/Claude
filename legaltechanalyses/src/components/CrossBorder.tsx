import type { CSSProperties } from "react";
import { corridors } from "@/content/site";
import { Button, Coin, Eyebrow } from "./ui";

const W = 1440;
const H = 560;
const G = { x: 720, y: 620, r: 320 };
const hub = { x: G.x, y: G.y - G.r };

export function CrossBorder() {
  const lat = [-240, -170, -95, 0]
    .map((dy) => {
      const hw = Math.sqrt(G.r * G.r - dy * dy);
      return `M${G.x - hw} ${G.y + dy}A${hw} ${Math.max(10, hw * 0.12)} 0 0 0 ${G.x + hw} ${G.y + dy}`;
    })
    .join("");
  const lon =
    [0.25, 0.55, 0.85]
      .map((k) => {
        const rx = G.r * k;
        return `M${G.x} ${G.y - G.r}A${rx} ${G.r} 0 0 0 ${G.x} ${G.y + G.r}M${G.x} ${G.y - G.r}A${rx} ${G.r} 0 0 1 ${G.x} ${G.y + G.r}`;
      })
      .join("") + `M${G.x} ${G.y - G.r}V${G.y + G.r}`;
  const order = [2, 3, 1, 4, 0, 5];

  return (
    <section
      id="cross-border"
      className="relative overflow-hidden text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(to bottom, #296646, #7FA491 55%, #D2DFD8 85%, #F5F3EF)",
        backgroundSize: "192px 192px, 192px 192px, 100% 100%",
        backgroundPosition: "0 96px, 40px 0, 0 0",
      }}
    >
      <div className="container-x flex flex-col items-center pt-24 text-center lg:pt-40" data-reveal>
        <Eyebrow className="text-white/90">Cross-border &amp; multi-chain</Eyebrow>
        <h2 className="t-h2 mt-6 max-w-[640px]">Launch in new markets without legal surprises</h2>
        <p className="mt-6 max-w-[520px] text-[16px] leading-[1.6] text-white/88">
          Passporting, reverse solicitation, the travel rule, stablecoin limits — we check every chain, token and
          corridor so you can scale across the EU and beyond.
        </p>
        <Button href="/#pricing" variant="light" size="s" className="mt-9">
          Get started
        </Button>
      </div>
      <div className="relative mt-6 overflow-hidden">
        <div className="relative left-1/2 aspect-[1440/560] w-[max(100%,820px)] -translate-x-1/2" data-reveal="draw">
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden="true">
            <defs>
              <radialGradient id="sphere">
                <stop offset="0" stopColor="#fff" stopOpacity=".55" />
                <stop offset="1" stopColor="#fff" stopOpacity=".15" />
              </radialGradient>
            </defs>
            <circle cx={G.x} cy={G.y} r={G.r} fill="url(#sphere)" stroke="#fff" strokeOpacity=".6" />
            <path d={lat + lon} fill="none" stroke="#fff" strokeOpacity=".5" />
            {corridors.map(([x, y], i) => {
              const mx = (hub.x + x) / 2;
              const my = Math.min(hub.y, y) - 110;
              return (
                <path
                  key={i}
                  d={`M${hub.x} ${hub.y}Q${mx} ${my} ${x} ${y}`}
                  fill="none"
                  stroke="#3E7558"
                  strokeOpacity=".75"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  pathLength={1}
                  className="draw-path"
                  style={{ ["--d" as string]: `${order.indexOf(i) * 250}ms` } as CSSProperties}
                />
              );
            })}
            <circle cx={hub.x} cy={hub.y} r="6" fill="#296646" stroke="#fff" strokeWidth="2" />
            {[[380, 120], [540, 40], [900, 40], [1060, 120], [240, 200], [1200, 200]].map(([x, y]) => (
              <circle key={`${x}${y}`} cx={x} cy={y} r="2.5" fill="#fff" fillOpacity=".8" />
            ))}
          </svg>
          <ul aria-label="Cross-border corridors">
            {corridors.map(([x, y, code], i) => (
              <li
                key={code}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
              >
                <Coin code={code} className="anim-float" style={{ ["--d" as string]: `${i * 350}ms`, animationDuration: "2.4s" } as CSSProperties} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
