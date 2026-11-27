import type { Metadata } from "next";
import { CheckoutForm } from "@/components/CheckoutForm";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { isPackageId, type PackageId } from "@/lib/packages";

export const metadata: Metadata = {
  title: "Checkout — LegalTechAnalyses",
  robots: { index: false },
};

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ package?: string | string[] }> }) {
  const sp = await searchParams;
  const requested = Array.isArray(sp.package) ? sp.package[0] : sp.package;
  const initial: PackageId = isPackageId(requested) ? requested : "opinion";
  const devNotice =
    process.env.NODE_ENV !== "production" && !process.env.NOWPAYMENTS_API_KEY
      ? "Dev notice: NOWPAYMENTS_API_KEY is not set — checkout will return an error until it is configured."
      : undefined;
  return (
    <>
      <Header />
      <main className="bg-wave bg-cream pt-[120px] pb-24 md:pt-[150px] lg:pb-32">
        <div className="container-x">
          <CheckoutForm initialPackage={initial} devNotice={devNotice} />
        </div>
      </main>
      <Footer cta={false} />
    </>
  );
}
