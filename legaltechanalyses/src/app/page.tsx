import { Approach, Stats } from "@/components/Approach";
import { Confidentiality } from "@/components/Confidentiality";
import { Coverage } from "@/components/Coverage";
import { CrossBorder } from "@/components/CrossBorder";
import { Deliverables } from "@/components/Deliverables";
import { Faq } from "@/components/Faq";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Methodology } from "@/components/Methodology";
import { Pricing } from "@/components/Pricing";
import { Process } from "@/components/Process";
import { RevealObserver } from "@/components/RevealObserver";
import { Services } from "@/components/Services";
import { Ornament } from "@/components/ui";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Ornament />
        <Services />
        <Ornament />
        <Approach />
        <Stats />
        <Coverage />
        <Ornament />
        <Methodology />
        <Ornament />
        <CrossBorder />
        <Ornament />
        <Process />
        <Ornament />
        <Pricing />
        <Ornament />
        <Confidentiality />
        <Ornament />
        <Deliverables />
        <Ornament />
        <Faq />
        <Ornament />
      </main>
      <Footer />
      <RevealObserver />
    </>
  );
}
