"use client";

import { useState, type FormEvent } from "react";
import { DELIVERY_HOURS, PACKAGE_LIST, PACKAGES, formatEur, type PackageId } from "@/lib/packages";
import { isValidEmail } from "@/lib/validation";
import { Icon } from "./icons";
import { Button } from "./ui";

type Field = "packageId" | "email" | "project" | "consent";
type FormError = { message: string; field?: Field };

export function CheckoutForm({ initialPackage, devNotice }: { initialPackage: PackageId; devNotice?: string }) {
  const [packageId, setPackageId] = useState<PackageId>(initialPackage);
  const [email, setEmail] = useState("");
  const [project, setProject] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "loading" | "redirecting">("idle");
  const [error, setError] = useState<FormError | null>(null);
  const pkg = PACKAGES[packageId];
  const busy = status !== "idle";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email.trim())) {
      setError({ message: "Please enter a valid email address.", field: "email" });
      document.getElementById("email")?.focus();
      return;
    }
    if (!consent) {
      setError({ message: "Please confirm your email address and consent.", field: "consent" });
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, email: email.trim(), project, consent, website }),
      });
      const data = (await res.json().catch(() => ({}))) as { invoiceUrl?: string; error?: string; field?: Field };
      if (!res.ok || !data.invoiceUrl) {
        throw { message: data.error ?? "Something went wrong. Please try again.", field: data.field } as FormError;
      }
      setStatus("redirecting");
      window.location.assign(data.invoiceUrl);
    } catch (err) {
      setStatus("idle");
      const fe = err as FormError;
      setError({ message: fe?.message ?? "Network error. Please try again.", field: fe?.field });
    }
  }

  const fieldError = (f: Field) => (error?.field === f ? error.message : null);

  return (
    <form onSubmit={onSubmit} noValidate className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12">
      <div>
        <p className="t-eyebrow text-brand-700">Checkout</p>
        <h1 className="t-h2 mt-5">Complete your order</h1>
        <p className="mt-5 max-w-[560px] text-[16px] leading-[1.6] text-ink-2">
          Choose a package, tell us where to send it and pay in crypto. Your document arrives by email within{" "}
          {DELIVERY_HOURS} hours of payment confirmation.
        </p>

        <fieldset className="mt-12">
          <legend className="font-display text-[22px] text-ink">
            <span className="mr-2 font-mono text-[13px] text-brand-700">01</span>Choose your package
          </legend>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {PACKAGE_LIST.map((p) => {
              const selected = p.id === packageId;
              return (
                <label
                  key={p.id}
                  className={`relative flex cursor-pointer flex-col rounded-[6px] border p-5 transition-colors ${
                    selected
                      ? "border-brand-700 bg-white shadow-[0_0_0_1px_#296646,0_10px_24px_rgba(41,102,70,0.12)]"
                      : "border-brand-200 bg-white/70 hover:border-brand-400"
                  }`}
                >
                  <input
                    type="radio"
                    name="package"
                    value={p.id}
                    checked={selected}
                    onChange={() => setPackageId(p.id)}
                    className="sr-only"
                  />
                  <span className="flex items-center justify-between">
                    <span className="text-[12px] font-medium tracking-[0.08em] text-brand-700 uppercase">{p.name}</span>
                    <span
                      className={`grid size-5 place-items-center rounded-full border ${selected ? "border-brand-700 bg-brand-700 text-white" : "border-brand-300 bg-white"}`}
                      aria-hidden="true"
                    >
                      {selected ? <Icon name="check" className="size-3" strokeWidth={2.4} /> : null}
                    </span>
                  </span>
                  <span className="mt-4 font-display text-[34px] leading-none tracking-[-0.02em] text-ink">{formatEur(p.priceEur)}</span>
                  <span className="mt-3 text-[13px] leading-[1.5] text-ink-2">{p.summary}</span>
                  {p.badge ? (
                    <span className="mt-3 self-start rounded-[3px] bg-mint/40 px-1.5 py-0.5 text-[10px] font-bold tracking-[0.08em] text-brand-800 uppercase">
                      {p.badge}
                    </span>
                  ) : null}
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="mt-12">
          <legend className="font-display text-[22px] text-ink">
            <span className="mr-2 font-mono text-[13px] text-brand-700">02</span>Where should we send it?
          </legend>
          <div className="mt-5 grid gap-5">
            <div>
              <label htmlFor="email" className="text-[14px] font-semibold text-ink">
                Email address <span className="text-brand-700">*</span>
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={fieldError("email") ? true : undefined}
                aria-describedby="email-help"
                placeholder="you@company.com"
                className={`mt-2 h-[52px] w-full rounded-[4px] border bg-white px-4 text-[16px] text-ink outline-none placeholder:text-muted focus:border-brand-600 focus:shadow-[0_0_0_3px_rgba(62,117,88,0.18)] ${
                  fieldError("email") ? "border-code-red" : "border-brand-200"
                }`}
              />
              <p id="email-help" className="mt-2 text-[13px] text-ink-2">
                We&apos;ll send your {pkg.name} package to this address within {DELIVERY_HOURS}h. Please double-check it.
              </p>
            </div>
            <div>
              <label htmlFor="project" className="text-[14px] font-semibold text-ink">
                Project name or website <span className="font-normal text-ink-2">(optional)</span>
              </label>
              <input
                id="project"
                type="text"
                maxLength={120}
                autoComplete="organization"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                placeholder="e.g. Nordvault Protocol · nordvault.io"
                className="mt-2 h-[52px] w-full rounded-[4px] border border-brand-200 bg-white px-4 text-[16px] text-ink outline-none placeholder:text-muted focus:border-brand-600 focus:shadow-[0_0_0_3px_rgba(62,117,88,0.18)]"
              />
            </div>
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label htmlFor="website">Website</label>
              <input id="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            <label className="flex cursor-pointer items-start gap-3 text-[14px] leading-[1.5] text-ink">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                aria-invalid={fieldError("consent") ? true : undefined}
                className="mt-0.5 size-[18px] shrink-0 accent-brand-700"
              />
              <span>
                I confirm my email address is correct and agree to be contacted at it about this order.
              </span>
            </label>
          </div>
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-[96px]">
        <div className="rounded-[6px] border border-brand-800 bg-brand-950 p-7 text-white shadow-[0_24px_60px_rgba(9,27,21,0.25)] md:p-8">
          <p className="text-[12px] font-medium tracking-[0.08em] text-mint uppercase">Order summary</p>
          <div className="mt-5 flex items-baseline justify-between gap-4">
            <p className="font-display text-[26px]">{pkg.name}</p>
            <p className="font-display text-[26px]">{formatEur(pkg.priceEur)}</p>
          </div>
          <ul className="mt-5 flex flex-col gap-2.5 border-t border-white/10 pt-5">
            {pkg.features.map((f) => (
              <li key={f} className="flex gap-2.5 text-[14px] text-white/85">
                <Icon name="check" className="mt-0.5 size-4 shrink-0 text-mint" />
                {f}
              </li>
            ))}
          </ul>
          <dl className="mt-6 grid gap-3 border-t border-white/10 pt-5 text-[14px]">
            <div className="flex justify-between gap-4">
              <dt className="text-white/65">Payment</dt>
              <dd>Crypto via NOWPayments</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/65">Delivery</dt>
              <dd>Within {DELIVERY_HOURS}h, by email</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-white/10 pt-4 text-[16px] font-semibold">
              <dt>Total</dt>
              <dd>{formatEur(pkg.priceEur)} EUR</dd>
            </div>
          </dl>

          {error ? (
            <p role="alert" className="mt-6 rounded-[4px] border border-code-red/50 bg-code-red/15 px-4 py-3 text-[14px] text-white">
              {error.message}
            </p>
          ) : null}

          <div className="mt-6">
            <Button type="submit" variant="light" fullWidth disabled={busy}>
              {status === "loading"
                ? "Creating payment…"
                : status === "redirecting"
                  ? "Redirecting to NOWPayments…"
                  : `Pay ${formatEur(pkg.priceEur)} in crypto`}
            </Button>
          </div>
          <p className="mt-4 flex items-center gap-2 text-[12px] leading-[1.5] text-white/65">
            <Icon name="lock" className="size-4 shrink-0" />
            You&apos;ll be redirected to the secure NOWPayments checkout to pay with BTC, ETH, USDT, USDC or another coin.
          </p>
          {devNotice ? (
            <p className="mt-4 rounded-[4px] border border-mint/30 bg-mint/10 px-3 py-2 font-mono text-[11px] text-mint">{devNotice}</p>
          ) : null}
        </div>
      </aside>
    </form>
  );
}
