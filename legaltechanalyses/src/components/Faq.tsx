"use client";

import { useId, useState } from "react";
import { faq, site } from "@/content/site";
import { Icon } from "./icons";
import { Button } from "./ui";

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <section id="faq" className="bg-white py-24 lg:pt-[120px] lg:pb-[140px]">
      <div className="container-x grid gap-12 lg:grid-cols-[1fr_minmax(0,600px)] lg:gap-10">
        <div data-reveal>
          <p className="text-[18px] text-brand-700">FAQ</p>
          <h2 className="t-h2 mt-6">
            Questions,
            <br />
            answered
          </h2>
          <p className="mt-10 text-[16px] text-ink-2">Have a question that&apos;s not here or need help?</p>
          <div className="mt-6">
            {site.contactEmail ? (
              <Button href={`mailto:${site.contactEmail}`}>Contact us</Button>
            ) : (
              <Button href="/checkout">Order now</Button>
            )}
          </div>
        </div>
        <div className="border-t border-stone lg:border-t-0" data-reveal>
          {faq.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="border-b border-stone">
                <h3>
                  <button
                    type="button"
                    id={`${base}-q-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`${base}-a-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left text-[16px] text-ink"
                  >
                    {item.q}
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-[4px] border transition-colors ${
                        isOpen ? "border-brand-700 bg-brand-700 text-white" : "border-[#D6D3D1] bg-white text-ink"
                      }`}
                    >
                      <Icon name={isOpen ? "minus" : "plus"} className="size-4" />
                    </span>
                  </button>
                </h3>
                <div
                  id={`${base}-a-${i}`}
                  role="region"
                  aria-labelledby={`${base}-q-${i}`}
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden">
                    <p className="pr-12 pb-5 text-[14px] leading-[1.6] text-ink-2">{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
