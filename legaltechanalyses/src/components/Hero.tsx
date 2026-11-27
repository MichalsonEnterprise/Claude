import type { CSSProperties } from "react";
import { clients, type ClientLogo } from "@/content/site";
import { Button, Chip } from "./ui";

const d = (ms: number) => ({ ["--d" as string]: `${ms}ms` }) as CSSProperties;

function HeroIllustration() {
  const node = (cx: number, cy: number, delay: number, pulseDelay: number) => (
    <g className="anim-pop" style={d(delay)}>
      <circle cx={cx} cy={cy} r="18" fill="#BED0C7" fillOpacity=".35" stroke="#A8C2B5" className="anim-pulse" style={d(pulseDelay)} />
      <circle cx={cx} cy={cy} r="10" fill="#F5F3EF" stroke="#296646" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r="4" fill="#296646" />
    </g>
  );
  return (
    <div className="relative aspect-square w-full">
      <svg viewBox="0 0 600 600" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        <defs>
          <radialGradient id="hero-glow">
            <stop offset="0" stopColor="#BED0C7" stopOpacity=".95" />
            <stop offset=".55" stopColor="#D2DFD8" stopOpacity=".55" />
            <stop offset="1" stopColor="#F5F3EF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="anim-fade-in" style={d(0)}>
          <circle cx="300" cy="300" r="260" fill="url(#hero-glow)" className="anim-breathe" />
        </g>
        <g className="anim-scale-in" style={d(100)} fill="none">
          <circle cx="300" cy="300" r="276" stroke="#3E7558" strokeOpacity=".55" />
          <path d="M300 100L473 200V400L300 500L127 400V200Z" stroke="#7FA491" strokeOpacity=".7" />
          <path d="M127 200L300 300L473 200M300 300V500" stroke="#7FA491" strokeOpacity=".7" />
          <path d="M300 170L412 235V365L300 430L188 365V235Z" stroke="#A8C2B5" strokeOpacity=".8" />
          <path
            d="M127 200L40 150M473 200L560 150M127 400L48 446M473 400L552 446M300 100V24M300 500V576M188 235L127 200M412 235L473 200M300 430V500"
            stroke="#A8C2B5"
            strokeOpacity=".7"
          />
        </g>
        <path
          d="M440 170L320 239V420L236 468"
          pathLength={1}
          fill="none"
          stroke="#296646"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="anim-draw"
          style={d(900)}
        />
        <path
          d="M392 266V448L352 471"
          pathLength={1}
          fill="none"
          stroke="#3E7558"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="anim-draw"
          style={{ ...d(1600), animationDuration: "0.9s" }}
        />
        {[[210, 150], [473, 238], [392, 266]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#3E7558" className="anim-fade-in" style={d(600)} />
        ))}
        {node(440, 170, 800, 2600)}
        {node(320, 420, 1700, 3200)}
        {node(236, 468, 2050, 3800)}
      </svg>
      <span className="anim-fade-up absolute" style={{ left: "47%", top: "25.3%", ...d(1050) }}>
        <Chip glyph="§" label="MiCA · Art. 59" className="anim-float" />
      </span>
      <span className="anim-fade-up absolute" style={{ left: "10%", top: "66.7%", ...d(2150) }}>
        <Chip glyph="T" label="Utility token" className="anim-float" style={d(1300)} />
      </span>
      <span className="anim-fade-up absolute hidden sm:block" style={{ left: "22%", top: "86.7%", ...d(1850) }}>
        <Chip glyph="A" label="AMLR / TFR" className="anim-float opacity-55" style={d(600)} />
      </span>
    </div>
  );
}

function LogoMark({ mark }: { mark?: ClientLogo["mark"] }) {
  if (!mark) return null;
  if (mark === "bars")
    return (
      <span className="flex gap-[3px]" aria-hidden="true">
        <span className="h-4 w-1 bg-current" />
        <span className="h-4 w-1 bg-current" />
      </span>
    );
  const shapes = {
    tri: <path d="M8 1L15 14H1z" />,
    hex: <path d="M8 0l7 4v8l-7 4-7-4V4z" />,
    circle: <circle cx="8" cy="8" r="7" />,
    dot: <circle cx="8" cy="8" r="4" />,
  } as const;
  return (
    <svg viewBox="0 0 16 16" className="size-3.5 fill-current" aria-hidden="true">
      {shapes[mark]}
    </svg>
  );
}

export function LogoMarquee() {
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center gap-16 pr-16" aria-hidden={hidden || undefined}>
      {clients.map((c) => (
        <li key={c.name} className="flex items-center gap-2 whitespace-nowrap text-ink/80">
          <LogoMark mark={c.mark} />
          <span className={c.style}>{c.name}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-12">
      <p className="shrink-0 text-[12px] font-medium tracking-[0.08em] text-ink/75 uppercase">
        Trusted by web3 teams across Europe
      </p>
      <div className="fade-x relative min-w-0 flex-1 overflow-hidden py-2">
        <div className="anim-marquee flex w-max">
          {row(false)}
          {row(true)}
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  const words = "Legal Clarity for Digital Assets".split(" ");
  return (
    <section className="relative overflow-hidden bg-cream">
      <div className="container-x relative flex flex-col pt-[112px] pb-8 md:pt-[150px] lg:min-h-[936px] lg:pt-[236px] lg:pb-[30px]">
        <div className="relative z-10 max-w-[560px] lg:max-w-[460px] xl:max-w-[560px]">
          <h1 className="t-display text-ink">
            {words.map((w, i) => (
              <span key={i}>
                <span className="anim-word" style={{ ["--i" as string]: i }}>
                  {w}
                </span>
                {i < words.length - 1 ? " " : ""}
              </span>
            ))}
          </h1>
          <p className="anim-fade-up mt-7 max-w-[440px] text-[17px] leading-[1.6] text-ink/85 md:text-[18px]" style={d(600)}>
            Regulatory analyses and legal opinions for crypto-asset service providers, web3 apps and token issuers —
            MiCA-ready.
          </p>
          <div className="anim-fade-up mt-10 flex flex-wrap items-center gap-4" style={d(850)}>
            <Button href="/#pricing">Request an analysis</Button>
            <span className="text-[13px] text-ink-2">From €500 · delivered in 72h</span>
          </div>
        </div>
        <div className="mx-auto mt-12 w-full max-w-[460px] lg:absolute lg:top-[150px] lg:right-10 lg:mt-0 lg:w-[min(46vw,520px)] lg:max-w-none xl:top-[140px] xl:right-20 xl:w-[600px]">
          <HeroIllustration />
        </div>
        <div className="mt-14 lg:mt-auto">
          <LogoMarquee />
        </div>
      </div>
    </section>
  );
}
