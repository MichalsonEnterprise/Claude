"use client";

import { useId, useState } from "react";
import { deliverables, type Tok } from "@/content/deliverables";
import { Rings } from "./Rings";
import { Eyebrow } from "./ui";

const TOK: Record<Tok, string> = {
  k: "text-code-red",
  f: "text-code-lime",
  s: "text-code-rose",
  p: "text-code-gold",
  c: "text-code-gray",
  n: "text-code-green",
  t: "text-code-sand",
};

export function Deliverables() {
  const [active, setActive] = useState(1);
  const base = useId();
  const doc = deliverables[active];

  return (
    <section className="relative overflow-hidden bg-brand-950 py-24 text-white lg:py-40">
      <Rings cx={720} cy={260} from={60} to={1100} step={24} ry={0.62} className="opacity-90" />
      <div className="container-x relative">
        <div className="mx-auto flex max-w-[820px] flex-col items-center text-center" data-reveal>
          <Eyebrow className="text-white/65">Deliverables</Eyebrow>
          <h2 className="t-h2 mt-6">One engagement. A complete, regulator-ready legal package.</h2>
        </div>
        <div
          className="mt-14 overflow-hidden rounded-xl border border-white/8 bg-white/[0.03] backdrop-blur-[6px] lg:mt-16"
          data-reveal
        >
          <div
            role="tablist"
            aria-label="Package previews"
            className="flex gap-1.5 overflow-x-auto border-b border-white/8 px-4 py-4 md:px-6 md:py-[18px]"
          >
            {deliverables.map((d, i) => (
              <button
                key={d.id}
                id={`${base}-tab-${i}`}
                role="tab"
                type="button"
                aria-selected={i === active}
                aria-controls={`${base}-panel`}
                onClick={() => setActive(i)}
                className={`shrink-0 rounded-full px-4 py-2.5 text-[14px] font-medium whitespace-nowrap transition-colors ${
                  i === active ? "bg-brand-700 text-white" : "text-white/85 hover:bg-white/6"
                }`}
              >
                {d.tab}
              </button>
            ))}
          </div>
          <div
            id={`${base}-panel`}
            role="tabpanel"
            aria-labelledby={`${base}-tab-${active}`}
            className="overflow-x-auto px-4 pt-6 pb-7 md:px-7"
          >
            <pre key={doc.id} className="anim-fade-in min-h-[340px] font-mono text-[12px] leading-[1.75] md:text-[14px]">
              {doc.lines.map((line, i) => (
                <div key={i} className="flex gap-6">
                  <span className="w-6 shrink-0 text-right text-white/35 select-none">{i + 1}</span>
                  <code className="whitespace-pre">
                    {line.length === 0
                      ? " "
                      : line.map(([t, s], j) => (
                          <span key={j} className={TOK[t]}>
                            {s}
                          </span>
                        ))}
                  </code>
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
