# PAGE: /app — Dashboard UX Microcopy — wersja PL (lokalizacja)

**SEO TITLE:**
Aplikacja VENT — Twój panel ekosystemu

**META DESCRIPTION:**
Twój panel VENT: saldo, locki, nagrody, membership, Reputacja, research, watchlisty, governance i zgłoszenia — w jednym miejscu.

**SUGGESTED H1:**
*(Powłoka aplikacji — H1 to powitanie po zalogowaniu, zob. niżej)*

**OPENGRAPH HEADLINE:**
Aplikacja VENT — ekosystem po zalogowaniu.

---

## GLOBAL APP SHELL

**Greeting header:** {Dzień dobry / Dzień dobry / Dobry wieczór}, {first name}. *(rano i po południu: „Dzień dobry”; wieczorem: „Dobry wieczór”)*
**Sub-line:** {Membership tier} · Reputacja {score} · [tier icon]

**Sidebar labels:**
Panel · Research · Watchlista · Governance · Reputacja · VENT & Lock · Nagrody · Zgłoszenia · Ustawienia

**Global states:**
- Loading (any panel): animacja szkieletowa, bez tekstu
- Panel error: „Nie udało się wczytać tego modułu. [Spróbuj ponownie]”
- Offline: „Jesteś offline. Wyświetlane dane mogą być nieaktualne.”
- Session expiry: „Twoja sesja wygasła. Zaloguj się ponownie, aby kontynuować.” — [Zaloguj się]

---

## MODULE — VENT BALANCE

**Card title:** Saldo VENT
**Primary value:** {n} VENT
**Rows:** Dostępne {n} · Zablokowane {n} · Oczekujące nagrody {n}
**Actions:** Zablokuj VENT · Zobacz historię →
**Tooltip (Available):** „VENT, które możesz zablokować, przeznaczyć na usługi lub przetransferować.”
**Empty state:** „Na tym koncie nie ma jeszcze VENT. Nabądź je w ramach dystrybucji albo prześlij do swojego zweryfikowanego portfela.” — [Zobacz dystrybucję →]
**Error:** „Nie udało się odświeżyć salda. Pokazujemy ostatnią zsynchronizowaną wartość ({time}).”

## MODULE — LOCKED VENT

**Card title:** VENT Lock
**Row template:** {n} VENT · lock {90/180/365} dni · odblokowanie {date} · naliczone nagrody {n} VENT
**Tooltip (rewards accrued):** „Nagrody ekosystemowe z puli o stałej wielkości. To nie odsetki ani yield; parametry mogą być korygowane w sposób ogłaszany w dokumentacji.” `[LEGAL REVIEW REQUIRED]`
**Empty state:** „Nie masz jeszcze żadnego locka. Lock podnosi Twój poziom członkostwa, wagę głosu w governance i zakres dostępu — a przy tym nalicza nagrody ekosystemowe.” — [Zablokuj VENT]
**Countdown microcopy:** „Odblokowanie za {n} dni” *(dla 1: „za 1 dzień”)*
**Unlock-ready state:** „Lock zakończony. Odbierz swoje VENT i nagrody.” — [Odbierz]

**Lock flow (modal):**
1. **Amount step** — Title: „Zablokuj VENT” · Field label: Ilość · helper: „Dostępne: {n} VENT” · error: „Podaj ilość nie większą niż dostępne saldo.”
2. **Period step** — Options: „90 dni — nagrody do ok. 2% w skali roku · wyższy status członkostwa” / „180 dni — do ok. 4% w skali roku · + wcześniejszy dostęp” / „365 dni — do ok. 6% w skali roku · + pełna waga głosu w governance” · footnote: „Robocze wartości docelowe z puli o stałej wielkości — bez gwarancji. `[LEGAL REVIEW REQUIRED]`”
3. **Confirm step** — Title: „Potwierdź lock” · Summary: „{n} VENT · {period} dni · odblokowanie {date}” · Warning: „Zablokowanych VENT nie da się używać, transferować ani odblokować wcześniej — z żadnego powodu — dopóki okres locka się nie skończy.” · Checkbox: „Rozumiem, że moje VENT pozostają niedostępne do {date}.” · Button: Zablokuj VENT
4. **Success** — „Zablokowano. {n} VENT w locku do {date}. Twój poziom członkostwa został zaktualizowany.” — [Zobacz swoją pozycję →]
5. **Errors** — Rejected: „Transakcja odrzucona w portfelu. Nic nie zostało zablokowane.” · Failed: „Transakcja locka nie powiodła się. Twoje VENT nie zostały przeniesione. Spróbuj ponownie lub napisz do pomocy.”

