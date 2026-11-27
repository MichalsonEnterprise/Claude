import type { CSSProperties } from "react";
import { paymentCoins } from "@/content/site";
import { DELIVERY_HOURS, PACKAGE_LIST, formatEur } from "@/lib/packages";
import { Icon } from "./icons";
import { Button, Eyebrow } from "./ui";

export function Pricing() {
  return (
    <section id="pricing" className="bg-wave relative overflow-hidden bg-cream py-24 lg:py-40">
      <div className="container-x">
        <div className="mx-auto flex max-w-[760px] flex-col items-center text-center" data-reveal>
          <Eyebrow className="text-brand-700">Pricing</Eyebrow>
          <h2 className="t-h2 mt-6">Choose your package</h2>
          <p className="mt-6 max-w-[560px] text-[16px] leading-[1.6] text-ink-2">
            Fixed prices in EUR, paid in crypto. Leave your email at checkout — your document arrives in your inbox
            within {DELIVERY_HOURS} hours.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:mt-16 lg:grid-cols-3 lg:gap-6">
          {PACKAGE_LIST.map((p, i) => {
            const featured = p.id === "full";
            return (
              <article
                key={p.id}
                data-reveal
                style={{ ["--d" as string]: `${i * 120}ms` } as CSSProperties}
                className={`relative flex flex-col rounded-[6px] border p-7 md:p-8 ${
                  featured
                    ? "border-brand-800 bg-brand-950 text-white shadow-[0_24px_60px_rgba(9,27,21,0.25)]"
                    : "border-brand-200 bg-white text-ink"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className={`t-eyebrow ${featured ? "text-mint" : "text-brand-700"}`}>{p.name}</h3>
                  {p.badge ? (
                    <span className="rounded-[3px] border border-mint/50 bg-mint/15 px-2 py-1 text-[10px] font-bold tracking-[0.08em] text-mint uppercase">
                      {p.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-6 flex items-baseline gap-2">
                  <span className="font-display text-[52px] leading-none tracking-[-0.02em] md:text-[56px]">
                    {formatEur(p.priceEur)}
                  </span>
                </p>
                <p className={`mt-3 font-mono text-[12px] tracking-[0.04em] ${featured ? "text-white/60" : "text-ink-2"}`}>
                  EUR · one-time · paid in crypto
                </p>
                <p className={`mt-6 text-[15px] leading-[1.6] ${featured ? "text-white/80" : "text-ink-2"}`}>{p.summary}</p>
                <ul className={`mt-6 flex flex-col gap-3 border-t pt-6 ${featured ? "border-white/10" : "border-brand-100"}`}>
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-3 text-[14px] leading-[1.5]">
                      <span
                        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${featured ? "bg-mint text-brand-950" : "bg-brand-700 text-white"}`}
                      >
                        <Icon name="check" className="size-3" strokeWidth={2.4} />
                      </span>
                      <span className={featured ? "text-white/90" : "text-ink"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <Button href={`/checkout?package=${p.id}`} variant={featured ? "light" : "primary"} fullWidth>
                    Choose {p.name}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>

        <div
          data-reveal
          className="mt-8 flex flex-col items-start gap-4 rounded-[6px] border border-brand-200 bg-white/70 px-6 py-5 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-center gap-3 text-[14px] text-ink">
            <Icon name="coin" className="size-5 shrink-0 text-brand-700" />
            <span>
              Secure crypto checkout by <strong className="font-semibold">NOWPayments</strong> · delivery within{" "}
              {DELIVERY_HOURS}h of payment confirmation
            </span>
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Accepted coins (selection)">
            {paymentCoins.map((c) => (
              <li key={c} className="rounded-full border border-brand-200 bg-white px-2.5 py-1 font-mono text-[11px] text-brand-700">
                {c}
              </li>
            ))}
            <li className="px-1 py-1 font-mono text-[11px] text-ink-2">+ more</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
