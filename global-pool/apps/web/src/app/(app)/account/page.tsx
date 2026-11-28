import type { Metadata } from 'next';

import { PersonalInfo } from '@/components/account/personal-info';

export const metadata: Metadata = { title: 'Personal information' };

/** USR-A1 Personal information (Account & security › Profile). */
export default function Page() {
  return <PersonalInfo />;
}