## MODULE — REWARDS

**Card title:** Nagrody ekosystemowe
**Rows:** Nagrody za lock {n} VENT · Nagrody za wkład {n} VENT · Łącznie do odebrania {n} VENT
**Action:** Odbierz nagrody
**Tooltip:** „Nagrody za lock i przyjęte wkłady, wypłacane z pul o stałej wielkości. Nigdy niepowiązane z wynikami żadnej inwestycji.” `[LEGAL REVIEW REQUIRED]`
**Empty state:** „Nie masz jeszcze nagród. Zablokuj VENT albo wnieś wkład — przyjęte prace otrzymują nagrody z przeznaczonych na to pul.” — [Zobacz ścieżki wkładu →]
**Claim success:** „Odebrano {n} VENT. Środki są już w Twoim dostępnym saldzie.”
**Claim error:** „Nie udało się odebrać nagród. Twoje nagrody są bezpieczne — spróbuj ponownie.”

## MODULE — MEMBERSHIP

**Card title:** Membership
**Primary value:** {MEMBER / RESEARCH / PRO / COUNCIL / BLACK}
**Progress line:** „Następny poziom: {tier} — wymaga {n} zablokowanych VENT + {n} Reputacji. Masz {n} / {n}.”
**Tooltip:** „Poziomy łączą zablokowane VENT i zdobytą Reputację. Sam lock nie wystarczy, by dojść na szczyt — potrzebny jest wkład.”
**Action:** Zobacz poziomy członkostwa →
**Upgrade prompt (eligible):** „Kwalifikujesz się do poziomu {tier}. Zmiana obowiązuje od razu.” — [Przejdź na {tier}]
**Upgrade success:** „Witamy w {tier}. Nowy zakres dostępu działa już w całej platformie.”
**Downgrade warning (lock expiring):** „Twój poziom {tier} zależy od locka, który kończy się {date}. Przedłuż lock, aby zachować korzyści swojego poziomu bez przerwy.”

## MODULE — REPUTATION

**Card title:** Reputacja
**Primary value:** {score} · {level}
**Rows:** Przyjęty research {n} · Pozyskane startupy {n} · Oceny {n} · Governance {n}
**Tooltip:** „Zdobywana wyłącznie za przyjęty wkład. Nieprzenoszalna — i nie da się jej kupić.”
**Empty state:** „Twoja historia zaczyna się od pierwszego przyjętego wkładu.” — [Zobacz, jak zdobywać →]
**Gain toast:** „+{n} Reputacji — przyjęto: {reason}.”

## MODULE — RESEARCH

**Card title:** Research
**Rows:** Nowe w tym tygodniu {n} · We wcześniejszym dostępie dla Ciebie {n}
**Item template:** {Company} · {sector} · VENT Score {n} · opublikowano {date} · plakietka [Wcześniejszy dostęp — publicznie za {n} dni], gdy dotyczy
**Tooltip (early access):** „Jako członek {RESEARCH/PRO} czytasz to przed szerszą publikacją — wcześniejsza wiedza, nie prawa inwestycyjne.”
**Empty state:** „Brak nowego researchu w tym tygodniu. Spółki z Twojej watchlisty pojawią się tu w chwili aktualizacji profili.”
**Gated item state:** „Wymaga poziomu {tier} →”

## MODULE — WATCHLIST

**Card title:** Watchlista
**Item template:** {Company} · status {chip} · ostatnia aktualizacja {date}
**Empty state:** „Nie obserwujesz jeszcze żadnej spółki. Dodawaj spółki z sekcji Odkrywaj, aby śledzić aktualizacje researchu i zmiany statusów.” — [Odkrywaj spółki]
**Update toast:** „{Company} ma teraz status {status}.”
**Remove confirm:** „Usunąć {Company} z watchlisty? Przestaniesz otrzymywać aktualizacje tej spółki.” — [Usuń / Zostaw]

## MODULE — GOVERNANCE

