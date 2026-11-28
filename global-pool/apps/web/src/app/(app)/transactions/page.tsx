import { redirect } from 'next/navigation';

/** Shell nav link → USR-F6 lives at /history/transactions (rg-history). */
export default function Page() {
  redirect('/history/transactions');
}
