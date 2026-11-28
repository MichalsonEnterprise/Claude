import { redirect } from 'next/navigation';

/** /history → complete transaction history (USR-F6). */
export default function HistoryIndex() {
  redirect('/history/transactions');
}
