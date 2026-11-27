import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Icon, LogoMark } from "./icons";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "light";
  size?: "l" | "s";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  fullWidth?: boolean;
  style?: CSSProperties;
};

/** Meld-style CTA: label + square arrow box that nudges on hover. */
export function Button({
  children,
  href,
  variant = "primary",
  size = "l",
  className = "",
  type = "button",
  disabled,
  fullWidth,
  style,
}: ButtonProps) {
  const L = size === "l";
  const base =
    "group inline-flex items-center rounded-[4px] border font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60";
  const sizing = L ? "gap-5 py-1 pr-1 pl-5 text-[16px]" : "gap-3.5 py-1 pr-1 pl-3.5 text-[14px]";
  const tone =
    variant === "primary"
      ? "border-brand-600 bg-brand-700 text-white hover:bg-brand-800"
      : "border-brand-950/6 bg-stone text-ink hover:bg-white";
  const box = L ? "size-10" : "size-7";
  const boxTone =
    variant === "primary" ? "bg-white/18 group-hover:bg-white/28" : "bg-brand-950/8 group-hover:bg-brand-950/14";
  const width = fullWidth ? "w-full justify-between" : "";
  const content = (
    <>
      <span className="leading-none">{children}</span>
      <span className={`grid shrink-0 place-items-center rounded-[2px] transition-colors ${box} ${boxTone}`}>
        <Icon
          name="arrow"
          className={`${L ? "size-5" : "size-4"} transition-transform duration-200 group-hover:translate-x-0.5`}
        />
      </span>
    </>
  );
  const cls = `${base} ${sizing} ${tone} ${width} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls} style={style}>
        {content}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} disabled={disabled} style={style}>
      {content}
    </button>
  );
}

export function Logo({ tone = "dark", className = "" }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <Link href="/" aria-label="LegalTechAnalyses — home" className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark tone={tone} className="size-7" />
      <span
        className={`font-display text-[19px] tracking-[-0.02em] sm:text-[21px] ${tone === "dark" ? "text-brand-950" : "text-white"}`}
      >
        <span className="font-bold">LegalTech</span>
        <span>Analyses</span>
      </span>
    </Link>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`t-eyebrow ${className}`}>{children}</p>;
}

export function Ornament() {
  return <div aria-hidden="true" className="ornament" />;
}

export function Chip({ glyph, label, className = "", style }: { glyph: string; label: string; className?: string; style?: CSSProperties }) {
  return (
    <span
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-brand-200 bg-white/90 py-1.5 pr-2.5 pl-1.5 shadow-[0_4px_12px_rgba(9,27,21,0.08)] ${className}`}
      style={style}
    >
      <span className="grid size-5 place-items-center rounded-full bg-brand-700 font-serif text-[13px] leading-none text-white">
        {glyph}
      </span>
      <span className="font-mono text-[12px] tracking-[0.04em] text-ink-2/60">|</span>
      <span className="font-mono text-[12px] tracking-[0.04em] text-ink">{label}</span>
    </span>
  );
}

export function Coin({ code, className = "", style }: { code: string; className?: string; style?: CSSProperties }) {
  return (
    <span
      className={`grid size-[clamp(42px,4.2vw,60px)] place-items-center rounded-full border border-stone bg-cream shadow-[0_4px_10px_rgba(41,102,70,0.10)] ${className}`}
      style={style}
    >
      <span className="grid size-[77%] place-items-center rounded-full border border-brand-200 bg-white text-[clamp(12px,1.05vw,15px)] font-semibold text-brand-700">
        {code}
      </span>
    </span>
  );
}
