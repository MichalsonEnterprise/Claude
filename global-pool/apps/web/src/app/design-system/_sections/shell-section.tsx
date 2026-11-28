'use client';

import * as React from 'react';

import { DEMO_SHELL_MEMBER } from '@/components/shell/app-shell';
import { FooterMega } from '@/components/shell/footer-mega';
import { MobileDrawer, MobileTabBar, MobileTopbar } from '@/components/shell/mobile';
import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

import { DsSection, Frame, Specimen } from './ds';

const POOL = '186400.00';
const noop = () => toast({ type: 'info', title: 'Preview only', description: 'Auth actions are wired in the live shell.' });

export function ShellSection() {
  const [drawer, setDrawer] = React.useState<null | 'guest' | 'member'>(null);
  return (
    <DsSection
      id="shell"
      title="App shell"
      description="Sidebar 240 / rail 72, top bar (guest · member · wrong network · restricted), mobile top bar, tab bar, drawer and mega footer. The live, responsive shell is at /design-system/shell."
    >
      <Specimen label="Sidebar — expanded guest · expanded member · rail guest · rail member" bodyClassName="block">
        <Frame>
          <div className="flex h-[960px] w-fit items-stretch gap-6 bg-bg-base p-4">
            <Sidebar embedded auth="guest" mode="expanded" activeHref="/" poolAmount={POOL} />
            <Sidebar
              embedded
              auth="member"
              mode="expanded"
              activeHref="/games/orbit-rush"
              counts={{ entries: 35 }}
              poolAmount={POOL}
            />
            <Sidebar embedded auth="guest" mode="collapsed" activeHref="/" poolAmount={POOL} />
            <Sidebar embedded auth="member" mode="collapsed" activeHref="/pool/entries" counts={{ entries: 35 }} poolAmount={POOL} />
          </div>
        </Frame>
      </Specimen>

      <Specimen label="Top bar — guest · member · wrong network · restricted region" bodyClassName="block">
        <Frame>
          <div className="flex w-[1200px] flex-col gap-4 bg-bg-base p-4">
            <Topbar embedded auth="guest" onMenuClick={noop} onSignIn={noop} onSignUp={noop} onSignOut={noop} />
            <Topbar embedded auth="member" member={DEMO_SHELL_MEMBER} onMenuClick={noop} onSignIn={noop} onSignUp={noop} onSignOut={noop} />
            <Topbar
              embedded
              auth="member"
              member={DEMO_SHELL_MEMBER}
              wrongNetwork
              onMenuClick={noop}
              onSignIn={noop}
              onSignUp={noop}
              onSignOut={noop}
            />
            <div>
              <Alert type="restricted" layout="full" title="Not available in your region">
                GLOBAL POOL games are not available in your region (United States). You can still view your account and
                withdraw funds.
              </Alert>
              <Topbar embedded auth="guest" restricted onMenuClick={noop} onSignIn={noop} onSignUp={noop} onSignOut={noop} />
            </div>
            <Topbar embedded auth="loading" onMenuClick={noop} onSignIn={noop} onSignUp={noop} onSignOut={noop} />
          </div>
        </Frame>
      </Specimen>

      <Specimen label="Mobile — top bar guest / member · tab bar · drawer" bodyClassName="items-start gap-6">
        <div className="flex w-[390px] max-w-full flex-col gap-3 rounded-lg border border-dashed border-border-default bg-bg-base p-0">
          <MobileTopbar embedded auth="guest" onMenuClick={() => setDrawer('guest')} onSignIn={noop} onSignUp={noop} />
          <MobileTopbar embedded auth="member" member={DEMO_SHELL_MEMBER} onMenuClick={() => setDrawer('member')} onSignIn={noop} onSignUp={noop} />
          <MobileTabBar embedded pathname="/" notifications={3} />
          <MobileTabBar embedded pathname="/wallet" notifications={0} />
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="secondary" onClick={() => setDrawer('guest')}>
            Open drawer (guest)
          </Button>
          <Button variant="secondary" onClick={() => setDrawer('member')}>
            Open drawer (member)
          </Button>
        </div>
        <MobileDrawer
          open={drawer !== null}
          onOpenChange={(o) => !o && setDrawer(null)}
          auth={drawer ?? 'guest'}
          member={drawer === 'member' ? DEMO_SHELL_MEMBER : null}
          activeHref="/"
          counts={{ entries: 35 }}
          poolAmount={POOL}
          onSignIn={noop}
          onSignUp={noop}
        />
      </Specimen>

      <Specimen label="Footer mega" bodyClassName="block">
        <Frame>
          <FooterMega />
        </Frame>
      </Specimen>
    </DsSection>
  );
}
