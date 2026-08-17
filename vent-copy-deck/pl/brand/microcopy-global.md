# VENT — Global Microcopy — wersja PL (lokalizacja)

Wspólne copy UI dla całego serwisu. Navbar i stopka: `pl/01-home.md` (sekcje 01 i 26); stany wewnątrz aplikacji: `pl/24-app.md`. Ten plik obejmuje wszystko, co współdzielone między stronami.

---

## 1. Cookie banner

**Title:** Cookies, wprost.
**Body:** Używamy niezbędnych cookies, aby serwis działał, oraz opcjonalnych cookies analitycznych, aby wiedzieć, co warto poprawić. Żadnych trackerów reklamowych.
**Buttons:** Akceptuję wszystkie · Tylko niezbędne · Ustawienia cookies
**Settings modal:**
- Essential — „Wymagane do działania serwisu. Zawsze włączone.”
- Analytics — „Anonimowy pomiar korzystania z serwisu. Pomaga nam go ulepszać.” — przełącznik
- Save action: Zapisz preferencje
**Confirmation toast:** „Preferencje cookies zapisane.”

## 2. Newsletter (all placements)

**Field placeholder:** Twój służbowy e-mail
**Button:** Zapisz się
**Success:** „Subskrypcja aktywna. Pierwszy briefing dotrze wraz z najbliższym wydaniem.”
**Already subscribed:** „Ten adres już jest na liście.”
**Invalid:** „Ten adres nie wygląda poprawnie — sprawdź i spróbuj ponownie.”
**Server error:** „Zapis się nie powiódł. Spróbuj ponownie za chwilę.”
**Footer note:** „Wypiszesz się w każdej chwili. Polityka prywatności →”

## 3. Form conventions (site-wide)

