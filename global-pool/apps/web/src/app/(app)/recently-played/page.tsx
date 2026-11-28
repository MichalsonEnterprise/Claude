import { redirect } from 'next/navigation';

/** Shell nav link → USR-G1 (recently played) lives at /history/games (rg-history). */
export default function Page() {
  redirect('/history/games');
}