**Card title:** Governance
**Rows:** Otwarte głosowania {n} · Twoja waga głosu {n} — tooltip: „Zablokowane VENT + Reputacja, według opublikowanego wzoru.”
**Item template:** {Proposal title} · zamknięcie {date} · [Zagłosuj]
**Empty state:** „Brak otwartych głosowań. Propozycje w dyskusji: {n} — dołącz do rozmowy, zanim trafią pod głosowanie.” — [Zobacz propozycje →]

**Voting flow (modal):**
- Title: „{Proposal title}” · badge: „Głosowanie doradcze”
- Context block: „O czym rozstrzyga to głosowanie: {summary}. O czym nie rozstrzyga: o decyzjach inwestycyjnych jakiegokolwiek wehikułu — te pozostają poza zakresem governance.” `[LEGAL REVIEW REQUIRED]`
- Options + weight line: „Twoja waga: {n}”
- Confirm: „Oddać głos: {option}? Głosy są ostateczne i trafiają do Twojej historii governance.”
- Success: „Głos oddany. Wyniki opublikujemy {date}.”
- Closed error: „To głosowanie zamknęło się {time} temu. Wyniki →”

## MODULE — VOTES HISTORY

**Card title:** Twoja historia governance
**Row:** {Proposal} · Twój głos {option} · rozstrzygnięcie {result} · {date}
**Empty state:** „Nie masz jeszcze oddanych głosów. Historia governance buduje Twoją Reputację w tym filarze.”

## MODULE — STARTUP SUBMISSIONS

**Card title:** Twoje zgłoszenia
**Row:** {Company} · {APP-ID} · status: {Otrzymane / W screeningu / W researchu / Decyzja wydana} · aktualizacja {date}
**Status tooltips:**
- Received: „W kolejce do screeningu według kolejności zgłoszeń (lub priorytetowo — w ramach Accelerated Review).”
- In Screening: „W trakcie wstępnej weryfikacji według opublikowanych kryteriów.”
- Decision issued: „Rozstrzygnięcie wraz z uzasadnieniem znajdziesz w swojej skrzynce i poniżej.”
**Empty state:** „Nie masz jeszcze zgłoszeń. Jesteś founderem? Przeprowadź swoją spółkę przez pipeline.” — [Zgłoś swój startup]
**Decision states:** Accepted: „Przyjęte do researchu. Kolejny krok: rozmowa wprowadzająca z analitykiem w ciągu {n} dni.” · Declined: „Tym razem bez kolejnego etapu. Uzasadnienie — wraz z kryteriami ponownego zgłoszenia — w załączeniu.”

## MODULE — NOTIFICATIONS

**Panel title:** Powiadomienia
**Filters:** Wszystkie · Research · Governance · Nagrody · Zgłoszenia
**Templates:**
- „Nowy research: opublikowano profil {Company}.”
- „Wcześniejszy dostęp: {analysis} czeka na Ciebie {n} dni przed publiczną premierą.”
- „Głosowanie otwarte: {proposal} — zamknięcie {date}.”
- „Nagroda do odebrania: {n} VENT. Źródło: {source}.”
- „Aktualizacja locka: za {n} dni odblokujesz {n} VENT.”
- „Aktualizacja zgłoszenia: {Company} ma teraz status {status}.”
**Empty state:** „Na razie cisza. Powiadomienia pojawią się wraz z researchem, głosowaniami, nagrodami i aktualizacjami zgłoszeń.”
**Mark all action:** Oznacz wszystkie jako przeczytane

---

## GLOBAL CONFIRMATION & ERROR PATTERNS

**Destructive confirm pattern:** tytuł nazywa konsekwencję („Usunąć {x}?”) · treść mówi, co przepada · akcje: [Anuluj] / [{Verb}] — czasownik destrukcyjny nigdy na przycisku w kolorze podstawowym.
**Irreversible confirm pattern (locks, votes):** konsekwencja + checkbox z potwierdzeniem + przycisk z jednoznacznym czasownikiem.
**Error pattern:** co się nie udało → co jest bezpieczne → co zrobić. Przykład: „Nie udało się odebrać nagród. Twoje nagrody pozostają nietknięte. Spróbuj ponownie lub napisz do pomocy, podając kod {ERR}.”
**Success pattern:** co się stało → co się zmieniło → link do następnego kroku.
