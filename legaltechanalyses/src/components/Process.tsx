import type { CSSProperties } from "react";
import { steps } from "@/content/site";
import { PACKAGE_LIST, formatEur } from "@/lib/packages";
import { Icon, type IconName } from "./icons";
import { Button, Eyebrow } from "./ui";

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

function DiagramNode({ label, icon, x }: { label: string; icon: IconName; x: number }) {
  return (
    <div
      className="absolute flex flex-col items-center justify-center gap-2.5 rounded-[4px] border border-brand-400 bg-white/85 shadow-[0_6px_16px_rgba(41,102,70,0.10)]"
      style={{ left: pct(x, 898), top: pct(40, 520), width: pct(200, 898), height: pct(92, 520) }}
    >
      <span className="text-[11px] font-medium tracking-[0.12em] text-brand-700 uppercase">{label}</span>
      <Icon name={icon} className="size-6 text-brand-700" />
    </div>
  );
}

function Diagram() {
  const outs = PACKAGE_LIST.map((p, i) => ({ label: `${p.name} · ${formatEur(p.priceEur)}`, cx: [249, 449, 649][i] }));
  return (
    <div className="mx-auto hidden max-w-[930px] border border-brand-200 bg-white p-4 md:block" data-reveal>
      <div
        className="relative aspect-[898/520] overflow-hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0 29px, rgba(255,255,255,.18) 29px 30px, transparent 30px 60px), linear-gradient(to bottom, #E8EEEB, #5E8F74)",
        }}
      >
        <svg viewBox="0 0 898 520" className="absolute inset-0 size-full" aria-hidden="true" data-reveal="draw">
          <path
            d="M324 132V192H449M574 132V192H449M449 192V226M449 318V346M249 346H649M249 346V380M449 346V380M649 346V380"
            fill="none"
            stroke="#fff"
            strokeOpacity=".95"
            strokeWidth="2"
            strokeLinejoin="round"
            pathLength={1}
            className="draw-path"
          />
        </svg>
        <DiagramNode label="Your product" icon="doc" x={224} />
        <DiagramNode label="Your team" icon="user" x={474} />
        <div
          className="anim-float absolute grid place-items-center"
          style={{ left: pct(403, 898), top: pct(222, 520), width: pct(92, 898), height: pct(100, 520), animationDuration: "3s" }}
        >
          <svg viewBox="0 0 28 30" className="size-full drop-shadow-[0_10px_24px_rgba(9,27,21,0.25)]" aria-hidden="true">
            <path d="M14 1.5l12 6.9v13.8L14 29.1 2 22.2V8.4z" fill="#193E2A" />
            <path d="M14 8.6l6 3.45v6.9L14 22.4l-6-3.45v-6.9z" fill="none" stroke="#90EBBC" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M14 8.6v13.8M8 12.05l12 6.9" stroke="#90EBBC" strokeWidth="1.4" />
          </svg>
        </div>
        {outs.map((o) => (
          <div
            key={o.label}
            className="absolute flex -translate-x-1/2 flex-col items-center gap-3"
            style={{ left: pct(o.cx, 898), top: pct(380, 520) }}
          >
            <span className="flex items-center gap-2 whitespace-nowrap rounded-[4px] border border-brand-300 bg-white/92 px-3 py-2.5 text-[12px] font-semibold text-ink shadow-[0_4px_10px_rgba(9,27,21,0.12)] lg:text-[14px]">
              <Icon name="check" className="size-3.5 text-brand-700" />
              {o.label}
            </span>
            <span className="h-10 w-full rounded-[4px] bg-[linear-gradient(to_bottom,rgba(255,255,255,.45),rgba(255,255,255,0))]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Process() {
  return (
    <section id="how-it-works" className="bg-white py-24 lg:pt-40 lg:pb-36">
      <div className="container-x">
        <div className="mx-auto flex max-w-[900px] flex-col items-center text-center">
          <Eyebrow className="text-brand-700">How it works</Eyebrow>
          <h2 className="t-h2 mt-6" data-reveal="ink">
            From order to signed legal opinion in 72 hours
          </h2>
          <p className="mt-6 max-w-[540px] text-[16px] leading-[1.6] text-ink-2">
            Pick a package, pay in crypto and tell us where to send it. Our lawyers turn your project into an analysis,
            a signed opinion — or both.
          </p>
        </div>
        <div className="mt-14 md:mt-16">
          <Diagram />
        </div>
        <ol className="mx-auto mt-10 grid max-w-[930px] gap-4 md:mt-12 md:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.n}
              data-reveal
              style={{ ["--d" as string]: `${i * 120}ms` } as CSSProperties}
              className="rounded-[4px] border border-brand-200 bg-brand-100/60 p-6"
            >
              <span className="font-mono text-[12px] text-brand-700">{s.n}</span>
              <h3 className="mt-3 font-display text-[20px] font-medium text-ink">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-ink-2">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-12 flex justify-center">
          <Button href="/checkout" size="s">
            Start your order
          </Button>
        </div>
      </div>
    </section>
  );
}
