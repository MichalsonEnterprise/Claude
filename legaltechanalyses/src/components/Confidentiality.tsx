import type { CSSProperties } from "react";
import { badges } from "@/content/site";
import { Icon } from "./icons";
import { Eyebrow } from "./ui";

function Medal({ icon }: { icon: "shield" | "lock" | "scale" }) {
  const rays = Array.from({ length: 72 }, (_, i) => {
    const a = (i * Math.PI * 2) / 72;
    return `M${(44 + Math.cos(a) * 30).toFixed(2)} ${(44 + Math.sin(a) * 30).toFixed(2)}L${(44 + Math.cos(a) * 42).toFixed(2)} ${(44 + Math.sin(a) * 42).toFixed(2)}`;
  }).join("");
  return (
    <div className="relative size-[88px]">
      <svg viewBox="0 0 88 88" className="absolute inset-0" aria-hidden="true">
        <circle cx="44" cy="44" r="43" fill="#7FA491" />
        <path d={rays} stroke="#3E7558" />
        <circle cx="44" cy="44" r="28" fill="#E8EEEB" stroke="#3E7558" strokeWidth="2" />
      </svg>
      <Icon name={icon} className="absolute top-1/2 left-1/2 size-[26px] -translate-x-1/2 -translate-y-1/2 text-brand-700" />
    </div>
  );
}

export function Confidentiality() {
  return (
    <section className="relative overflow-hidden bg-white pt-28 pb-24 lg:pt-[200px] lg:pb-40">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-60"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(255,255,255,0), #fff), repeating-linear-gradient(45deg, transparent 0 19px, rgba(210,223,216,.8) 19px 20px), repeating-linear-gradient(-45deg, transparent 0 19px, rgba(210,223,216,.8) 19px 20px)",
        }}
      />
      <div className="container-x relative">
        <div className="mx-auto flex max-w-[760px] flex-col items-center text-center" data-reveal>
          <Eyebrow className="text-brand-700">Confidentiality</Eyebrow>
          <h2 className="t-h2 mt-6">Enterprise-grade confidentiality</h2>
          <p className="mt-6 max-w-[480px] text-[16px] leading-[1.6] text-ink-2">
            Your whitepapers, cap tables and smart contracts never leave our encrypted, EU-hosted workspace. Access is
            logged, limited and independently audited.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-[1152px] gap-3 md:grid-cols-3 lg:mt-16">
          {badges.map((b, i) => (
            <div
              key={b.title}
              data-reveal
              style={{ ["--d" as string]: `${i * 120}ms` } as CSSProperties}
              className="bg-brand-400 p-3.5"
            >
              <div className="flex h-full min-h-[272px] flex-col items-center justify-center gap-3 border border-dashed border-brand-500 bg-brand-100 px-6 py-8 text-center">
                <Medal icon={b.icon} />
                <h3 className="mt-1 font-display text-[20px] font-medium text-ink">{b.title}</h3>
                <p className="max-w-[260px] text-[14px] leading-[1.6] text-ink-2">{b.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
