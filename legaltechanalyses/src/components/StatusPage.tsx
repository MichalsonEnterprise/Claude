import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { Icon, type IconName } from "./icons";

export function StatusPage({ icon, eyebrow, title, children }: { icon: IconName; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="bg-wave flex min-h-[80vh] items-center bg-cream pt-[120px] pb-24">
        <div className="container-x">
          <div className="anim-fade-up mx-auto max-w-[640px] rounded-[6px] border border-brand-200 bg-white p-8 text-center shadow-[0_24px_60px_rgba(9,27,21,0.08)] md:p-12">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-brand-700 text-white shadow-[0_0_0_10px_rgba(144,235,188,0.25)]">
              <Icon name={icon} className="size-7" strokeWidth={2.2} />
            </span>
            <p className="t-eyebrow mt-8 text-brand-700">{eyebrow}</p>
            <h1 className="t-h3 mt-4">{title}</h1>
            <div className="mt-5 text-[16px] leading-[1.6] text-ink-2">{children}</div>
          </div>
        </div>
      </main>
      <Footer cta={false} />
    </>
  );
}
