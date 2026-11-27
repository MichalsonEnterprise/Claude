"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { nav } from "@/content/site";
import { Icon } from "./icons";
import { Button, Logo } from "./ui";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header
      className={`anim-header fixed inset-x-0 top-0 z-50 backdrop-blur-sm transition-shadow ${
        scrolled || open ? "bg-cream/90 shadow-[0_1px_0_rgba(9,27,21,0.06)]" : "bg-cream/75"
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-6 md:px-10 xl:px-[112px]">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="py-2 text-[14px] text-ink transition-colors hover:text-brand-700"
            >
              {item.label}
            </Link>
          ))}
          <Button href="/checkout" variant="light" size="s">
            Order analysis
          </Button>
        </nav>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-md text-ink lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? "close" : "menu"} className="size-6" />
        </button>
      </div>

      <div
        id="mobile-menu"
        hidden={!open}
        className="h-[calc(100dvh-72px)] overflow-y-auto border-t border-brand-950/6 bg-cream px-6 pt-4 pb-10 md:px-10 lg:hidden"
      >
        <nav aria-label="Mobile" className="flex flex-col">
          {nav.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="anim-fade-up flex items-center justify-between border-b border-brand-950/6 py-5 font-display text-[26px] text-ink"
              style={{ ["--d" as string]: `${i * 50}ms` }}
            >
              {item.label}
              <Icon name="arrow" className="size-5 text-brand-700" />
            </Link>
          ))}
        </nav>
        <div className="mt-8" onClick={() => setOpen(false)}>
          <Button href="/checkout" fullWidth>
            Order analysis
          </Button>
        </div>
        <p className="mt-6 text-[13px] text-ink-2">Paid in crypto via NOWPayments · Delivered within 72h</p>
      </div>
    </header>
  );
}
