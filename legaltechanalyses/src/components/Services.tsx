import Image from "next/image";
import type { CSSProperties } from "react";
import { services } from "@/content/site";
import { Rings } from "./Rings";
import { Button, Eyebrow } from "./ui";

export function Services() {
  return (
    <section id="services" className="relative overflow-hidden bg-brand-950 py-24 text-white md:py-32 lg:py-40">
      <Rings cx={1180} cy={-120} from={90} to={1500} step={26} />
      <div className="container-x relative">
        <div data-reveal>
          <Eyebrow className="text-white/60">Services</Eyebrow>
          <h2 className="t-h2 mt-6 max-w-[820px]">Legal analyses for every layer of the crypto stack</h2>
        </div>
        <div className="mt-14 grid gap-14 md:mt-16 md:grid-cols-3 md:gap-8">
          {services.map((s, i) => (
            <article key={s.title} data-reveal style={{ ["--d" as string]: `${i * 120}ms` } as CSSProperties}>
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={s.image}
                  alt={s.alt}
                  fill
                  sizes="(min-width: 768px) 405px, 100vw"
                  className="object-cover transition-transform duration-700 ease-out hover:scale-[1.03]"
                />
              </div>
              <h3 className="t-h4 mt-8">{s.title}</h3>
              <p className="mt-4 text-[14px] leading-[1.6] text-white/72">{s.body}</p>
              <Button href="/#pricing" size="s" className="mt-8">
                See pricing
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
