# LegalTechAnalyses — strona + płatności krypto

Strona (desktop + mobile) dla LegalTechAnalyses, zakodowana na podstawie projektu w Figmie
(styl meld.io), z cennikiem i płatnościami kryptowalutami przez **NOWPayments**.

- Next.js 16 (App Router) + React 19 + Tailwind CSS 4, TypeScript
- Animacje: CSS + IntersectionObserver (odsłanianie przy przewijaniu), z obsługą `prefers-reduced-motion`
- Płatności: hostowana faktura NOWPayments (`POST /v1/invoice`) + webhook IPN z weryfikacją podpisu HMAC-SHA512
- Opcjonalne e-maile po opłaceniu (Resend)

## Jak działa zamówienie

1. Klient wybiera pakiet: **Analysis €500**, **Legal Opinion €1 000** albo **Full €1 500**
   (analiza + opinia + poprawka, jeśli jakiś podmiot ją odrzuci).
2. Podaje adres e-mail (i opcjonalnie nazwę projektu), zaznacza zgodę.
3. `/api/checkout` tworzy fakturę w NOWPayments (cena brana z serwera, nie z przeglądarki)
   i przekierowuje klienta na stronę płatności NOWPayments.
4. Po płatności klient wraca na `/payment/success`. Realizacja: do 72 h na podany e-mail.
5. NOWPayments wysyła IPN na `/api/nowpayments/ipn`. Przy statusie `finished` (jeśli e-maile są skonfigurowane)
   wysyłamy powiadomienie do zespołu i potwierdzenie do klienta.

Adres e-mail klienta jest zapisany w **opisie zamówienia** (order description) w NOWPayments,
więc każde opłacone zamówienie widać w panelu NOWPayments nawet bez skonfigurowanych e-maili.

## Uruchomienie lokalne

```bash
cd legaltechanalyses
npm install
cp .env.example .env.local   # uzupełnij klucze
npm run dev                  # http://localhost:3000
```

## Konfiguracja NOWPayments

1. Panel NOWPayments → **Settings → Payments → API keys**: wygeneruj klucz → `NOWPAYMENTS_API_KEY`.
2. Tamże **IPN secret key** → `NOWPAYMENTS_IPN_SECRET`.
3. Ustaw `SITE_URL` na publiczny adres strony (np. `https://legaltechanalyses.com`).
   Z niego budowane są adresy powrotu i adres IPN (`SITE_URL/api/nowpayments/ipn`) dla każdej faktury.
4. W panelu wybierz kryptowaluty, które chcesz przyjmować, i portfel do wypłat.
5. Testy bez prawdziwych pieniędzy: klucz z konta sandbox + `NOWPAYMENTS_SANDBOX=true`.

## E-maile (opcjonalnie)

Ustaw `RESEND_API_KEY`, `EMAIL_FROM` (nadawca z domeny zweryfikowanej w Resend) i `ORDER_NOTIFY_EMAIL`
(skrzynka zespołu). Bez nich strona i płatności działają, tylko bez automatycznych e-maili.

## Gdzie zmieniać treści

| Co | Plik |
|---|---|
| Ceny, nazwy i zakres pakietów, czas realizacji | `src/lib/packages.ts` |
| Klienci (pasek logotypów), usługi, statystyki, FAQ, jurysdykcje | `src/content/site.ts` |
| E-mail kontaktowy i social media (pokazują się dopiero po uzupełnieniu) | `src/content/site.ts` → `contactEmail`, `social` |
| Podglądy pakietów w sekcji „Deliverables” | `src/content/deliverables.ts` |
| Ilustracje usług | `public/images/` |

## Wdrożenie (Vercel)

Import repozytorium → **Root Directory: `legaltechanalyses`** → dodaj zmienne z `.env.example` → Deploy.
Każdy hosting z Node.js 20+ też zadziała (`npm run build && npm start`).

## Testy

```bash
npm test           # walidacja, faktura NOWPayments, podpis IPN, endpointy API
npm run typecheck
npm run build
```
