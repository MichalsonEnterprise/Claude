import Link from 'next/link';

import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo height={36} />
      <div className="flex flex-col gap-2">
        <h1 className="text-h2">Page not found</h1>
        <p className="text-body-m text-text-secondary">This page isn&apos;t built yet or the link is wrong.</p>
      </div>
      <Button asChild>
        <Link href="/">Back to the lobby</Link>
      </Button>
    </main>
  );
}
