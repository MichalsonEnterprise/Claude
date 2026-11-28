import {
  FeedbackSection,
  InputsSection,
  JackpotSection,
  OverlaysSection,
  SelectsSection,
} from '../_sections/interactive-sections';
import { ShellSection } from '../_sections/shell-section';
import {
  BadgesSection,
  BrandSection,
  ButtonsSection,
  CardsSection,
  DataSection,
  FoundationsSection,
  GamesSection,
  TabsSection,
} from '../_sections/static-sections';

/** /design-system — every component and state (visual QA). All values are DEMO. */
export default function DesignSystemPage() {
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-h2 laptop:text-h1">GLOBAL POOL design system</h1>
        <p className="max-w-3xl text-body-m text-text-secondary">
          React components for apps/web, built on @gp/tokens (Figma variables) with Tailwind CSS v4, Radix primitives
          and lucide icons. Every number on this page is DEMO data from @gp/shared/demo. Props are documented in
          docs/WEB_COMPONENTS.md.
        </p>
      </div>
      <FoundationsSection />
      <BrandSection />
      <ButtonsSection />
      <BadgesSection />
      <CardsSection />
      <InputsSection />
      <SelectsSection />
      <TabsSection />
      <OverlaysSection />
      <FeedbackSection />
      <DataSection />
      <JackpotSection />
      <GamesSection />
      <ShellSection />
    </>
  );
}
