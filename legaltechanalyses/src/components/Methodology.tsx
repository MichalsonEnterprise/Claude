import type { CSSProperties, ReactNode } from "react";
import { regRows } from "@/content/site";
import { Icon } from "./icons";
import { Eyebrow } from "./ui";

function VisualCard({ children }: { children: ReactNode }) {
  return (
    <div className="relative grid w-full place-items-center overflow-hidden rounded-[4px] border border-brand-600 bg-[linear-gradient(to_bottom,#296646,#A8C2B5)] px-4 py-10 sm:aspect-[632/430] sm:py-4">
      <div className="w-full max-w-[448px] rounded-xl bg-white/35 p-1 shadow-[0_12px_32px_rgba(9,27,21,0.18)]">{children}</div>
    </div>
  );
}

function RegList() {
  return (
    <ul className="flex flex-col gap-1 rounded-lg bg-stone p-2">
      {regRows.map((r) => (
        <li
          key={r.name}
          className={`flex items-center gap-3 rounded-md px-3 py-2.5 sm:py-3 ${
            r.highlight ? "border border-brand-500 bg-mint/28" : "border border-transparent"
          } ${r.muted ? "opacity-45" : ""}`}
        >
          <span className={`grid size-7 shrink-0 place-items-center rounded-full ${r.highlight ? "bg-brand-700" : "bg-brand-950"}`}>
            <Icon name="check" className="size-3.5 text-white" strokeWidth={2.2} />
          </span>
          <span className="min-w-0 truncate text-[14px] text-ink sm:text-[16px]">{r.name}</span>
          {r.badge ? (
            <span className="hidden shrink-0 rounded-[3px] border border-brand-500/60 bg-mint/70 px-1.5 py-1 text-[9px] font-bold tracking-[0.08em] text-brand-800 uppercase sm:inline">
              {r.badge}
            </span>
          ) : null}
          <span className="ml-auto shrink-0 font-mono text-[11px] tracking-[0.04em] text-ink-2 sm:text-[12px]">{r.ref}</span>
        </li>
      ))}
    </ul>
  );
}

function RiskChart() {
  return (
    <div className="relative rounded-lg bg-cream" data-reveal="draw">
      <svg viewBox="0 0 440 300" className="block w-full" role="img" aria-label="RiskScore falls over time with LegalTechAnalyses compared with no analysis">
        <path d="M70 80H410M70 130H410M70 180H410" stroke="#D2DFD8" />
        <path d="M70 120C190 110 300 92 410 66L410 226C230 204 150 150 70 120Z" fill="#296646" fillOpacity=".1" />
        <path d="M70 120C190 110 300 92 410 66" fill="none" stroke="#7FA491" strokeWidth="1.5" strokeDasharray="4 4" />
        <path d="M70 30V250H410" fill="none" stroke="#7FA491" strokeWidth="1.2" />
        <path
          d="M70 120C150 150 230 204 410 226"
          fill="none"
          stroke="#296646"
          strokeWidth="2.5"
          strokeLinecap="round"
          pathLength={1}
          className="draw-path"
          style={{ ["--d" as string]: "200ms" } as CSSProperties}
        />
        <circle cx="410" cy="226" r="5" fill="#296646" stroke="#fff" strokeWidth="2" />
        <path d="M302 152H250M250 152l5-4M250 152l5 4" stroke="#7FA491" fill="none" />
        <text x="22" y="140" className="fill-brand-700 text-[10px] tracking-[0.08em]" fontFamily="Inter">RISK</text>
        <text x="222" y="274" className="fill-brand-700 text-[10px] tracking-[0.08em]" fontFamily="Inter">TIME</text>
        <g>
          <rect x="304" y="140" width="114" height="24" rx="4" fill="#fff" stroke="#7FA491" />
          <text x="361" y="156" textAnchor="middle" className="fill-brand-700 text-[9px] font-bold tracking-[0.08em]" fontFamily="Inter">
            THE LTA DIFFERENCE
          </text>
        </g>
      </svg>
    </div>
  );
}

function Row({ n, title, body, children }: { n: string; title: string; body: string; children: ReactNode }) {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_minmax(0,632px)]">
      <div data-reveal className="max-w-[520px]">
        <p className="font-mono text-[11px] text-brand-700">{n}</p>
        <h3 className="t-h3 mt-7">{title}</h3>
        <p className="mt-6 max-w-[450px] text-[16px] leading-[1.6] text-ink-2">{body}</p>
      </div>
      <div data-reveal style={{ ["--d" as string]: "120ms" } as CSSProperties}>
        {children}
      </div>
    </div>
  );
}

export function Methodology() {
  return (
    <section id="framework" className="bg-wave relative overflow-hidden bg-cream py-24 lg:pt-40 lg:pb-44">
      <div className="container-x">
        <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
          <Eyebrow className="text-brand-700">LTA analysis framework</Eyebrow>
          <h2 className="t-h2 mt-6" data-reveal="ink">
            Every opinion is built on a structured, auditable legal methodology
          </h2>
        </div>
        <div className="mt-20 flex flex-col gap-16 lg:mt-28 lg:gap-14">
          <Row
            n="001"
            title="Regulatory mapping of your product"
            body="We map your product against every applicable regime — MiCA, AMLR, TFR, DORA, GDPR and MiFID II — and flag exactly which licences, policies and disclosures you need."
          >
            <VisualCard>
              <RegList />
            </VisualCard>
          </Row>
          <Row
            n="002"
            title="The LTA RiskScore difference"
            body="Each analysis ends with a RiskScore that quantifies regulatory exposure — so founders, investors and exchanges see the risk at a glance and track how it falls over time."
          >
            <VisualCard>
              <RiskChart />
            </VisualCard>
          </Row>
        </div>
      </div>
    </section>
  );
}
