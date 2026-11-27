import Link from "next/link";
import { nav, paymentCoins, site } from "@/content/site";
import { DELIVERY_HOURS } from "@/lib/packages";
import { Icon } from "./icons";
import { Button, Logo } from "./ui";

export function Footer({ cta = true }: { cta?: boolean }) {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden bg-brand-950 text-white">
      {cta ? (
        <div className="flex flex-col items-center gap-8 border-b border-white/10 px-6 pt-24 pb-16 text-center lg:pt-32 lg:pb-20">
          <h2 className="t-h2">Ready for legal clarity?</h2>
          <Button href="/#pricing" variant="light" size="s">
            Choose a package
          </Button>
        </div>
      ) : null}
      <div className="mx-auto grid max-w-[1440px] gap-14 px-6 pt-16 pb-12 md:px-10 lg:grid-cols-2 lg:px-[112px]">
        <div className="flex flex-col gap-7">
          <Logo tone="light" />
          <p className="text-[16px] leading-[1.6] text-white/85">
            {site.tagline[0]}
            <br />
            {site.tagline[1]}
          </p>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="text-[14px] text-white/85 hover:text-white">
                {n.label}
              </Link>
            ))}
          </nav>
          {(site.social.x || site.social.linkedin || site.contactEmail) && (
            <div className="flex gap-4 text-white/85">
              {site.social.x && (
                <a href={site.social.x} aria-label="X" className="hover:text-white">
                  <Icon name="x" className="size-5" />
                </a>
              )}
              {site.social.linkedin && (
                <a href={site.social.linkedin} aria-label="LinkedIn" className="hover:text-white">
                  <Icon name="linkedin" className="size-5" />
                </a>
              )}
              {site.contactEmail && (
                <a href={`mailto:${site.contactEmail}`} aria-label="Email" className="hover:text-white">
                  <Icon name="mail" className="size-5" />
                </a>
              )}
            </div>
          )}
        </div>
        <div className="lg:max-w-[552px] lg:justify-self-end">
          <p className="text-[12px] font-medium tracking-[0.08em] text-white/75 uppercase">Crypto payments</p>
          <p className="t-h4 mt-4">Pay in crypto. Delivered in {DELIVERY_HOURS}h.</p>
          <p className="mt-4 max-w-[440px] text-[14px] leading-[1.6] text-white/75">
            Every order is processed by NOWPayments. Choose a package, pay with your preferred coin and we deliver to
            the email address you provide within {DELIVERY_HOURS} hours.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {paymentCoins.map((c) => (
              <li key={c} className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 font-mono text-[12px] text-white/85">
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-[1440px] px-6 md:px-10 lg:px-[112px]">
        <div className="flex flex-col gap-3 border-t border-white/10 py-6 text-[12px] text-white/75 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} LegalTechAnalyses. All rights reserved.</p>
          <p>Payments processed by NOWPayments</p>
        </div>
      </div>
      <div aria-hidden="true" className="relative h-[clamp(140px,24vw,420px)] overflow-hidden select-none">
        <span className="absolute top-[4%] left-1/2 -translate-x-1/2 bg-[linear-gradient(to_bottom,#264F38,rgba(25,62,42,0.6))] bg-clip-text font-serif text-[clamp(200px,38vw,560px)] leading-none tracking-[-0.03em] text-transparent [-webkit-text-stroke:2px_rgba(41,102,70,0.6)]">
          LTA
        </span>
      </div>
    </footer>
  );
}
