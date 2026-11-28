import { redirect } from 'next/navigation';

/** Shell nav link → USR-G7 lives at /history/games/favourites (rg-history). */
export default function Page() {
  redirect('/history/games/favourites');
}