- Znacznik pola wymaganego: „*” z legendą „Pole wymagane” — w formularzach złożonych głównie z pól wymaganych oznaczamy zamiast tego pola opcjonalne: „(opcjonalnie)”.
- Walidacja inline przy opuszczeniu pola; podsumowanie przy wysyłce: „Kilka pól wymaga uwagi: {list}”
- Ogólne błędy pól: Required → „To pole jest wymagane.” · Email → „Podaj poprawny adres e-mail.” · URL → „Podaj poprawny adres URL (https://…).” · Number → „Podaj liczbę.” · Too long → „Zmieść się w {n} znakach.”
- Autosave (długie formularze): „Wersję roboczą zapisano {time}.”

## 4. Account creation

**Title:** Załóż konto VENT
**Fields:** E-mail · Hasło („Co najmniej 12 znaków. Dobrze sprawdza się cała fraza.”) · Kraj rezydencji („Decyduje o dostępnych funkcjach zgodnie z obowiązującymi regulacjami.”) `[LEGAL REVIEW REQUIRED]`
**Consent checkbox:** „Akceptuję Regulamin i Politykę prywatności.” — error: „Do założenia konta wymagana jest akceptacja.”
**Marketing checkbox (optional):** „Chcę otrzymywać briefingi VENT Intelligence.”
**Button:** Załóż konto
**Success:** „Konto założone. Link weryfikacyjny wysłaliśmy na {email}.”
**Verify screen:** „Zweryfikuj adres e-mail — link wygaśnie za {n} godz.” · Resend: „Wyślij link ponownie” · Resent: „Nowy link jest w drodze.”
**Errors:** Taken → „Konto z tym adresem już istnieje. Zaloguj się →” · Weak password → „Wydłuż hasło — co najmniej 12 znaków.”

## 5. Login

**Title:** Logowanie
**Fields:** E-mail · Hasło
**Actions:** Zaloguj się · „Nie pamiętasz hasła?”
**2FA step:** „Wpisz 6-cyfrowy kod z aplikacji uwierzytelniającej.” — error: „Kod się nie zgadza. Kody zmieniają się co 30 sekund.”
**Reset flow:** „Podaj swój e-mail — jeśli konto istnieje, link do resetu jest już w drodze.” *(ten sam komunikat w obu przypadkach; bez ujawniania, czy konto istnieje)*
**Errors:** Bad credentials → „Nieprawidłowy e-mail lub hasło.” · Locked → „Zbyt wiele prób. Spróbuj ponownie za {n} min.”

## 6. Wallet connection

**Prompt title:** Połącz portfel
**Body:** „Połącz portfel, aby przechowywać, blokować i odbierać VENT. VENT nigdy nie poprosi o Twój seed phrase — nigdzie i nigdy.”
**Options:** [PLACEHOLDER: supported wallets]
**States:** Łączenie… · Connected: „Połączono {address short}.” · Rejected: „Połączenie anulowane w portfelu. Nic nie zostało udostępnione.” · Wrong network: „Aby kontynuować, przełącz sieć na [PLACEHOLDER: network].” — [Przełącz sieć]
**Verify-ownership step:** „Podpisz bezpłatną wiadomość, aby zweryfikować ten portfel. Podpis nic nie kosztuje i niczego nie przenosi.”
**Disconnect confirm:** „Odłączyć {address short}? Twoje salda zostają tam, gdzie są — aplikacja po prostu przestanie je wyświetlać.”

## 7. VENT Lock (cross-page prompts)

**Entry-point banner (signed-out):** „VENT Lock podnosi poziom członkostwa, wagę głosu w governance i zakres dostępu. Zaloguj się, aby zablokować VENT.” — [Zaloguj się]
**Entry-point banner (no balance):** „Do locka potrzebujesz VENT w połączonym portfelu.” — [Zobacz dystrybucję →]
*(Pełny przepływ locka: `pl/24-app.md`.)*

## 8. Voting (cross-page prompts)

**Signed-out prompt:** „Głosowanie jest dostępne dla członków. Zaloguj się, aby oddać głos doradczy.”
**No-weight prompt:** „Twoja waga głosu wynosi 0 — zablokuj VENT lub zdobądź Reputację, aby wziąć udział.”
*(Pełny przepływ głosowania: `pl/24-app.md`.)*

## 9. Research gating

**Teaser wall (public → member):**
**Title:** Tu zaczyna się głębia dla członków.
**Body:** „Pełny profil — wszystkie czternaście sekcji i kompletne uzasadnienie score'u — jest dostępny dla członków VENT.”
**CTA:** Dołącz do ekosystemu · secondary: Zobacz poziomy członkostwa →

**Tier wall (member → RESEARCH/PRO):**
**Title:** Ta analiza należy do poziomu {RESEARCH/PRO}.
**Body:** „Zaawansowane analizy i 7-dniowy wcześniejszy dostęp są częścią wyższych poziomów członkostwa.”
**CTA:** Zobacz poziomy członkostwa →

**Early-access badge:** „Wcześniejszy dostęp — publicznie za {n} dni”

## 10. Membership upgrade

**Prompt (eligible):** „Kwalifikujesz się do poziomu {tier}. Zmiana obowiązuje od razu.” — [Przejdź na {tier}]
**Prompt (not eligible):** „Poziom {tier} wymaga {n} zablokowanych VENT + {n} Reputacji. Masz {n} / {n}.” — [Zablokuj VENT] · [Zobacz, jak zdobywać Reputację →]
**Success:** „Witamy w {tier}. Nowy zakres dostępu już działa.”

## 11. Waitlists

**Generic pre-launch:** „Start w fazie: {phase}. Zostaw e-mail, a damy Ci znać w dniu uruchomienia.” — field: Twój e-mail — button: Powiadom mnie o starcie — success: „Zapisane. Odezwiemy się przy starcie — i ani chwili wcześniej.”
**Institutional waitlist:** zob. `pl/15-ventures-i.md`, sekcja 13.

## 12. Startup submission (cross-page)

**Entry banner:** „Standardowe zgłoszenia są bezpłatne. Accelerated Review skraca kolejkę — nigdy nie obniża kryteriów.” — [Zgłoś swój startup]
*(Pełny formularz: `pl/13-startups-apply.md`.)*

## 13. KYC (placeholder flow)

**Intro:** „Weryfikacja tożsamości jest wymagana do udziału w dystrybucji i przy wybranych funkcjach. Prowadzi ją [PLACEHOLDER: provider]; zwykle trwa kilka minut.”
**Needed list:** dokument tożsamości · szybka weryfikacja selfie · potwierdzenie adresu, gdy wymagane
**States:** In progress → „Weryfikacja w toku. Napiszemy do Ciebie, gdy tylko się zakończy.” · Approved → „Zweryfikowano. Wszystkie funkcje dostępne dla Ciebie zostały odblokowane.” · Manual review → „Twoje dokumenty wymagają spojrzenia człowieka — do [PLACEHOLDER: n] dni roboczych.” · Rejected → „Nie udało się zweryfikować Twojej tożsamości. Powód i dalsze możliwości znajdziesz w swoim panelu.”
**Privacy note:** „Dokumenty przetwarzamy wyłącznie na potrzeby weryfikacji, zgodnie z Polityką prywatności — nigdy do celów marketingowych.” `[LEGAL REVIEW REQUIRED]`

## 14. Token distribution notices

**Pre-open notice:** „Dystrybucja jeszcze się nie rozpoczęła. Oficjalne daty pojawią się tutaj i w briefingu — i nigdzie indziej wcześniej.”
**Open notice:** „Trwa runda: {round}. Opublikowana cena: {price}. Obowiązują wymogi kwalifikacji i dokumenty dystrybucji.” `[LEGAL REVIEW REQUIRED]`
**Jurisdiction block:** „Z podanych danych wynika, że w Twojej jurysdykcji udział nie jest dostępny. To ograniczenie prawne, nie osobiste.” `[LEGAL REVIEW REQUIRED]`
**Anti-scam line (persistent on sale surfaces):** „VENT ma jedną stronę dystrybucji: [PLACEHOLDER: official URL]. Żadnych wiadomości prywatnych, żadnych portfeli »wsparcia«, żadnych wyjątków.”
**Post-close notice:** „Ta runda została zamknięta. Szczegóły alokacji i odbioru znajdziesz w swoim panelu.”

## 15. Global toasts & errors

- Saved: „Zapisano.”
- Copied: „Skopiowano do schowka.”
- Generic failure: „Coś poszło nie tak po naszej stronie. Spróbuj ponownie — jeśli problem się powtarza, napisz do pomocy, podając kod {ERR}.”
- Rate limit: „Zbyt wiele żądań. Odczekaj chwilę.”
- Maintenance: „Trwa planowana przerwa techniczna. Wracamy do {time}.”
