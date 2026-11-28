import { redirect } from 'next/navigation';

/** /2fa → enrolment (the challenge lives at /2fa/challenge). */
export default function Page() {
  redirect('/2fa/setup');
}
