# VENT — MiCA Art. 10 safeguarding: non-custodial smart-contract escrow vs. CASP custody

**Analiza prawna — materiał wyjściowy do formalnej opinii prawnej**

| | |
|---|---|
| **Przedmiot** | Publiczna oferta utility tokena VENT w UE pod Rozporządzeniem (UE) 2023/1114 (MiCA) |
| **Emitent / offeror** | Planowana spółka Wyoming, USA (brak oddziału w UE) |
| **Raise** | ~€5–9 mln, płatności USDC / USDT, blockchain Base |
| **Data analizy** | 17 sierpnia 2026 |
| **Status** | Draft roboczy — **nie stanowi opinii prawnej**; przeznaczony do weryfikacji przez kwalifikowanego doradcę MiCA/EU fintech |

---

## 0. NOTA METODOLOGICZNA — PRZECZYTAJ PRZED UŻYCIEM

**Ograniczenie źródłowe tej sesji.** W środowisku, w którym powstał ten dokument, bezpośredni dostęp HTTP do `eur-lex.europa.eu`, `esma.europa.eu`, `afm.nl`, `amf-france.org` oraz do lustrzanych baz tekstu MiCA był **zablokowany przez politykę egress**. Nie mogłem zatem odczytać tekstu rozporządzenia bezpośrednio ze źródła urzędowego. Analiza opiera się na:

1. fragmentach tekstu MiCA cytowanych dosłownie w wynikach wyszukiwarki z domen urzędowych (EUR-Lex, ESMA ISRB) i z baz tekstowych,
2. materiałach kancelarii pierwszego rzędu (White & Case, Norton Rose Fulbright, Freshfields, CMS, Dechert, A&O Shearman, KPMG Law, Osborne Clarke, CERHA HEMPEL, Stadler Partner, Ganado),
3. mojej znajomości struktury rozporządzenia.

**Konsekwencja praktyczna:** wszystkie **numery ustępów i liter** oraz **dokładne brzmienia** oznaczone niżej jako `[VERIFY]` muszą zostać potwierdzone na tekście urzędowym (EUR-Lex, wersja skonsolidowana PL i EN) zanim ten materiał zostanie użyty operacyjnie. Konkluzje merytoryczne są odporne na drobne rozbieżności numeracji, ale **nie cytuj z tego dokumentu numerów ustępów bez sprawdzenia**.

Gdzie prawo jest niejednoznaczne, dokument używa oznaczenia **`UNCLEAR / REQUIRES NCA OR COUNSEL CONFIRMATION`** i przedstawia argumenty obu stron. Nie zgadywałem.

---

# EXECUTIVE ANSWER

> **1. Czy VENT potrzebuje CASP?**
> **Tak — w modelu, w którym oferta jest ofertą publiczną w rozumieniu Tytułu II MiCA i nie korzysta z wyłączenia z art. 4 ust. 3.** Art. 10 ust. 3 MiCA nakłada obowiązek *pozytywny i podmiotowy*: środki zebrane w ofercie mają być „kept in custody by one or both of the following: (a) a credit institution, where funds are raised; (b) a crypto-asset service provider providing custody and administration of crypto-assets on behalf of clients". Jest to **lista zamknięta dwóch kategorii podmiotów regulowanych**. Nie ma w niej klauzuli otwierającej („such as", „or equivalent arrangements", „or other effective means"). Kod nie jest podmiotem prawa i nie może „keep in custody".
>
> **2. Czy audytowany non-custodial smart-contract escrow może zastąpić CASP?**
> **Nie jako samodzielna podstawa zgodności.** Escrow spełnia *cel* przepisu (segregacja, brak dostępu emitenta, refund on-chain, transparentność) — i to jest mocny argument mitygacyjny, ale nie jest to *wykonanie* obowiązku z art. 10 ust. 3. Co więcej: jeżeli escrow ma jakiekolwiek uprawnienia administracyjne po stronie VENT (upgrade, pause, sweep, zmiana parametrów), ryzyko *rośnie*, a nie maleje — VENT może zostać uznany za wykonującego „custody and administration of crypto-assets on behalf of clients" bez zezwolenia (art. 59 MiCA), co jest naruszeniem poważniejszym niż samo naruszenie art. 10.
> **Właściwa rola escrow: warstwa techniczna wewnątrz modelu z CASP, nie zamiast CASP.**
>
> **3. Czy continuous offering (oferta bez terminu) pomaga?**
> **Teoretycznie tak, praktycznie dla VENT prawdopodobnie nie.** Art. 10 ust. 4 skraca okres safeguardingu dla ofert bezterminowych do momentu wygaśnięcia prawa odstąpienia z art. 13 (14 dni kalendarzowych per nabywca) — to znacznie korzystniejsze cash-flow niż przy ofercie terminowej. **Ale** art. 4 MiCA `[VERIFY: ust. 6]` stanowi, że gdy oferta dotyczy **utility tokena dającego dostęp do dóbr/usług, które jeszcze nie istnieją lub nie są jeszcze operacyjne**, czas trwania oferty opisany w white paperze **nie może przekraczać 12 miesięcy**. VENT (usługa jeszcze niedostępna) musi więc podać termin → oferta jest terminowa → art. 10 ust. 4 nie ma zastosowania. **Continuous offering nie jest dla VENT dostępny prawnie, o ile usługa nie jest operacyjna w chwili oferty.**
>
> **4. Kiedy możemy skorzystać z konkretnej wpłaty?**
> - Oferta **bezterminowa** (gdyby była dostępna): dzień zakupu + 14 dni kalendarzowych, rolling per nabywca.
> - Oferta **terminowa** (realny scenariusz VENT): **`UNCLEAR`**. Tekst art. 10 ust. 3 nie wskazuje momentu zwolnienia. Wykładnia konserwatywna: do końca okresu subskrypcji + wygaśnięcia niewykorzystanych praw odstąpienia. Wykładnia liberalna: rolling per nabywca po 14 dniach. **Praktyczne rozwiązanie: pociąć raise na krótkie transze subskrypcyjne (np. 4 × 30–45 dni), z których każda się domyka.**
>
> **5. Czy Wyoming + AFM Netherlands to prawidłowa konstrukcja?**
> **Nie automatycznie.** Dla offerora z państwa trzeciego bez oddziału w UE home Member State to (art. 3 ust. 1 pkt 33 `[VERIFY]`) **państwo, w którym kryptoaktywa mają być po raz pierwszy oferowane publicznie**, albo — do wyboru offerora — **państwo pierwszego wniosku o dopuszczenie do obrotu**. Holandii **nie można po prostu wybrać**. Trzeba albo (i) faktycznie i dowodliwie rozpocząć ofertę publiczną w NL jako pierwszym państwie, albo (ii) złożyć pierwszy wniosek o admission to trading w NL, albo (iii) — **rekomendowane** — założyć spółkę EU (np. holenderskie B.V.) jako offerora; wtedy home MS = NL z mocy art. 3 ust. 1 pkt 33 lit. a `[VERIFY]`, bez konstrukcji dowodowej.
>
> **6. Najtańszy legalnie defensywny model?**
> W kolejności od najtańszego:
> **(D1)** Uruchomić usługę *przed* ofertą i skorzystać z wyłączenia „utility token providing access to a good or service that **exists or is in operation**" (art. 4 ust. 3 `[VERIFY]`) → **cały Tytuł II, w tym art. 10, nie ma zastosowania**. To jedyna droga, która całkowicie eliminuje CASP.
> **(B)** Smart-contract escrow **+ minimalny CASP** posiadający uprawnienie do custody, sprawujący realną kontrolę nad środkami w okresie ochronnym. To model rekomendowany, jeśli D1 jest niewykonalne.
> **(D2)** Sprzedaż za EUR na rachunek escrow w **instytucji kredytowej** (art. 10 ust. 3 lit. a) zamiast za USDC — bank zamiast CASP; tańsze, ale trudne operacyjnie (banki EU niechętne ICO).
>
> **7. Co dokładnie musi potwierdzić zewnętrzny prawnik przed launch?** → **Sekcja 16**, 12 punktów. Trzy krytyczne: (i) czy usługa VENT jest „in operation" w rozumieniu art. 4 ust. 3; (ii) czy AFM zaakceptuje NL jako home MS dla podmiotu z Wyoming; (iii) jaki minimalny poziom kontroli CASP nad środkami AFM uzna za „custody" w rozumieniu art. 10 ust. 3 lit. b.

**Jedno zdanie podsumowania:** *Model „100% smart-contract escrow, zero CASP" nie jest obecnie prawnie obronny jako podstawa zgodności z art. 10 ust. 3 MiCA; escrow jest wartościowy jako warstwa techniczna i jako argument mitygacyjny, ale nie zastępuje podmiotu regulowanego — natomiast realną szansą na wyeliminowanie art. 10 w całości jest nie escrow, lecz uruchomienie usługi przed ofertą (art. 4 ust. 3).*

---

# 1. PRIMARY LAW — mapa przepisów

## 1.1 Struktura Tytułu II MiCA (art. 4–15)

| Przepis | Tytuł / treść | Znaczenie dla VENT |
|---|---|---|
| **Art. 4** | Offers to the public of crypto-assets other than ART/EMT | Warunki oferty; wyłączenia; **limit 12 miesięcy dla utility tokenów nieoperacyjnych** |
| **Art. 5** | Admission to trading | Nie dotyczy (na razie) |
| **Art. 6** | Content and form of the crypto-asset white paper | Treść WP, w tym opis oferty i zabezpieczeń |
| **Art. 7** | Marketing communications | Reżim marketingu; ryzyko sankcji (zob. sprawa Bitpanda) |
| **Art. 8** | Notification of the crypto-asset white paper | **Notyfikacja do NCA home MS ≥ 20 dni roboczych przed publikacją**; brak prior approval |
| **Art. 9** | Publication of the crypto-asset white paper | WP publikowany identyczny z notyfikowanym |
| **Art. 10** | **Result of the offer to the public and safeguarding arrangements** | **Rdzeń analizy** |
| **Art. 11** | Rights of offerors and persons seeking admission to trading | |
| **Art. 12** | Modification of published white papers | Istotne przy zmianie modelu escrow po notyfikacji |
| **Art. 13** | **Right of withdrawal** | 14 dni kalendarzowych; determinuje długość safeguardingu przy ofercie bezterminowej |
| **Art. 14** | Obligations of offerors | Honestly/fairly/professionally; **utrzymanie systemów i security access protocols** (art. 14 ust. 1 lit. d) |
| **Art. 15** | Liability for the information given in a crypto-asset white paper | **Odpowiedzialność cywilna** za WP wprowadzający w błąd |

## 1.2 Art. 10 — struktura ustępów (rekonstrukcja)

`[VERIFY — numeracja potwierdzona pośrednio, przez ESMA ISRB (tytuł artykułu) i cytaty w wynikach wyszukiwania]`

- **Art. 10 ust. 1** — offeror, który **ustalił termin** oferty, publikuje na stronie internetowej **wynik oferty** (result of the offer to the public).
- **Art. 10 ust. 2** — offeror, który **nie ustalił terminu**, publikuje na stronie **na bieżąco, co najmniej raz w miesiącu, liczbę jednostek kryptoaktywa w obiegu** (*„shall publish on their website on an ongoing basis, at least monthly, the number of units of the crypto-assets in circulation"*).
- **Art. 10 ust. 3** — **safeguarding**: offeror, który ustalił termin oferty, *„shall have effective arrangements in place to monitor and safeguard the funds or other crypto-assets raised during the offer to the public"*; w tym celu zapewnia, że środki *„are kept in custody by one or both of the following: (a) a credit institution, where funds are raised during the offer to the public; (b) a crypto-asset service provider providing custody and administration of crypto-assets on behalf of clients."*
- **Art. 10 ust. 4** — *„Where the offer to the public has no time limit, the offeror shall comply with paragraph 3 of this Article until the right of withdrawal of the retail holder pursuant to Article 13 has expired."*

## 1.3 Art. 13 — right of withdrawal (rekonstrukcja)

- **ust. 1** — prawo odstąpienia przysługuje **retail holders**, którzy nabywają kryptoaktywa **bezpośrednio od offerora** albo **od CASP dokonującego placement na rzecz offerora**.
- **ust. 2** — **14 dni kalendarzowych**, bez opłat i bez podania przyczyny; *„The period of withdrawal shall begin from the date of the agreement of the retail holder to purchase those crypto-assets."*
- **ust. 3** — zwrot wszystkich płatności, w tym opłat, **bez zbędnej zwłoki, nie później niż 14 dni od poinformowania** o odstąpieniu, tym samym środkiem płatniczym.
- **ust. 4** `[VERIFY]` — **prawo odstąpienia NIE przysługuje**, gdy kryptoaktywa zostały **dopuszczone do obrotu przed ich nabyciem** przez retail holdera.
- **ust. 5** `[VERIFY]` — gdy offeror **ustalił termin** oferty zgodnie z art. 10, prawo odstąpienia **nie może być wykonane po zakończeniu okresu subskrypcji**.

## 1.4 Definicje (art. 3 ust. 1) — kluczowe dla analizy

| Pojęcie | Brzmienie / znaczenie | Nr `[VERIFY]` |
|---|---|---|
| **offeror** | osoba fizyczna, prawna lub inna jednostka, albo emitent, która oferuje kryptoaktywa publicznie | pkt 13 |
| **custody and administration of crypto-assets on behalf of clients** | *„the safekeeping or **controlling**, on behalf of clients, of crypto-assets or of the **means of access** to such crypto-assets, where applicable in the form of private cryptographic keys"* | pkt 17 |
| **crypto-asset service** | lista usług, w tym custody (lit. a), placement, transfer services (lit. j) | pkt 16 |
| **transfer services for crypto-assets** | odrębna usługa regulowana | pkt 26 |
| **funds** | *„funds as defined in Article 4, point (25), of Directive (EU) 2015/2366"* (PSD2): banknoty i monety, pieniądz bezgotówkowy, **pieniądz elektroniczny** | pkt 33 lub inny |
| **home Member State** | dla offerora z państwa trzeciego **bez oddziału w UE**: państwo pierwszej oferty publicznej albo — do wyboru — państwo pierwszego wniosku o admission to trading | pkt 33 |
| **retail holder** | osoba fizyczna działająca poza działalnością gospodarczą/zawodową | — |
| **qualified investors** | odesłanie do Prospectus Regulation (UE) 2017/1129 | — |

## 1.5 Art. 75 — custody and administration (Tytuł V, obowiązki CASP)

Kluczowe elementy, istotne przy projektowaniu Minimal CASP Architecture:

- **ust. 1** — CASP zawiera **umowę z klientami** określającą obowiązki i odpowiedzialność.
- **ust. 3** `[VERIFY]` — **register of positions** otwarty **w imieniu każdego klienta**, odpowiadający prawom klienta do kryptoaktywów.
- **ust. 7** `[VERIFY]` — **segregacja operacyjna** aktywów klientów od majątku CASP.
- **ust. 8** `[VERIFY]` — **odpowiedzialność** CASP za utratę kryptoaktywów lub means of access wskutek incydentu **przypisywalnego CASP**, ograniczona do wartości rynkowej utraconego aktywa w chwili utraty.

## 1.6 Art. 70 — safekeeping of clients' crypto-assets and funds

Ogólny obowiązek CASP: adekwatne zabezpieczenie praw własności klientów, **szczególnie w razie niewypłacalności CASP**, zakaz używania aktywów klienta na własny rachunek; środki pieniężne klientów **inne niż EMT** — na wyodrębnionym rachunku w instytucji kredytowej / banku centralnym.

**Wniosek systemowy istotny dla escrow:** unijny prawodawca konsekwentnie buduje ochronę wokół **prawnie rozpoznawalnej segregacji majątkowej i odpowiedzialności podmiotu**, a nie wokół technicznej niedostępności środków. Smart contract zapewnia to drugie, ale nie pierwsze.

## 1.7 Recitals — istotne motywy

| Motyw | Treść / znaczenie | Status |
|---|---|---|
| **Recital 87** | *„the exchange of crypto-assets for funds or other crypto-assets when made by the issuer or offeror should not be a crypto-asset service"* | **Potwierdzony** przez ESMA Q&A 2293 — VENT sprzedając własny token nie świadczy usługi „exchange" |
| **Recital 93** | transfer jako element innej usługi vs. samodzielna usługa transferu | Potwierdzony przez ESMA Q&A 2071 |
| **Recital 22** `[VERIFY]` | wyłączenie ofert kryptoaktywów oferowanych za darmo / jako reward za utrzymanie DLT | Uzasadnia art. 4 ust. 3 |
| Motyw dot. ochrony konsumenta | *„Union legislative acts that ensure consumer protection remain applicable to offers to the public of crypto-assets where they concern business-to-consumer relationships"* | Ważne: nawet oferta wyłączona z Tytułu II podlega prawu konsumenckiemu UE |

---

# 2. ART. 10 UST. 3 — ANALIZA LITERALNA

## 2.1 Rozbiór normy

Art. 10 ust. 3 zawiera **dwa odrębne obowiązki**, nie jeden:

**Obowiązek nr 1 — rezultatowy (obligation of result):**
> *„shall have effective arrangements in place to **monitor and safeguard** the funds or other crypto-assets raised during the offer to the public"*

To norma otwarta, technologicznie neutralna. **Smart-contract escrow może ją spełnić — a nawet spełnić lepiej niż konto w CASP.**

**Obowiązek nr 2 — podmiotowy (obligation of means):**
> *„To that end, those offerors shall ensure that the funds or crypto-assets collected during the offer to the public **are kept in custody by one or both of the following**: (a) a credit institution…; (b) a crypto-asset service provider providing custody and administration of crypto-assets on behalf of clients."*

To norma **zamknięta i podmiotowa**.

## 2.2 Odpowiedź na pytanie A vs. B

> **Czy obowiązek dotyczy (A) bezpieczeństwa środków jako rezultatu, czy (B) konkretnego rodzaju regulowanego podmiotu?**

**Odpowiedź: obu — ale wiążącym ograniczeniem (binding constraint) jest B.**

Konstrukcja „X shall have effective arrangements… **To that end**, X shall ensure Y" jest w prawie unijnym typową konstrukcją **celu + wyłącznego środka**. Zwrot *„to that end"* nie osłabia drugiego zdania — on je **przypina** do celu jako jedyny przewidziany sposób realizacji. Gdyby prawodawca chciał dopuścić alternatywy, użyłby formuły znanej z innych aktów: *„by means of, in particular"*, *„including but not limited to"*, *„or by other arrangements providing equivalent protection"*. **Żadnej z nich w art. 10 ust. 3 nie ma.** Przeciwnie — wyrażenie **„one or both of the following"** jest jawnie enumeratywne i wyklucza trzecią możliwość.

## 2.3 Czy zostaje jakiekolwiek pole dla wymienionych konstrukcji?

| Konstrukcja | Czy spełnia art. 10 ust. 3? | Uzasadnienie |
|---|---|---|
| **Smart-contract escrow (immutable, non-custodial)** | **NIE — samodzielnie** | Nie jest ani credit institution, ani CASP. Nie jest podmiotem prawa. Nie może być adresatem obowiązku „keep in custody". |
| **Decentralized escrow / DAO-governed** | **NIE** | Jak wyżej; dodatkowo governance DAO może zostać uznane za sprawowanie kontroli przez zidentyfikowane osoby → ryzyko nielicencjonowanego custody. |
| **Self-executing escrow** | **NIE** | Automatyzm nie tworzy podmiotowości. |
| **Non-custodial escrow** | **NIE** | „Non-custodial" oznacza właśnie, że **nikt** nie sprawuje custody — a art. 10 ust. 3 wymaga, by **ktoś konkretny** ją sprawował. To argument *przeciwko*, nie *za*. |
| **MPC** | **TAK, warunkowo** | MPC to technika, nie podmiot. Spełnia art. 10 ust. 3, **jeżeli** uczestnikiem posiadającym wystarczające udziały klucza jest CASP z uprawnieniem custody i to on sprawuje „control" w rozumieniu art. 3 ust. 1 pkt 17. |
| **Multisig** | **TAK, warunkowo** | Jak wyżej. Wymagany próg: udział CASP musi być **konieczny** do przesunięcia środków (np. 2-of-2 CASP+VENT, albo CASP z prawem weta). Konfiguracja, w której VENT + dowolny inny sygnatariusz mogą ruszyć środki bez CASP → CASP nie ma kontroli → **niezgodność**. `UNCLEAR` co do dokładnego progu — brak wytycznych ESMA. |
| **Issuer-controlled smart contract** | **NIE — i gorzej niż NIE** | Jeżeli VENT ma admin key / upgrade / pause / sweep, to VENT „controls the means of access to crypto-assets **on behalf of clients**" → art. 3 ust. 1 pkt 17 → **usługa custody świadczona bez zezwolenia**, art. 59 MiCA. Naruszenie cięższe niż samo art. 10. |
| **Neutral smart contract (bez admina, bez upgrade)** | **NIE, ale bezpieczniej** | Nie spełnia art. 10 ust. 3, ale **nie kreuje** ryzyka nielicencjonowanego custody po stronie VENT. To jest właściwa konfiguracja techniczna wewnątrz modelu B. |

## 2.4 Argument teleologiczny (za escrow) — pełna wersja i jego granice

**Argumenty ZA dopuszczalnością escrow:**

1. **Effet utile / cel przepisu.** Celem jest ochrona nabywcy przed zagarnięciem środków i zapewnienie wykonalności prawa odstąpienia. Immutable escrow z on-chain per-purchaser accounting i wymuszonym refundem realizuje ten cel **silniej** niż umowa z CASP, bo eliminuje ryzyko kontrahenta i ryzyko niewypłacalności custodiana.
2. **Neutralność technologiczna.** MiCA deklaruje neutralność technologiczną; wykładnia wykluczająca rozwiązania kryptograficzne z reżimu pisanego *dla* kryptoaktywów jest wewnętrznie niespójna.
3. **Proporcjonalność (art. 5 TUE).** Wymóg zaangażowania CASP przy raise €5–9 mln generuje koszt i ryzyko koncentracji nieproporcjonalne do celu, jeśli cel jest już osiągnięty.
4. **Brak wyraźnego zakazu.** Art. 10 ust. 3 nie zawiera sankcji nieważności ani zakazu stosowania dodatkowych/alternatywnych mechanizmów.

**Dlaczego to nie wystarcza:**

1. **Granica wykładni celowościowej.** TSUE dopuszcza wykładnię celowościową, ale **nie *contra legem***. Przy przepisie zawierającym zamkniętą listę podmiotów wykładnia celowościowa nie może listy rozszerzyć — mogłaby co najwyżej zawęzić zakres zastosowania.
2. **Ścisła wykładnia reżimów licencyjnych.** W prawie rynków finansowych UE listy podmiotów uprawnionych do wykonywania funkcji zastrzeżonych są interpretowane ściśle. Argument „nasze rozwiązanie jest lepsze" nie jest w tym reżimie argumentem prawnym — jest argumentem *de lege ferenda*.
3. **Argument „nikt nie ma custody" jest samobójczy.** Art. 10 ust. 3 wymaga, by środki **były w custody u wskazanego podmiotu**. Wykazanie, że nikt custody nie sprawuje, jest wykazaniem, że obowiązek **nie został wykonany** — nie że nie istnieje.
4. **Brak jakiegokolwiek wsparcia w Level 2/Level 3.** Nie zidentyfikowałem żadnego Q&A ESMA, żadnych Guidelines, żadnego RTS/ITS, żadnego stanowiska Komisji ani żadnego NCA, które dopuszczałyby escrow jako substytut. Nie zidentyfikowałem też żadnego, który by go wyraźnie zakazywał — **to jest luka interpretacyjna, nie zielone światło**.
5. **Widoczność w procedurze notyfikacji.** White paper (Annex I, część o ofercie) musi opisywać safeguarding arrangements. Model bez CASP będzie **widoczny dla AFM już na etapie notyfikacji z art. 8**. To nie jest ryzyko „ciche" — to ryzyko, które regulator zobaczy przed startem.

**Konkluzja sekcji 2:**
> Istnieje **argument obronny** (arguable position) na rzecz escrow, wystarczający, by w razie sporu obniżyć wymiar sankcji i wykazać dobrą wiarę. **Nie istnieje** interpretacja pozwalająca uznać model bez CASP za *zgodny* z art. 10 ust. 3 z rozsądnym poziomem pewności. Nie rekomendowałbym launchu na tej podstawie.

---

# 3. ART. 10 UST. 4 — OFERTA CIĄGŁA (CONTINUOUS / OPEN-ENDED)

## 3.1 Mechanika przepisu

> *„Where the offer to the public has no time limit, the offeror shall comply with paragraph 3 of this Article **until the right of withdrawal of the retail holder pursuant to Article 13 has expired**."*

Konsekwencje, punkt po punkcie:

| Pytanie | Odpowiedź |
|---|---|
| **Jak długo środki konkretnego nabywcy muszą być safeguarded?** | Do wygaśnięcia jego prawa odstąpienia = **14 dni kalendarzowych**. Obowiązek jest **per-nabywca**, nie per-oferta. |
| **Od którego momentu liczy się okres?** | Art. 13 ust. 2: **od daty zawarcia umowy** przez retail holdera („date of the agreement… to purchase"), a **nie** od daty rozliczenia on-chain ani od daty dostarczenia tokena. Dla VENT: moment zaakceptowania T&C i wykonania transakcji zakupu. |
| **Kiedy środki mogą zostać zwolnione emitentowi?** | Po upływie 14 dni od zawarcia umowy — dla tej konkretnej wpłaty. |
| **Jak art. 10 ust. 4 współdziała z art. 13?** | Art. 10 ust. 4 **nie ma własnego zegara** — jest w pełni pochodny od art. 13. Długość safeguardingu = długość okna odstąpienia. |
| **Jak działa 14-dniowy withdrawal period?** | 14 **dni kalendarzowych** (nie roboczych), bez opłat, bez podania przyczyny (art. 13 ust. 2). Zwrot: bez zbędnej zwłoki, max 14 dni od poinformowania (art. 13 ust. 3). |
| **Co, jeśli token zostanie admitted to trading?** | Art. 13 ust. 4 `[VERIFY]`: prawo odstąpienia **nie przysługuje**, gdy kryptoaktywa zostały dopuszczone do obrotu **przed** nabyciem. Dla zakupów po dopuszczeniu → brak withdrawal → przy ofercie bezterminowej okres safeguardingu = **zero**. |
| **Czy art. 13 ust. 4 wpływa na safeguarding?** | **Tak, pośrednio i mocno** — przez art. 10 ust. 4. Ale **tylko przy ofercie bezterminowej**. Przy ofercie terminowej art. 10 ust. 3 obowiązuje niezależnie od tego, czy withdrawal przysługuje. |
| **Czy brak prawa withdrawal = brak okresu safeguardingu?** | **`UNCLEAR / REQUIRES NCA OR COUNSEL CONFIRMATION`** — zob. 3.2. |
| **Czy continuous offering może trwać miesiącami/latami?** | Co do zasady **tak** (MiCA nie zakazuje ofert bezterminowych; art. 10 ust. 2 wprost je przewiduje, nakładając miesięczny raporting). **ALE dla VENT — nie**, zob. 3.3. |

## 3.2 `UNCLEAR` — czy brak withdrawal zeruje safeguarding?

**Argument ZA (zerowanie):** Art. 10 ust. 4 wiąże obowiązek wyłącznie z upływem prawa odstąpienia. Jeśli prawo w ogóle nie powstaje (nabywca nie jest retail holderem; token dopuszczony do obrotu przed zakupem), to okres, przez który należy „comply with paragraph 3", ma długość zero. Wykładnia językowa jednoznaczna.

**Argument PRZECIW:** (i) prowadzi do absurdalnego rezultatu — oferta bezterminowa skierowana do profesjonalistów byłaby całkowicie zwolniona z safeguardingu, podczas gdy identyczna oferta terminowa nie; (ii) art. 10 ust. 3 zawiera samodzielny obowiązek „effective arrangements to monitor and safeguard", którego art. 10 ust. 4 nie uchyla, a jedynie **ogranicza czasowo**; obowiązek o długości zero jest sprzeczny z jego treścią; (iii) NCA może zastosować wykładnię funkcjonalną i uznać konstrukcję za obejście.

**Rekomendacja:** nie budować modelu finansowego na tej interpretacji. Traktować jako argument rezerwowy.

## 3.3 KRYTYCZNE DLA VENT — limit 12 miesięcy dla utility tokenów nieoperacyjnych

Art. 4 MiCA `[VERIFY: ust. 6]`:

> *„Where the offer to the public of the crypto-asset other than an asset-referenced token or e-money token concerns a **utility token providing access to goods and services that do not yet exist or are not yet in operation**, the **duration of the offer to the public as described in the crypto-asset white paper shall not exceed 12 months** from the date of publication of the crypto-asset white paper."*

**Skutki dla VENT (zakładając, że platforma/usługa VENT nie jest jeszcze operacyjna w chwili oferty):**

1. White paper **musi** podać czas trwania oferty, i to nie dłuższy niż 12 miesięcy od publikacji WP.
2. Oferta z podanym czasem trwania jest **ofertą z time limit** w rozumieniu art. 10.
3. Zatem stosuje się **art. 10 ust. 3** (pełny safeguarding), a **art. 10 ust. 4 nie ma zastosowania**.
4. Dodatkowo art. 13 ust. 5 `[VERIFY]`: prawo odstąpienia nie może być wykonane po zakończeniu okresu subskrypcji.

> **KONKLUZJA: „continuous / open-ended public offering bez określonego terminu zakończenia" nie jest dla VENT dostępną konstrukcją prawną, dopóki usługa nie jest operacyjna.** To bezpośrednio odpowiada na punkt 15 briefu („czy oferta bez time limitu jest dopuszczalna dla naszego rodzaju utility tokena") — **nie jest**.
>
> Odwrotnie: **jeśli usługa JEST operacyjna**, otwiera się droga znacznie lepsza niż oferta ciągła — pełne wyłączenie z Tytułu II (sekcja 11, Option D1).

## 3.4 `UNCLEAR` — moment zwolnienia środków przy ofercie TERMINOWEJ

Art. 10 ust. 3 **nie określa** momentu, w którym safeguarding się kończy. To luka o dużym znaczeniu cash-flow.

**Wykładnia A (konserwatywna, prawdopodobna dla NCA):** środki pozostają w custody **do zakończenia okresu subskrypcji** (bo obowiązek dotyczy „funds raised **during the offer**", a offeror publikuje „result of the offer" po jej zakończeniu — art. 10 ust. 1), **plus** okres potrzebny na obsługę pozostałych praw odstąpienia. Przy ofercie 12-miesięcznej oznacza to brak dostępu do kapitału przez ~12 miesięcy. **Killer dla modelu finansowego.**

**Wykładnia B (liberalna):** skoro art. 10 ust. 4 dla ofert bezterminowych ustala jako punkt odniesienia wygaśnięcie prawa odstąpienia, to *a fortiori* przy ofercie terminowej ochrona indywidualnego nabywcy nie musi trwać dłużej niż jego okno odstąpienia; zwolnienie rolling po 14 dniach. Wsparcie: art. 13 ust. 5 wygasza prawo odstąpienia z końcem subskrypcji, więc po 14 dniach od zakupu nabywca nie ma już żadnego roszczenia zwrotnego, a dalsze blokowanie środków nie służy żadnemu celowi ochronnemu.

**Ocena:** Wykładnia B jest merytorycznie mocniejsza, ale **nie została potwierdzona przez żadne Q&A ESMA ani stanowisko NCA**. `UNCLEAR / REQUIRES NCA OR COUNSEL CONFIRMATION`.

**Praktyczne obejście ryzyka (legalne, nie obchodzące prawa):**
> Podziel raise na **sekwencyjne krótkie transze subskrypcyjne** — np. 4–6 okien po 30–45 dni, każde z własnym terminem zakończenia, każde domknięte publikacją wyniku z art. 10 ust. 1. Po zamknięciu okna: brak wątpliwości, że oferta się skończyła; withdrawal wygasa (art. 13 ust. 5); safeguarding kończy się. **Kapitał staje się dostępny co ~45–60 dni zamiast po 12 miesiącach, przy wykładni konserwatywnej.** To eliminuje ryzyko UNCLEAR bez potrzeby rozstrzygania sporu interpretacyjnego.
> Uwaga: kolejne transze mogą wymagać modyfikacji WP w trybie art. 12; zaprojektuj WP tak, by przewidywał transze od początku.

## 3.5 TIMELINE — jeden przykładowy zakup

**Założenia:** nabywca = retail holder z UE, zakup 10 000 USDC, blockchain Base, escrow smart contract + CASP (Model B). „D" = dzień kalendarzowy.

### Scenariusz 1 — oferta BEZ time limit (art. 10 ust. 4) *— dla VENT prawdopodobnie niedostępny, zob. 3.3*

| Dzień | Zdarzenie | Status 10 000 USDC | Podstawa prawna |
|---|---|---|---|
| **DAY 0** | Nabywca akceptuje T&C, KYC pass, wysyła 10 000 USDC. Smart contract zapisuje `purchaser → amount → timestamp`. Rozpoczyna bieg okno odstąpienia. | **LOCKED** — w escrow pod kontrolą CASP. Emitent bez dostępu. | Art. 13 ust. 2 (start okna); art. 10 ust. 3+4 |
| **DAY 1** | Token VENT może być zaalokowany/dostarczony (dostawa tokena nie skraca okna odstąpienia). | LOCKED | Art. 13 ust. 2 |
| **DAY 2–13** | Nabywca może w każdej chwili wywołać `refund()`. Zwrot musi nastąpić bez zbędnej zwłoki. | LOCKED — refundowalne 1:1 | Art. 13 ust. 2–3 |
| **DAY 14** | **Ostatni dzień okna odstąpienia** (14 dni kalendarzowych od DAY 0). Jeśli odstąpienie zgłoszone tego dnia — zwrot do DAY 28. | LOCKED do końca dnia | Art. 13 ust. 2–3 |
| **DAY 15** | Okno wygasło. Obowiązek z art. 10 ust. 3 wygasa **dla tej wpłaty**. Automatyczny release do VENT Treasury Multisig. | **RELEASED** → Treasury | Art. 10 ust. 4 |
| DAY 15+ | Obowiązek z art. 10 ust. 2 trwa: publikacja liczby jednostek w obiegu **co najmniej co miesiąc**. | — | Art. 10 ust. 2 |

**Uwaga o DAY 28:** jeśli nabywca zgłosi odstąpienie w DAY 14, VENT ma obowiązek zwrotu do DAY 28. Środki zostaną już zwolnione w DAY 15 → **zwrot musi być pokryty z Treasury**. Zaprojektuj bufor refundowy (np. 5–10% raise pozostawione w escrow lub w dedykowanym rezerwuarze) — inaczej ryzyko naruszenia art. 13 ust. 3 przy skoku odstąpień.

### Scenariusz 2 — oferta Z time limit, transza 45-dniowa (realny model VENT)

| Dzień | Zdarzenie | Status USDC |
|---|---|---|
| **DAY 0** | Otwarcie transzy T1 (subskrypcja DAY 0–45, termin ogłoszony w WP) | — |
| **DAY 12** | Nabywca kupuje za 10 000 USDC; timestamp zapisany | **LOCKED** (CASP custody) |
| **DAY 26** | Upływ 14 dni od zakupu → withdrawal tego nabywcy wygasa | LOCKED (wykładnia A) / zwalnialne (wykładnia B) |
| **DAY 45** | **Zamknięcie transzy T1.** Wszystkie prawa odstąpienia w T1 wygasają najpóźniej tu (art. 13 ust. 5) | LOCKED |
| **DAY 46–47** | Reconciliation: on-chain ledger vs. rejestr CASP vs. księgi VENT | LOCKED |
| **DAY ~50** | Publikacja wyniku oferty T1 (art. 10 ust. 1); release z escrow | **RELEASED** → Treasury |
| **DAY 50** | Otwarcie transzy T2 | cykl się powtarza |

**Efekt:** przy 5 transzach × 45 dni raise trwa ~9 miesięcy (mieści się w limicie 12 mies.), a kapitał uwalnia się **pięć razy**, a nie raz na końcu. Zgodność z wykładnią konserwatywną **bez** potrzeby polegania na spornej wykładni B.

---

# 4. SMART CONTRACT VS CASP — trzy modele

## MODEL A — Investor → Smart Contract Escrow → VENT Treasury (bez CASP)

| Kryterium | Ocena |
|---|---|
| **Legal feasibility** | **Niska.** Brak podstawy w tekście art. 10 ust. 3. Brak wsparcia w Level 2/3. |
| **Art. 10 compliance** | **Niezgodny** wg wykładni literalnej. Argument obronny istnieje (sekcja 2.4), ale nie jest to compliance. |
| **Art. 75 implications** | Art. 75 nie stosuje się bezpośrednio (nikt nie jest CASP). **Ale**: jeśli VENT ma jakiekolwiek uprawnienia nad kontraktem → art. 3 ust. 1 pkt 17 + art. 59 → nielicencjonowana usługa custody. To **poważniejsze** naruszenie niż art. 10. |
| **Operational complexity** | Najniższa technicznie, ale wysoka prawnie (potrzeba memo obronnego, disclosures, plan reakcji na NCA). |
| **Custody characterization** | Przy prawdziwie immutable/no-admin: **nikt** nie sprawuje custody. Skutek uboczny: brak prawnie rozpoznawalnej segregacji majątkowej → problem w razie upadłości VENT lub sporu o środki. |
| **Smart-contract requirements** | Immutable, zero admin/upgrade/pause/sweep, zero uprawnień VENT, audyt ≥2 firm, formal verification refund/release, publiczna weryfikacja, per-purchaser accounting, timelock. |
| **Główne ryzyka** | (1) Zakwestionowanie przez AFM już na etapie notyfikacji WP (art. 8) — safeguarding musi być opisany w WP; (2) nakaz zawieszenia oferty (art. 94); (3) sankcja administracyjna + publikacja decyzji (art. 112); (4) jeśli WP twierdzi „zgodne z art. 10" — odpowiedzialność cywilna z art. 15; (5) ryzyko reklasyfikacji jako nielicencjonowany CASP. |

**Werdykt: NIE REKOMENDOWANY.**

## MODEL B — Investor → Smart Contract Escrow → CASP ma prawa/kontrolę/klucz → VENT Treasury

| Kryterium | Ocena |
|---|---|
| **Legal feasibility** | **Wysoka** — pod warunkiem, że kontrola CASP jest realna, nie fasadowa. |
| **Art. 10 compliance** | **Zgodny**, jeśli CASP z uprawnieniem „custody and administration of crypto-assets on behalf of clients" faktycznie „keeps in custody" środki w okresie ochronnym. |
| **Art. 75 implications** | Stosuje się w pełni do CASP: umowa (ust. 1), register of positions (ust. 3), segregacja (ust. 7), odpowiedzialność z capem do wartości rynkowej (ust. 8). VENT musi wynegocjować, kto jest „klientem" — zob. sekcja 10. |
| **Operational complexity** | **Średnio-wysoka.** Negocjacja z CASP, integracja kluczy/MPC z kontraktem, procedury release/refund, reconciliation, testy. Realny czas: 2–4 miesiące. |
| **Custody characterization** | **CASP sprawuje custody** (kontrola nad means of access). VENT nie sprawuje — kluczowe, by VENT nie miał żadnego samodzielnego uprawnienia do przesunięcia środków. |
| **Smart-contract requirements** | Kontrakt musi *uznawać* rolę CASP: release wymaga podpisu/udziału CASP (lub CASP ma weto), refund wykonalny przez nabywcę **bez** zgody VENT, brak funkcji upgrade po stronie VENT, ewentualny upgrade tylko za zgodą CASP + timelock. |
| **Główne ryzyka** | (1) **`UNCLEAR`: jaki poziom kontroli CASP wystarcza** — brak wytycznych ESMA; (2) większość CASP odmówi trzymania środków w *cudzym* kontrakcie i zażąda własnej infrastruktury; (3) CASP może żądać, by to on był stroną wobec nabywców (KYC, register) — co zwiększa koszt i tarcie UX; (4) koncentracja ryzyka kontrahenta. |

**Werdykt: REKOMENDOWANY jako model bazowy** (jeśli Option D1 niedostępny).

## MODEL C — Investor → CASP custody wallet → release → VENT Treasury

| Kryterium | Ocena |
|---|---|
| **Legal feasibility** | **Najwyższa.** Model wprost przewidziany przez art. 10 ust. 3 lit. b. |
| **Art. 10 compliance** | **Bezsporny.** |
| **Art. 75 implications** | Pełne zastosowanie, ale w kształcie, dla którego CASP mają gotowe procedury. |
| **Operational complexity** | Niska technicznie po stronie VENT (brak custom escrow), ale wysoka procesowo: onboarding VENT jako klienta, AML/KYC, umowa custody, procedury instrukcji. |
| **Custody characterization** | Jednoznacznie CASP. |
| **Smart-contract requirements** | Brak (albo tylko kontrakt dystrybucji tokena, poza ścieżką środków). |
| **Główne ryzyka** | (1) **Koszt** — opłaty setup + AUM + per-transaction; (2) **utrata narracji „trustless"** — istotne marketingowo dla projektu crypto; (3) ryzyko kontrahenta i operacyjne CASP; (4) możliwa odmowa onboardingu emitenta z Wyoming (risk appetite CASP wobec ICO). |

**Werdykt: fallback, jeśli negocjacje Modelu B upadną.**

## 4.1 Porównanie skrócone

| | A | B | C |
|---|---|---|---|
| Zgodność z art. 10 ust. 3 | ✗ | ✓ (warunkowo) | ✓ |
| Ryzyko nielicencjonowanego custody po stronie VENT | wysokie (jeśli admin key) | niskie | zerowe |
| Narracja trustless / on-chain | pełna | częściowa | brak |
| Koszt | ~0 | średni | wysoki |
| Ryzyko zablokowania oferty przez AFM | wysokie | niskie | znikome |

---

# 5. „ON BEHALF OF CLIENTS" — analiza pogłębiona

## 5.1 Pytanie: kto sprawuje custody, gdy środki kontroluje wyłącznie kod?

Definicja (art. 3 ust. 1 pkt 17 `[VERIFY]`): *„the safekeeping or **controlling**, **on behalf of clients**, of crypto-assets or of the means of access to such crypto-assets"*.

Trzy przesłanki kumulatywnie: **(i)** safekeeping albo controlling, **(ii)** przedmiot = kryptoaktywa albo means of access, **(iii)** „on behalf of clients".

**Analiza dla immutable escrow bez admina:**

| Podmiot | Czy sprawuje custody? | Uzasadnienie |
|---|---|---|
| **VENT (emitent)** | **Nie** — jeśli i tylko jeśli nie ma żadnego admin key, upgrade, pause, sweep, ani wpływu na parametry po deploymencie. Sam fakt napisania i wdrożenia kontraktu **nie jest** sprawowaniem kontroli po deploymencie — ale bywa **kwestionowany**, bo VENT zdefiniował warunki release i jest jedynym beneficjentem. `UNCLEAR` przy jakiejkolwiek pozostałości uprawnień. |
| **CASP** | Nie — nie występuje w modelu A. |
| **Nabywca** | Nie w rozumieniu MiCA — sprawuje kontrolę nad *własnymi* aktywami, nie „on behalf of clients". Przesłanka (iii) niespełniona (self-custody nie jest usługą). |
| **Deployer / audytor / relayer** | Nie, o ile nie ma uprawnień. |
| **Smart contract** | **Nie może** — nie jest osobą; MiCA nie zna kategorii „autonomiczny podmiot obowiązany". |

**Wniosek: w prawidłowo zaprojektowanym immutable escrow custody nie sprawuje NIKT.**

## 5.2 Czy można argumentować, że nabywca zachowuje kontrolę ekonomiczną do końca withdrawal period?

**Tak — i jest to argument merytorycznie poprawny.** Dopóki trwa okno z art. 13, nabywca ma jednostronne, bezwarunkowe, technicznie wykonalne prawo do zwrotu 1:1. Ekonomicznie środki nie opuściły jego majątku bezwarunkowo; VENT ma jedynie ekspektatywę. Można to opisać jako warunek zawieszający wykonany kodem.

**Ale to argument o innym przedmiocie niż art. 10 ust. 3.** Wzmacnia on tezę, że:
- VENT nie „zebrał" jeszcze definitywnie środków,
- VENT nie sprawuje custody,
- nabywca nie jest narażony na ryzyko kredytowe emitenta.

**Nie wzmacnia** tezy, że obowiązek umieszczenia środków u instytucji kredytowej albo CASP został wykonany.

## 5.3 Czy to ma jakiekolwiek znaczenie dla art. 10?

**Trzy poziomy odpowiedzi:**

1. **Dla ustalenia, czy obowiązek z art. 10 ust. 3 został wykonany — NIE.** Obowiązek jest pozytywny („shall ensure that… are kept in custody by [X]"). Wykazanie, że nikt nie sprawuje custody, jest dowodem niewykonania, nie wykonania. To jest **najważniejsza pojedyncza konkluzja tej sekcji** i bezpośrednia odpowiedź na centralne pytanie briefu.

2. **Dla ustalenia, czy VENT narusza art. 59 (nielicencjonowana usługa) — TAK, bardzo.** To jest argument, który realnie chroni VENT przed *drugim*, cięższym zarzutem. Dlatego nawet w Modelu B kontrakt musi być zaprojektowany jako *neutral*, bez admin keys po stronie VENT.

3. **Dla wymiaru sankcji — TAK.** Art. 111 ust. 5 `[VERIFY]` nakazuje NCA uwzględniać m.in. wagę i czas trwania naruszenia, stopień odpowiedzialności, poniesione przez inwestorów straty. Escrow, który faktycznie ochronił środki i nie wyrządził nikomu szkody, jest silną okolicznością łagodzącą — realistycznie różnica między nakazem naprawczym a dotkliwą karą.

## 5.4 Ryzyko upadłościowe — argument, o którym łatwo zapomnieć

Non-custodial escrow chroni przed **zagarnięciem** środków, ale tworzy nowe pytanie: **czyją własnością są USDC leżące pod adresem kontraktu w razie upadłości VENT (Chapter 7/11 w USA) albo sporu?** Brak prawnie rozpoznanego dzierżyciela oznacza brak oczywistej ścieżki dochodzenia roszczeń. Model z CASP daje coś, czego kod nie daje: **prawnie wyodrębnioną masę i podmiot odpowiedzialny** (art. 70, art. 75 ust. 7–8). Regulator to widzi i będzie to podnosił.

---

# 6. ESMA — co udało się ustalić, a czego NIE MA

## 6.1 Materiały istotne, potwierdzone

| Materiał | Data | Co potwierdza |
|---|---|---|
| **ESMA Q&A 2293** | — | Recital 87: *„the exchange of crypto-assets for funds or other crypto-assets when made by the issuer or offeror should not be a crypto-asset service"* → **VENT sprzedając własny token nie świadczy usługi exchange i nie potrzebuje z tego tytułu licencji CASP.** Wyłączenie dotyczy **wyłącznie exchange** — **nie obejmuje custody ani transfer services.** |
| **ESMA Q&A 2071** (20.06.2024) | 2024 | Transfer services (art. 3 ust. 1 pkt 26) to **samodzielna usługa** z art. 3 ust. 1 pkt 16 lit. j; jeśli transfer jest elementem innej usługi, i tak stosuje się art. 82. Istotne: automatyczne przesunięcia w escrow nie powinny być projektowane jako świadczenie usługi transferu na rzecz klientów. |
| **ESMA Q&A 2608** | — | Użycie kryptoaktywów klientów do pre-fundingu = **sub-custody** → pełne zastosowanie art. 70 i 75. Pokazuje **szeroką, funkcjonalną wykładnię custody przez ESMA** — to zła wiadomość dla argumentu „to nie jest custody, to escrow". |
| **ESMA Guidelines on reverse solicitation under MiCA** (ESMA35-1872330276-2030) | 02.2025 | Bardzo wąskie rozumienie reverse solicitation. Istotne dla Option D3 (geofencing). |
| **ESMA Guidelines on maintenance of systems and security access protocols** (ESMA75-223375936-6132) | 02.2025 | Wydane do **art. 14 ust. 1 lit. d MiCA** i adresowane m.in. do **offerorów** (art. 3 ust. 1 pkt 13). **Bezpośrednio relewantne dla smart contractu VENT** — polityki i procedury bezpieczeństwa systemów. Do wdrożenia niezależnie od wybranego modelu. |
| **ESMA Public Statement — koniec okresu przejściowego MiCA** (ESMA75-113276571-1710) | 06.2026 | Wezwanie do nieautoryzowanych CASP; kontekst egzekwowania. |

## 6.2 Czego NIE MA — istotne ustalenie negatywne

Przeszukałem ESMA Q&A, ISRB, Guidelines, Final Reports, technical standards, statements i opinions pod kątem: *Article 10 safeguarding*, *token offering escrow*, *smart contract escrow*, *primary issuance*, *issuer custody*, *non-custodial*, *crypto-asset custody*, *withdrawal period*, *continuous offering*.

> **Nie zidentyfikowałem żadnego materiału ESMA (Q&A, Guidelines, Final Report, RTS/ITS, supervisory briefing, opinion) odnoszącego się do art. 10 ust. 3–4 w kontekście smart-contract escrow, non-custodial safeguarding, ani szerzej — do sposobu wykonania obowiązku safeguardingu przy ofercie pierwotnej.**

**Interpretacja tego faktu — uczciwie, w obie strony:**
- *Za VENT:* brak wyraźnego zakazu; brak ustalonej praktyki nadzorczej, którą VENT by naruszał; obszar niedoregulowany.
- *Przeciw VENT:* brak jakiegokolwiek oparcia dla stanowiska odbiegającego od literalnego brzmienia; w razie sporu VENT nie będzie mógł powołać się na żaden materiał L2/L3; ciężar argumentacji w całości po stronie VENT.

**Rekomendacja procesowa:** to jest dokładnie sytuacja, w której warto rozważyć **wystąpienie o nieformalne stanowisko do AFM** (Innovation Hub / pre-notification meeting) **przed** notyfikacją WP. AFM nie wydaje wiążących interpretacji, ale sygnał z takiej rozmowy jest wart więcej niż każda opinia prywatna — i jest tani.

## 6.3 `UNCLEAR` — otwarte pytania, na które ESMA nie odpowiedziała

1. Czy CASP musi *fizycznie posiadać* klucze, czy wystarczy współkontrola (multisig / MPC)? **Brak wytycznych.**
2. Czy „klientem" CASP w rozumieniu art. 10 ust. 3 lit. b jest offeror czy nabywcy? **Brak wytycznych.**
3. Kiedy dokładnie kończy się safeguarding przy ofercie terminowej? **Brak wytycznych.**
4. Czy escrow bez operatora może być uznany za spełniający funkcję safeguardingu? **Brak wytycznych.**

---

# 7. KOMISJA EUROPEJSKA

**Ustalenia:**

- **Brak** interpretacyjnego Q&A Komisji dedykowanego art. 10 MiCA. Komisja prowadzi mechanizm pytań interpretacyjnych do ESA, ale nie zidentyfikowałem odpowiedzi dotyczącej safeguardingu przy ofercie pierwotnej.
- **Level 2 (delegowane / wykonawcze):** akty delegowane i RTS/ITS przyjęte pod MiCA koncentrują się na: treści i formacie white papera, procedurach autoryzacji CASP, klasyfikacji kryptoaktywów, market abuse, sustainability indicators, transfer services. **Nie zidentyfikowałem RTS/ITS ani aktu delegowanego doprecyzowującego art. 10.** Art. 10 nie zawiera mandatu do Level 2 — co samo w sobie sugeruje, że prawodawca uznał normę za samowykonalną i niewymagającą doprecyzowania. **To argument przeciw wykładni rozszerzającej.**
- **EBA:** prowadzi konsultacje ws. metodyki ustalania kar pod MiCA (**EBA/CP/2026/10, 26.06.2026**) — istotne dla sekcji 12; dotyczy jednak głównie kompetencji EBA (ART/EMT), nie AFM/Tytuł II.

`UNCLEAR`: nie mogłem zweryfikować kompletności rejestru Level 2 bez dostępu do EUR-Lex/serwisów Komisji. **Do sprawdzenia przez doradcę: pełna lista aktów delegowanych i wykonawczych do MiCA na dzień launchu.**

---

# 8. AFM / HOLANDIA — i kwestia home Member State

## 8.1 Podział kompetencji w NL

- **AFM** — nadzór nad MiCAR w zakresie ofert publicznych kryptoaktywów innych niż ART/EMT (Tytuł II) oraz nad CASP (Tytuł V), w tym prowadzenie procedur white paperowych.
- **DNB** — wymogi ostrożnościowe, ART/EMT.
- Kanał notyfikacji white paperów: **`whitepapers.submission@afm.nl`**, z zachowaniem terminu **≥ 20 dni roboczych przed publikacją** (art. 8).
- **Brak prior approval** — AFM nie zatwierdza WP (art. 8). To NIE oznacza braku nadzoru: AFM może po notyfikacji użyć uprawnień z art. 94 (żądanie informacji, zawieszenie oferty, zakaz).
- Precedens praktyczny: **white paper Plume zarejestrowany w ESMA 19.06.2025 po weryfikacji przez AFM** — potwierdza, że AFM realnie obsługuje ścieżkę Tytułu II dla projektów zagranicznych.

## 8.2 KLUCZOWE — czy spółka z Wyoming może po prostu wybrać Holandię?

**ODPOWIEDŹ: NIE, nie „po prostu".**

Definicja home Member State (art. 3 ust. 1 pkt 33 `[VERIFY]`), w części dotyczącej offerora kryptoaktywów innych niż ART/EMT:

| Sytuacja offerora | Home Member State |
|---|---|
| **(a)** ma **siedzibę statutową (registered office) w UE** | państwo siedziby — **bez wyboru** |
| **(b)** brak siedziby w UE, ale ma **oddział/oddziały w UE** | państwo **wybrane przez offerora spośród państw, w których ma oddziały** |
| **(c)** **ma siedzibę w państwie trzecim i NIE ma oddziału w UE** | **państwo, w którym kryptoaktywa mają być po raz pierwszy oferowane publicznie**, **albo** — **do wyboru offerora** — **państwo, w którym złożono pierwszy wniosek o dopuszczenie do obrotu** |

VENT (Wyoming, brak oddziału w UE) → **lit. c**.

**Co to oznacza operacyjnie — trzy dostępne ścieżki:**

### Ścieżka 1 — „Holandia jako państwo pierwszej oferty publicznej"
Prawnie dopuszczalna, ale **wymaga, żeby to była prawda i żeby dało się to udowodnić**. Nie wystarczy deklaracja w notyfikacji. Trzeba:
- zaprojektować launch tak, by oferta **faktycznie** ruszyła najpierw w NL (geo-fencing, sekwencjonowanie dostępu, kolejność uruchamiania host Member States),
- utrzymać **dowody**: konfiguracja geo-blocking, logi, dokumentacja decyzji marketingowych, harmonogram, treść komunikacji,
- nie prowadzić wcześniej marketingu ani „soft launch" w innych państwach UE (art. 7 — marketing communications; przypadek Bitpanda pokazuje, że NCA egzekwują reżim marketingu).

**Ryzyko:** AFM może zakwestionować, jeśli faktyczna sekwencja była inna (np. wcześniejsza kampania w DE/PL, whitelist z użytkownikami z innych państw, Discord/Telegram bez geo-restrykcji). Konsekwencja: nieprawidłowe home MS → **notyfikacja bezskuteczna → oferta prowadzona bez ważnej notyfikacji WP** → naruszenie art. 4 ust. 1 lit. b.

### Ścieżka 2 — „pierwszy wniosek o admission to trading w NL"
Art. 3 ust. 1 pkt 33 lit. c daje **wyraźny wybór**: państwo pierwszego wniosku o dopuszczenie do obrotu. Jeśli VENT złoży pierwszy wniosek o dopuszczenie VENT do obrotu na platformie prowadzonej przez CASP z siedzibą/autoryzacją w NL, NL staje się home MS **z mocy wyboru**, bez konstrukcji dowodowej wokół „pierwszej oferty".
**Ale:** wymaga realnego procesu listingowego i współpracy operatora platformy; uruchamia też art. 5 i obowiązki związane z dopuszczeniem do obrotu.

### Ścieżka 3 — **REKOMENDOWANA: holenderskie B.V. jako offeror**
Powołanie spółki z siedzibą w NL (B.V.) występującej jako **offeror** (samodzielnie lub obok Wyoming jako issuer) przenosi VENT do **lit. a** — home MS = NL **z mocy prawa**, bez ryzyka dowodowego.

**Dodatkowe korzyści, niezależne od home MS:**
- czytelny adresat odpowiedzialności z **art. 15** (liability for white paper) — inwestor unijny i AFM mają podmiot w jurysdykcji UE; paradoksalnie **zwiększa to wiarygodność, a nie ryzyko**, bo bez tego AFM patrzy na ofertę jako na w pełni offshore;
- łatwiejszy onboarding u CASP i banków (KYC/AML wobec podmiotu unijnego);
- czystsze traktowanie VAT/CIT i umów z dostawcami w UE;
- brak potrzeby udowadniania geograficznej sekwencji launchu.

**Koszty/ryzyka:** substancja (zarząd, adres, księgowość), CIT w NL, ryzyko uznania za miejsce faktycznego zarządu; ~€10–30k rocznie. **W relacji do raise €5–9 mln to marginalne, a eliminuje realne ryzyko strukturalne.**

## 8.3 Czy MiCA wymaga establishment / branch / EU entity dla offerora Tytułu II?

**Nie.** W przeciwieństwie do CASP (art. 59 — wymóg podmiotu prawnego z siedzibą w UE i realną obecnością), Tytuł II **nie zawiera** wymogu unijnego establishmentu dla offerora kryptoaktywów innych niż ART/EMT. Art. 4 ust. 1 lit. a wymaga jedynie, by offeror był **osobą prawną** (`legal person`) — spółka z Wyoming to spełnia.

> **Uwaga:** to jest znana, świadoma luka MiCA, szeroko komentowana. Nie zakładaj, że jest stabilna — trzy NCA (AMF, FMA, CONSOB) publicznie wzywały do wzmocnienia europejskich ram nadzoru nad rynkiem kryptoaktywów, a przegląd MiCA jest w toku. **Struktura zbudowana wyłącznie na tej luce jest podatna na zmianę regulacyjną w horyzoncie 12–24 miesięcy.**

> **Uwaga 2 — Wyoming DAO LLC:** jeżeli rozważana jest forma DAO LLC, a nie zwykłej corporation/LLC, kwalifikacja jako „legal person" wymaga odrębnej analizy pod prawem UE. **Rekomendacja: zwykła Wyoming Corp lub LLC, nie DAO LLC.**

## 8.4 Oczekiwania nadzorcze AFM — czego się spodziewać

`UNCLEAR co do szczegółów` — nie mogłem odczytać materiałów afm.nl. Na podstawie praktyki AFM w innych obszarach i konstrukcji MiCA, realistycznie:

- AFM **przeczyta** opis safeguarding arrangements w WP. Model bez CASP zostanie zauważony.
- AFM prawdopodobnie zada pytania w trybie art. 94 (żądanie informacji) przed upływem 20 dni roboczych.
- AFM ma silną tradycję nadzoru zorientowanego na ochronę konsumenta i na „duty of care"; narracja „kod jest lepszy niż licencjonowany podmiot" nie jest narracją, która historycznie działa na AFM.
- AFM pobiera opłaty nadzorcze — uwzględnić w budżecie.

**Rekomendacja: pre-notification meeting z AFM.** Koszt niski, wartość informacyjna bardzo wysoka, a sam fakt proaktywnego kontaktu jest okolicznością łagodzącą, gdyby później doszło do sporu.

---

# 9. PRAKTYKA INNYCH PAŃSTW UE

## 9.1 Ustalenia ogólne

| NCA | Ustalenia istotne dla VENT |
|---|---|
| **AMF (Francja)** | Opublikowała procedury notyfikacji ofert publicznych i dopuszczeń do obrotu od wejścia MiCA. **Potwierdza wprost logikę lit. c**: offeror z państwa trzeciego może mieć AMF jako właściwy organ, jeśli ma oddział we Francji **albo**, przy braku oddziału w UE, jeśli **pierwsza oferta publiczna lub pierwszy wniosek o dopuszczenie** następuje we Francji. **To najlepsze dostępne potwierdzenie wykładni home MS przez NCA** — i pokazuje, że AFM zastosuje analogiczny test. |
| **FMA (Austria)** | **Pierwsza opublikowana finalna decyzja sankcyjna pod MiCA: Bitpanda, €70 000, 14.08.2026** — zob. sekcja 12. Naruszenia: spóźniona notyfikacja WP (poniżej 20 dni roboczych), marketing przed publikacją WP, braki obowiązkowych ujawnień. Tryb przyspieszony. Bitpanda zachowała zezwolenie. |
| **CONSOB (Włochy)** | Brak wydanych zezwoleń CASP wg stanu z 2025; wspólna inicjatywa z AMF i FMA na rzecz silniejszego nadzoru europejskiego. |
| **BaFin (Niemcy)** | Najwięcej autoryzowanych CASP w UE (27 wg 04.12.2025); reputacja najbardziej wymagającego nadzoru. Brak zidentyfikowanego stanowiska ws. art. 10. |
| **CNMV, CSSF, Central Bank of Ireland** | Brak zidentyfikowanych materiałów dot. art. 10 safeguarding / escrow. CBI opublikował materiały proceduralne o notyfikacjach WP pod Tytułem II. |

## 9.2 Precedensy dot. smart-contract escrow przy token offerings

> **Nie zidentyfikowałem żadnego precedensu — decyzji, wytycznej, stanowiska ani sprawy — w którym jakikolwiek NCA UE odniósłby się do smart-contract escrow jako mechanizmu wykonania art. 10 ust. 3 MiCA.**

To ustalenie negatywne o wysokiej istotności: VENT byłby **pierwszym testem** tej konstrukcji. Bycie pierwszym testem oznacza: brak przewidywalności, wysokie prawdopodobieństwo zapytań nadzorczych, ryzyko opóźnienia launchu, oraz — w razie negatywnego rozstrzygnięcia — **precedens publikowany** (art. 112).

---

# 10. MINIMAL ARTICLE 10 CASP ARCHITECTURE

*Sekcja przy założeniu konkluzji: CASP jest konieczny. Cel: CASP robi absolutne minimum.*

## 10.1 Podział ról — docelowy

| Funkcja | Kto |
|---|---|
| Frontend, UX, sale portal | **VENT** |
| KYC/AML orchestration (dostawca KYC pod kontrolą VENT) | **VENT** |
| Smart contracts (escrow, dystrybucja, vesting) | **VENT** |
| Token distribution | **VENT** |
| Per-purchaser accounting, księgi, raportowanie art. 10 ust. 1–2 | **VENT** |
| Treasury po release | **VENT** |
| Marketing, WP, notyfikacja art. 8 | **VENT** |
| **Custody środków w okresie ochronnym (art. 10 ust. 3 lit. b)** | **CASP — i tylko to** |

## 10.2 Odpowiedzi na pytania szczegółowe

**Q: Jakie dokładnie uprawnienie CASP jest wymagane?**
> **„Providing custody and administration of crypto-assets on behalf of clients"** — art. 3 ust. 1 pkt 16 lit. a, reżim operacyjny art. 75. Musi to być zezwolenie MiCA (albo notyfikacja podmiotu z art. 60 — instytucja kredytowa, firma inwestycyjna, EMI itd. — obejmująca tę usługę). **Nie wystarczy** zezwolenie na exchange, execution, placement czy transfer services.
> Jeśli VENT przyjmowałby **EUR/fiat** → alternatywnie **instytucja kredytowa** (art. 10 ust. 3 lit. a). Uwaga: **EMI nie jest instytucją kredytową** — nie zastąpi banku w lit. a.

**Q: Czy CASP musi posiadać środki?**
> Musi je **„keep in custody"**, co wg art. 3 ust. 1 pkt 17 oznacza **safekeeping ALBO controlling** kryptoaktywów **albo means of access**. Definicja jest **alternatywna** — „controlling the means of access" wystarcza. To jest prawna podstawa dla modelu multisig/MPC.

**Q: Czy wystarczy control / co-control?**
> **Prawdopodobnie tak, jeśli kontrola jest realna.** Test roboczy: **czy bez udziału CASP środki mogą zostać przesunięte do VENT?** Jeśli TAK → CASP nie sprawuje kontroli → **niezgodność**. Jeśli NIE → argument za zgodnością jest mocny.
> **`UNCLEAR / REQUIRES NCA OR COUNSEL CONFIRMATION`** — brak wytycznych ESMA co do progu; branża toczy tę dyskusję („Custody under MiCA: who's really in control?"). Sam CASP też musi zaakceptować tę kwalifikację, bo z niej wynika jego odpowiedzialność z art. 75 ust. 8.

**Q: Czy CASP może używać naszego smart contractu?**
> **Prawnie — tak.** MiCA nie wskazuje technologii custody. **Praktycznie — większość CASP odmówi**, bo art. 75 ust. 8 nakłada na CASP odpowiedzialność za utratę aktywów wskutek incydentu przypisywalnego CASP, a przyjęcie cudzego kontraktu przenosi na CASP ryzyko techniczne, którego nie kontroluje. Jeśli CASP się zgodzi, zażąda: audytów (min. 2 niezależne), formal verification ścieżek refund/release, prawa weta wobec upgrade'ów, bug bounty, ubezpieczenia, oraz wpisania ograniczenia odpowiedzialności do umowy.

**Q: Czy CASP może być signerem multisig?**
> **Tak** — to najbardziej realistyczna „minimal" konstrukcja. Wymagane: konfiguracja, w której **podpis CASP jest konieczny** dla release do Treasury. Rekomendowana: **2-of-2 (CASP + VENT) dla release**, przy czym **refund do nabywcy wykonalny bez udziału VENT** (inaczej VENT może zablokować prawo z art. 13 → naruszenie art. 13 i art. 14).
> **Odradzam** 2-of-3 z VENT + niezależnym third-party bez CASP — CASP traci kontrolę → cel niespełniony.

**Q: Czy CASP może być jednym z uczestników MPC?**
> **Tak, przy tej samej logice** — udziały klucza CASP muszą być konieczne do rekonstrukcji podpisu release. Threshold musi być tak dobrany, by koalicja bez CASP nie mogła podpisać.

**Q: Czy CASP może obsługiwać automatyczne release?**
> **Tak, warunkowo.** Można zaprogramować release jako automatyczny po upływie okresu ochronnego, **pod warunkiem że CASP zachowuje kontrolę do momentu release** (np. wymaga jego podpisu, albo CASP ma uprawnienie do zablokowania release). W pełni automatyczny release bez jakiegokolwiek udziału CASP oznacza, że CASP nie sprawował kontroli — co podważa cały model.
> **Kompromis techniczny:** timelock + wymóg podpisu CASP, przy czym CASP zobowiązuje się umownie do podpisania w ciągu X godzin po spełnieniu warunków, chyba że zachodzi przesłanka wstrzymania (AML flag, spór, instrukcja NCA). Zachowuje automatyzm operacyjny przy zachowaniu prawnej kontroli.

**Q: Czy środki mogą pozostawać on-chain?**
> **Tak.** Custody kryptoaktywów jest z natury on-chain. MiCA nie wymaga „wyprowadzenia" środków do systemu CASP — wymaga, by CASP sprawował custody. Adres kontrolowany przez CASP na Base spełnia to tak samo jak adres w jego głównej infrastrukturze.

**Q: Czy CASP musi prowadzić indywidualną ewidencję klientów?**
> **`UNCLEAR`.** Art. 75 ust. 3 wymaga register of positions **w imieniu każdego klienta CASP**. Kluczowe pytanie: kto jest klientem CASP?
> - **Model I — klientem jest VENT:** CASP prowadzi jedną pozycję (VENT), VENT prowadzi ewidencję per-nabywca on-chain. **Najtańszy, najprostszy, zgodny z brzmieniem art. 10 ust. 3** (przepis nie precyzuje, czyim klientem mają być posiadacze). Ryzyko: NCA może uznać, że sens art. 10 ust. 3 wymaga, by ochrona działała na rzecz nabywców, a nie offerora.
> - **Model II — klientami są nabywcy:** CASP onboarduje każdego nabywcę, prowadzi register per-nabywca. Pełna zgodność, ale drastycznie wyższy koszt i tarcie UX (każdy nabywca przechodzi KYC CASP).
> **Rekomendacja: Model I, z on-chain per-purchaser accounting po stronie VENT i klauzulą umowną, że środki są trzymane na rzecz nabywców do upływu okresu ochronnego (trust-like / segregated designation).** Wymaga potwierdzenia przez doradcę i akceptacji CASP.

**Q: Jakie umowy są potrzebne?**
1. **Custody & Escrow Agreement** (VENT ↔ CASP) — art. 75 ust. 1–2: zakres usługi, opis polityki custody, sposób przechowywania, means of access, procedura instrukcji, opłaty.
2. **Release & Refund Protocol** (załącznik techniczny) — warunki i terminy release, SLA na wykonanie refundu (musi wspierać art. 13 ust. 3: max 14 dni od zgłoszenia), procedura awaryjna.
3. **Smart Contract Rider** — jeśli używany jest kontrakt VENT: audyty, upgrade governance, incident response, podział odpowiedzialności, limity.
4. **AML/CTF Responsibility Matrix** — kto robi KYC, travel rule (Rozporządzenie (UE) 2023/1113), sanctions screening, kto raportuje.
5. **Data Processing Agreement** (RODO).
6. **ICT / operational resilience** — postanowienia zgodne z oczekiwaniami DORA po stronie CASP.
7. **Termination & Wind-down** — co się dzieje ze środkami przy rozwiązaniu umowy lub upadłości CASP; ścieżka migracji.
8. **T&C sprzedaży (VENT ↔ nabywca)** — muszą odzwierciedlać art. 13 (prawo odstąpienia, sposób wykonania, termin zwrotu) i wskazywać safeguarding arrangement.

## 10.3 Diagram — Minimal Article 10 CASP Architecture (rekomendowany)

```
                    Investor (retail, EU)
                            |
                            | 1. KYC (VENT + provider)
                            | 2. Accept T&C  -> DAY 0 = start art.13 window
                            | 3. transfer USDC
                            v
        +---------------------------------------------------+
        |   ESCROW SMART CONTRACT (Base, immutable)          |
        |   - per-purchaser ledger + timestamp               |
        |   - refund(): callable BY PURCHASER, no VENT sig   |
        |   - release(): requires CASP signature + timelock  |
        |   - NO admin / upgrade / pause / sweep for VENT    |
        +---------------------------------------------------+
             ^                                    |
             |                                    | after protective period
   CONTROL   |  CASP key / MPC share              |  + CASP signature
   (art.10(3)(b), art.3(1)(17) "controlling")     v
        +----------------+              +--------------------------+
        | LICENSED CASP  |              |  VENT Treasury Multisig  |
        | custody perm.  |              +--------------------------+
        | art.75 regime  |
        +----------------+

   VENT keeps: frontend, KYC, contracts, distribution, accounting, art.10(1)-(2) reporting
   CASP does : ONLY custody/control of escrowed funds during the protective period
```

**Test zgodności do zadania CASP i prawnikowi (jedno zdanie):**
> *„Czy w okresie ochronnym istnieje jakakolwiek ścieżka techniczna, w której środki trafiają do VENT bez udziału CASP?"* — jeśli odpowiedź brzmi „tak", architektura nie spełnia art. 10 ust. 3.

---

# 11. ALTERNATYWNE LEGALNE STRUKTURY

*Nie są to sposoby obchodzenia prawa — to konstrukcje przewidziane wprost przez MiCA.*

## D1 — Utility token dla usługi, która ISTNIEJE / JEST OPERACYJNA

| | |
|---|---|
| **LEGAL BASIS** | Art. 4 ust. 3 MiCA `[VERIFY]` — Tytuł II **nie ma zastosowania**, gdy oferta dotyczy *„a utility token providing access to a good or service that exists or is in operation"* |
| **CONDITIONS** | Usługa/dobro **realnie istnieje i jest operacyjne w chwili oferty** (nie: „w fazie beta obiecanej na Q3"). Token musi faktycznie dawać do niej dostęp. Wyłączenie interpretowane wąsko. |
| **CZY ART. 10 MA ZASTOSOWANIE?** | **NIE** — cały Tytuł II wyłączony, więc brak art. 10, brak art. 13, brak WP, brak notyfikacji. |
| **PRAKTYCZNA UŻYTECZNOŚĆ DLA VENT** | **NAJWYŻSZA ze wszystkich opcji, jeśli osiągalna.** Jedyna droga eliminująca CASP w całości i legalnie. Wymaga przesunięcia sekwencji: **najpierw uruchom produkt, potem sprzedawaj token dostępowy.** |
| **RISKS** | (1) Ocena „exists or is in operation" jest ocenna — NCA mogą uznać MVP za niewystarczające; (2) jeśli token ma cechy inwestycyjne/spekulacyjne (listing, oczekiwanie wzrostu wartości), NCA może zakwestionować kwalifikację jako czysto utility, a w skrajnym wypadku — zbadać, czy nie jest to instrument finansowy (MiFID II) → **znacznie cięższy reżim**; (3) wyłączenie z Tytułu II **nie wyłącza** prawa konsumenckiego UE, AML, reklamy, ochrony danych; (4) brak WP = brak paszportu = trudniej o listing. |

> **To jest najważniejsza alternatywa w całym raporcie. Rekomenduję poświęcić jej osobną analizę produktowo-prawną przed decyzją o architekturze escrow.**

## D2 — Sprzedaż za EUR z escrow w instytucji kredytowej

| | |
|---|---|
| **LEGAL BASIS** | Art. 10 ust. 3 **lit. a** — *„a credit institution, where funds are raised during the offer to the public"* |
| **CONDITIONS** | Wpłaty w **funds** (EUR bezgotówkowo). Rachunek w instytucji kredytowej (bank z zezwoleniem CRD), rachunek wyodrębniony/escrow. |
| **CZY ART. 10 MA ZASTOSOWANIE?** | **TAK — ale spełniony przez bank, nie CASP.** |
| **PRAKTYCZNA UŻYTECZNOŚĆ** | Średnia. Tańsze niż CASP, dobrze rozumiane prawnie. **Ale**: banki UE są bardzo niechętne rachunkom escrow dla ICO; rachunek powierniczy notariusza/kancelarii **nie jest** instytucją kredytową. |
| **RISKS** | (1) Trudność otwarcia rachunku; (2) utrata natywnego UX crypto; (3) `UNCLEAR`: **czy USDC jako EMT to „funds"?** USDC jest wydawany przez podmiot z licencją EMI w UE → jest EMT → EMT to pieniądz elektroniczny → pieniądz elektroniczny mieści się w definicji „funds" z art. 4 pkt 25 PSD2. Jeśli tak, to lit. a wskazywałaby instytucję kredytową także dla USDC — co jest operacyjnie niewykonalne on-chain. **Bezpieczne rozwiązanie: CASP z uprawnieniem custody, który obsłuży USDC jako kryptoaktywo (lit. b).** Wymaga potwierdzenia. |

## D3 — Brak oferty publicznej w UE (geofencing)

| | |
|---|---|
| **LEGAL BASIS** | Zakres terytorialny MiCA + **ESMA Guidelines on reverse solicitation** (ESMA35-1872330276-2030, 02.2025) |
| **CONDITIONS** | Brak kierowania oferty do UE: geo-blocking IP + KYC z wykluczeniem rezydentów UE/EOG, brak marketingu w językach UE, brak targetowania reklam, brak roadshow, brak influencerów UE. Reverse solicitation interpretowane przez ESMA **bardzo wąsko** — nie jest to strategia, tylko wyjątek. |
| **CZY ART. 10 MA ZASTOSOWANIE?** | **NIE** — brak oferty publicznej w UE. |
| **PRAKTYCZNA UŻYTECZNOŚĆ** | Zależy od tego, jak istotny jest rynek UE. Jeśli raise da się zrobić poza UE — najprostsze rozwiązanie. |
| **RISKS** | (1) Wysokie ryzyko wykonawcze — jeden nieostrożny post lub AMA łamie geofencing; (2) NCA agresywnie ścigają „offer targeting" mimo formalnego geoblocku; (3) całkowita utrata rynku UE. |

## D4 — Wyłączenia z art. 4 ust. 2 (150 osób / €1 mln / qualified investors)

| | |
|---|---|
| **LEGAL BASIS** | Art. 4 ust. 2 MiCA `[VERIFY]` — wyłącza **wyłącznie** obowiązki z art. 4 ust. 1 lit. b, c, d (i f) — tj. **notyfikację WP (art. 8), publikację WP (art. 9), marketing communications (art. 7)** |
| **CONDITIONS** | (a) < 150 osób na państwo członkowskie działających na własny rachunek; **lub** (b) łączna wartość w UE ≤ €1 000 000 w 12 miesięcy; **lub** (c) wyłącznie qualified investors, przy czym kryptoaktywo **może być posiadane wyłącznie** przez takich inwestorów. |
| **CZY ART. 10 MA ZASTOSOWANIE?** | **TAK — prawdopodobnie tak.** Art. 4 ust. 2 wyłącza *punkty art. 4 ust. 1*, a **nie** art. 10 ani art. 13. Wykładnia literalna: **safeguarding i prawo odstąpienia pozostają w mocy nawet przy ofercie zwolnionej z WP.** `UNCLEAR` — część komentatorów zakłada szersze wyłączenie; brak potwierdzenia w Q&A. **Argument dwustronny:** za stosowaniem art. 10 — literalny zakres wyłączenia; przeciw — brak WP oznacza brak ram, w których safeguarding miałby być ujawniany, co sugeruje intencję pełnego wyłączenia małych ofert. |
| **PRAKTYCZNA UŻYTECZNOŚĆ DLA VENT** | **Niska przy €5–9 mln.** Limit €1 mln zdecydowanie za mały. Limit 150 osób/MS: teoretycznie 27 × 150 = 4050 osób → przy średnim tickecie €1 500–2 000 daje €6–8 mln — **matematycznie wykonalne, operacyjnie bardzo ryzykowne** (twarde limity per państwo, weryfikacja rezydencji, brak możliwości korekty po przekroczeniu). Qualified-investors-only: wymaga, by token **mógł być posiadany wyłącznie** przez qualified investors — trudne dla tokena transferowalnego. |
| **RISKS** | Przekroczenie limitu = oferta publiczna bez WP = naruszenie art. 4 ust. 1 lit. b; brak możliwości cofnięcia; art. 10 prawdopodobnie i tak obowiązuje. |

## D5 — Admission to trading przed sprzedażą (wyłączenie prawa odstąpienia)

| | |
|---|---|
| **LEGAL BASIS** | Art. 13 ust. 4 `[VERIFY]` — brak prawa odstąpienia, gdy kryptoaktywa dopuszczone do obrotu **przed** nabyciem; w połączeniu z art. 10 ust. 4 |
| **CONDITIONS** | Realne dopuszczenie do obrotu na platformie prowadzonej przez autoryzowany CASP + oferta **bez time limit** |
| **CZY ART. 10 MA ZASTOSOWANIE?** | Art. 10 ust. 4: okres safeguardingu = **zero** (bo prawo odstąpienia nie powstaje). `UNCLEAR` — zob. 3.2. |
| **PRAKTYCZNA UŻYTECZNOŚĆ DLA VENT** | **Ograniczona na starcie, potencjalnie użyteczna dla późniejszych transz.** Blokada: limit 12 miesięcy dla nieoperacyjnego utility tokena i tak wymusza time limit → art. 10 ust. 4 pozostaje niedostępny. Po uruchomieniu usługi (D1) ten problem znika. |
| **RISKS** | Zależność od spornej wykładni; koszty listingu; obowiązki z art. 5 i 6; ryzyko reputacyjne „listing przed produktem". |

## D6 — Krótkie sekwencyjne transze subskrypcyjne

| | |
|---|---|
| **LEGAL BASIS** | Art. 10 ust. 1 + art. 13 ust. 5 `[VERIFY]` — oferta z terminem, prawo odstąpienia wygasa z końcem subskrypcji |
| **CONDITIONS** | Każda transza z własnym, ogłoszonym w WP terminem; publikacja wyniku po każdej; ewentualne modyfikacje WP w trybie art. 12 |
| **CZY ART. 10 MA ZASTOSOWANIE?** | **TAK, w pełni** — ale okres blokady skraca się z ~12 miesięcy do ~45–60 dni na transzę |
| **PRAKTYCZNA UŻYTECZNOŚĆ** | **Bardzo wysoka** — nie zmniejsza zgodności, radykalnie poprawia cash-flow, eliminuje potrzebę rozstrzygania `UNCLEAR` z sekcji 3.4 |
| **RISKS** | Obciążenie administracyjne (raportowanie po każdej transzy); konieczność zaprojektowania WP pod transze od początku; ryzyko, że NCA potraktuje transze jako jedną ofertę ciągłą — **mitygacja: realne przerwy między transzami, odrębne warunki cenowe/alokacyjne**. |

## D7 — Placement przez autoryzowany CASP

| | |
|---|---|
| **LEGAL BASIS** | Art. 3 ust. 1 pkt 16 — „placing of crypto-assets"; art. 13 ust. 1 przewiduje sprzedaż przez CASP dokonującego placement |
| **CONDITIONS** | Umowa placement z autoryzowanym CASP; CASP przyjmuje wpłaty w swojej infrastrukturze |
| **CZY ART. 10 MA ZASTOSOWANIE?** | Tak, ale spełniony niejako „przy okazji" — środki są u CASP z definicji |
| **PRAKTYCZNA UŻYTECZNOŚĆ** | Średnia — rozwiązuje art. 10, KYC i dystrybucję jednym ruchem, ale najdroższa i najmniej „nasza" |
| **RISKS** | Koszt (typowo % raise); zależność; utrata kontroli nad UX i danymi |

## 11.1 Zestawienie

| Opcja | Eliminuje art. 10? | Realna dla €5–9 mln? | Koszt | Rekomendacja |
|---|---|---|---|---|
| **D1** usługa operacyjna | **TAK, całkowicie** | tak, jeśli produkt gotowy | niski | **zbadać priorytetowo** |
| D2 EUR + bank | nie (spełnia inaczej) | trudne operacyjnie | niski-średni | opcja rezerwowa |
| D3 geofencing UE | tak (brak zakresu) | tak, ale bez rynku UE | niski | tylko jeśli UE nieistotna |
| D4 art. 4 ust. 2 | prawdopodobnie NIE | nie przy €5–9 mln | niski | odrzucić |
| D5 admission first | częściowo, sporne | nie na starcie | średni | rozważyć dla późn. transz |
| **D6 krótkie transze** | nie, ale skraca blokadę | **tak** | bardzo niski | **wdrożyć zawsze** |
| D7 placement CASP | nie (spełnia inaczej) | tak | wysoki | fallback |

---

# 12. SANKCJE — scenariusz „escrow bez CASP, regulator uznaje naruszenie"

## 12.1 Realistyczna sekwencja działań AFM

Zanim padnie kara, w praktyce nadzorczej dzieje się to:

1. **Pytania w trybie nadzorczym** (art. 94 — żądanie informacji) — najpewniej jeszcze w okresie 20 dni roboczych po notyfikacji WP, bo safeguarding jest opisany w WP.
2. **Nieformalne oczekiwanie zmiany** — „proszę wskazać CASP przed rozpoczęciem oferty".
3. **Formalna instrukcja / aanwijzing** — nakaz doprowadzenia do zgodności w terminie.
4. **Zawieszenie oferty** — art. 94 `[VERIFY]` przewiduje uprawnienie do zawieszenia oferty publicznej (typowo do 30 kolejnych dni roboczych, z możliwością przedłużenia) albo jej zakazania.
5. **Public warning / ostrzeżenie publiczne** — art. 94.
6. **Kara pieniężna** — art. 111, wdrożona w prawie NL.
7. **Publikacja decyzji** — art. 112 `[VERIFY]`; zasadą jest publikacja z danymi podmiotu.

## 12.2 Rozdzielenie kategorii konsekwencji

| Kategoria | Treść | Realistyczna ocena dla VENT |
|---|---|---|
| **Administrative measures** | Nakaz zaprzestania, nakaz doprowadzenia do zgodności, żądanie informacji, ostrzeżenie publiczne | **Najbardziej prawdopodobna reakcja pierwszego rzędu** |
| **Suspension of offering** | Zawieszenie oferty publicznej (art. 94) | **Bardzo prawdopodobne**, jeśli AFM uzna naruszenie w toku oferty. **To jest realne ryzyko biznesowe nr 1** — nie kara, tylko zatrzymanie raise w połowie |
| **Administrative fines** | Art. 111 — MiCA ustala **minimalne maksima**, państwa mogą ustalić wyższe. Powszechnie cytowane pułapy: **osoby fizyczne do €700 000**; **osoby prawne do €5 000 000 albo % rocznego obrotu (3%–12,5% w zależności od kategorii naruszenia)** `[VERIFY — dokładne pułapy dla Tytułu II i implementacja NL do potwierdzenia]` | **Statutory maximum ≠ likely outcome.** Zob. 12.3 |
| **Publication of decision** | Art. 112 — publikacja decyzji, co do zasady z nazwą podmiotu | **Prawdopodobna przy karze** — dla projektu token-sale skutek reputacyjny często dotkliwszy niż sama kwota |
| **Liability of the company** | Odpowiedzialność administracyjna spółki | Tak |
| **Liability of directors** | W prawie NL możliwe nałożenie kary na **feitelijk leidinggevenden** (osoby faktycznie kierujące); MiCA przewiduje też zakaz pełnienia funkcji zarządczych | **Realne**, choć rzadko stosowane przy pierwszym naruszeniu bez złej wiary. `[VERIFY z holenderskim doradcą]` |
| **Civil liability** | Art. 15 — odpowiedzialność za informacje w WP, gdy WP jest **niekompletny, nierzetelny lub wprowadzający w błąd**. **Kluczowe:** jeśli WP stwierdza „safeguarding zgodny z art. 10", a nie jest — to samo w sobie może być twierdzeniem wprowadzającym w błąd. Dodatkowo prawo konsumenckie UE i krajowe. | **Zarządzalne, jeśli WP opisuje escrow uczciwie i ujawnia ryzyko interpretacyjne.** Zob. rekomendację niżej |
| **Criminal liability** | W NL naruszenia przepisów rynku finansowego mogą wchodzić w zakres **Wet op de economische delicten (WED)**; w praktyce ścieżka administracyjna dominuje. | **Mało prawdopodobne** przy braku oszustwa i przy zabezpieczonych środkach. `UNCLEAR — wymaga potwierdzenia przez holenderskiego doradcę` |

## 12.3 Likely regulatory response vs. statutory maximum — kalibracja

**Jedyny opublikowany, prawomocny precedens sankcyjny pod MiCA, jaki zidentyfikowałem:**

> **FMA (Austria) vs. Bitpanda — €70 000, decyzja z 14.08.2026, opublikowana jako pierwsza finalna kara MiCA w UE.**
> Naruszenia: (1) notyfikacja white papera **po** terminie 20 dni roboczych; (2) dystrybucja marketing communication **przed** publikacją WP; (3) brak obowiązkowych ujawnień i danych kontaktowych. Tryb **przyspieszony**. **Bitpanda zachowała zezwolenie.**

**Wnioski kalibracyjne:**
- Pierwsze kary MiCA są **niskie i proceduralne**, nie egzystencjalne. €70k wobec podmiotu wielkości Bitpandy to sygnał, nie kara odstraszająca.
- NCA zaczynają od naruszeń **formalnych i łatwych do udowodnienia** (terminy, marketing) — a naruszenie art. 10 ust. 3 jest dokładnie tego typu: binarne i widoczne w WP.
- **Realistyczna prognoza dla VENT** przy escrow bez CASP, przy braku strat inwestorów i przy pełnej transparentności: **nakaz naprawczy + prawdopodobne zawieszenie oferty + kara w przedziale niskich dziesiątek tysięcy EUR + publikacja decyzji**. Nie €5 mln.
- **Ale**: dominującym ryzykiem nie jest kwota kary, lecz **zatrzymanie oferty w trakcie raise** i **publiczny wpis o naruszeniu**, który zamyka drogę do listingów na regulowanych platformach i do współpracy z CASP-ami.

## 12.4 Środki obniżające ryzyko, jeśli mimo wszystko wybieracie model bez CASP

Nie rekomenduję tego modelu, ale jeśli decyzja zapadnie:

1. **Nie twierdź w WP, że model jest zgodny z art. 10 ust. 3.** Opisz go faktycznie i **ujawnij ryzyko interpretacyjne** jako czynnik ryzyka. To niemal całkowicie neutralizuje ekspozycję z art. 15 (odpowiedzialność za wprowadzenie w błąd) — a jest to ekspozycja poważniejsza finansowo niż kara administracyjna.
2. **Uzyskaj pisemną opinię prawną** przed launchem (dowód dobrej wiary, art. 111 ust. 5 — stopień odpowiedzialności).
3. **Odbądź pre-notification meeting z AFM** i udokumentuj go.
4. **Zbuduj kontrakt jako prawdziwie neutral** — zero admin keys po stronie VENT — żeby uniknąć drugiego, cięższego zarzutu z art. 59.
5. **Przygotuj plan awaryjny „CASP w 30 dni"** — wynegocjowana i podpisana umowa warunkowa z CASP, gotowa do uruchomienia na żądanie AFM. To zmienia rozmowę z „naruszyliście" na „naprawiamy dziś".

---

# 13. PRACTICAL RECOMMENDATION — cztery warianty

*Skala 1–10. LEGAL CONFIDENCE: 10 = pewność zgodności. COST: 10 = najtaniej. TECHNICAL COMPLEXITY: 10 = najprościej. CASH-FLOW: 10 = najszybszy dostęp do kapitału. REGULATORY RISK: 10 = najniższe ryzyko.*

## OPTION A — 100% smart-contract escrow, bez CASP

| Kryterium | Ocena | Uzasadnienie |
|---|---|---|
| LEGAL CONFIDENCE | **2/10** | Sprzeczne z literalnym brzmieniem art. 10 ust. 3; brak wsparcia L2/L3; brak precedensu |
| COST | **10/10** | Brak opłat CASP |
| TECHNICAL COMPLEXITY | **7/10** | Kontrakt trzeba napisać i zaudytować, ale bez integracji z third party |
| CASH-FLOW | **9/10** | Automatyczny release po okresie ochronnym |
| REGULATORY RISK | **2/10** | Wysokie ryzyko zawieszenia oferty; ryzyko dodatkowego zarzutu z art. 59; widoczne dla AFM przy notyfikacji |
| **SUMA** | **30/50** | |

## OPTION B — smart-contract escrow + minimal CASP

| Kryterium | Ocena | Uzasadnienie |
|---|---|---|
| LEGAL CONFIDENCE | **7/10** | Zgodny z brzmieniem; pozostaje `UNCLEAR` co do progu kontroli CASP i tożsamości „klienta" |
| COST | **6/10** | Setup + opłaty custody; znacznie taniej niż pełny outsourcing |
| TECHNICAL COMPLEXITY | **4/10** | Integracja multisig/MPC z CASP, procedury release/refund, reconciliation |
| CASH-FLOW | **7/10** | Dobra przy modelu transzowym (D6); gorsza przy jednej długiej ofercie |
| REGULATORY RISK | **7/10** | Niskie ryzyko zakwestionowania modelu jako całości; ryzyko rezydualne w szczegółach |
| **SUMA** | **31/50** | |

## OPTION C — klasyczne CASP safeguarding (bez własnego escrow)

| Kryterium | Ocena | Uzasadnienie |
|---|---|---|
| LEGAL CONFIDENCE | **9/10** | Model wprost przewidziany przez przepis |
| COST | **3/10** | Najdroższy |
| TECHNICAL COMPLEXITY | **8/10** | Najprostszy technicznie po stronie VENT |
| CASH-FLOW | **5/10** | Zależny od procedur CASP; zwykle wolniejszy |
| REGULATORY RISK | **9/10** | Najniższe |
| **SUMA** | **34/50** | |

## OPTION D — usługa operacyjna przed ofertą + wyłączenie z art. 4 ust. 3 (+ transze D6)

| Kryterium | Ocena | Uzasadnienie |
|---|---|---|
| LEGAL CONFIDENCE | **6/10** | Wyłączenie jest wyraźne, ale przesłanka „exists or is in operation" jest ocenna; ryzyko reklasyfikacji tokena |
| COST | **9/10** | Brak CASP, brak WP, brak notyfikacji |
| TECHNICAL COMPLEXITY | **8/10** | Prosto — escrow opcjonalny, nie wymuszony |
| CASH-FLOW | **10/10** | Brak okresu ochronnego z art. 10; brak art. 13 |
| REGULATORY RISK | **5/10** | Ryzyko sporu o kwalifikację; brak WP oznacza brak „parasola" dokumentacyjnego; prawo konsumenckie i AML nadal obowiązują |
| **SUMA** | **38/50** | |

## 13.1 RECOMMENDED VENT ARCHITECTURE

**Rekomendacja dwuetapowa, nie jednowariantowa:**

### Etap 0 — decyzja produktowa (2–4 tygodnie, przed jakąkolwiek pracą prawną nad WP)

> **Zbadaj, czy usługa VENT może być operacyjna PRZED rozpoczęciem oferty.**
> Jeśli tak — **Option D** i cała analiza art. 10 przestaje być potrzebna. To jest największa dostępna dźwignia i najtańsza droga. Wymaga potwierdzenia przez doradcę, że produkt spełnia przesłankę „exists or is in operation" i że token nie zostanie przekwalifikowany.

### Etap 1 — jeśli D niedostępne: **OPTION B + D6**

**Architektura docelowa:**

1. **Offeror: holenderskie B.V.** (nowa spółka), z Wyoming Corp jako podmiotem grupy / IP holder.
   → home Member State = NL **z mocy prawa** (art. 3 ust. 1 pkt 33 lit. a), koniec problemu z sekcji 8.
2. **Waluta wpłat: wyłącznie USDC** (i opcjonalnie EURC). **USDT wykluczyć** — nie jest autoryzowanym EMT w UE, po 1 lipca 2026 nie może być oferowany przez licencjonowane podmioty w EOG; żaden CASP nie przyjmie go do custody dla oferty retail w UE, a jego użycie jako środka zapłaty w publicznej ofercie w UE tworzy niepotrzebne ryzyko. **To jest zmiana, którą trzeba wprowadzić niezależnie od reszty architektury.**
3. **Escrow: immutable smart contract na Base**, bez admin keys VENT, z per-purchaser ledger, timestampem, `refund()` wykonywalnym przez nabywcę bez zgody VENT, `release()` wymagającym podpisu CASP + timelock.
4. **CASP: minimalny mandat** — wyłącznie custody/kontrola means of access w okresie ochronnym; VENT robi wszystko inne. Klientem CASP jest VENT (Model I z sekcji 10.2), z umownym oznaczeniem środków jako trzymanych na rzecz nabywców do końca okresu ochronnego.
5. **Struktura oferty: 4–6 transz po 45 dni**, każda z ogłoszonym terminem, mieszczące się w limicie 12 miesięcy od publikacji WP. Release po zamknięciu każdej transzy.
6. **Bufor refundowy: 5–10% wpływów każdej transzy** utrzymywane przez 14 dni po zamknięciu transzy, na obsługę art. 13 ust. 3.
7. **Compliance overlay:** ESMA Guidelines on systems and security access protocols (art. 14 ust. 1 lit. d), reżim marketingu z art. 7 (nie publikować marketingu przed publikacją WP — lekcja z Bitpandy), notyfikacja art. 8 z 20-dniowym wyprzedzeniem, raportowanie wyników z art. 10 ust. 1.
8. **Pre-notification meeting z AFM** przed formalną notyfikacją.

**Dlaczego B, a nie C, mimo że C ma wyższą punktację:** różnica 3 punktów wynika niemal wyłącznie z pewności prawnej, którą Option B odzyskuje dzięki właściwie zaprojektowanej kontroli CASP; Option B zachowuje przy tym narrację on-chain, transparentność per-purchaser i niższy koszt. **Jeśli jednak negocjacje z CASP pokażą, że żaden nie zaakceptuje kontroli nad waszym kontraktem — przejdźcie na C bez wahania.** Nie warto ratować architektury kosztem zgodności.

---

# 14. SOURCES

## Poziom 1 — prawo pierwotne (EUR-Lex)

| Źródło | Miejsce | Link | Data | Co potwierdza | Status weryfikacji |
|---|---|---|---|---|---|
| Rozporządzenie (UE) 2023/1114 (MiCA) | art. 10 ust. 1–4 | https://eur-lex.europa.eu/eli/reg/2023/1114/oj/eng | 31.05.2023 | Obowiązek safeguardingu; zamknięta lista: credit institution / CASP z custody; art. 10 ust. 4 wiąże okres z wygaśnięciem prawa odstąpienia | Cytaty pośrednie — **`[VERIFY]` na EUR-Lex** |
| MiCA | art. 13 ust. 1–5 | jw. | jw. | 14 dni kalendarzowych; bieg od daty umowy; zwrot ≤14 dni; brak prawa przy admission to trading; wygaśnięcie z końcem subskrypcji | `[VERIFY]` |
| MiCA | art. 4 ust. 1–3 i limit 12 mies. | jw. | jw. | Warunki oferty; wyłączenia; **12-miesięczny limit dla utility tokenów nieoperacyjnych**; wyłączenie CASP dla ofert wyłączonych | `[VERIFY]` — numeracja ustępów niepewna |
| MiCA | art. 3 ust. 1 pkt 13, 16, 17, 26, 33 | jw. | jw. | Definicje: offeror, crypto-asset service, custody („safekeeping or controlling… means of access"), transfer services, home Member State | `[VERIFY]` |
| MiCA | art. 8, 9, 12, 14, 15 | jw. | jw. | Notyfikacja ≥20 dni roboczych; brak prior approval; modyfikacja WP; obowiązki offerora; odpowiedzialność za WP | `[VERIFY]` |
| MiCA | art. 70, 75 | jw. | jw. | Safekeeping klientów; umowa, register of positions, segregacja, odpowiedzialność CASP z capem | `[VERIFY]` |
| MiCA | art. 94, 111, 112 | jw. | jw. | Uprawnienia nadzorcze; kary; publikacja decyzji | `[VERIFY]` — pułapy kar do potwierdzenia |
| Dyrektywa (UE) 2015/2366 (PSD2) | art. 4 pkt 25 | — | 2015 | Definicja „funds" (w tym pieniądz elektroniczny) — istotna dla kwalifikacji USDC | `[VERIFY]` |

## Poziom 2 — ESMA

| Źródło | Link | Data | Co potwierdza |
|---|---|---|---|
| ESMA Interactive Single Rulebook — MiCA, art. 10 „Result of the offer to the public and safeguarding arrangements" | https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica/article-10-result-offer-public-and | — | Oficjalny tytuł i struktura art. 10 |
| ESMA ISRB — art. 13 „Right of withdrawal" | https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica/article-13-right-withdrawal | — | Tytuł i struktura art. 13 |
| ESMA ISRB — art. 75 | https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mica/article-75-providing-custody-and | — | Reżim custody CASP |
| **ESMA Q&A 2293** | https://www.esma.europa.eu/publications-data/questions-answers/2293 | — | Recital 87: exchange dokonywany przez issuera/offerora **nie jest** usługą kryptoaktywów → VENT nie potrzebuje licencji na sprzedaż własnego tokena |
| **ESMA Q&A 2071** | https://www.esma.europa.eu/publications-data/questions-answers/2071 | 20.06.2024 | Transfer services jako usługa samodzielna; art. 82 stosuje się także gdy transfer jest elementem innej usługi |
| **ESMA Q&A 2608** | https://www.mica.wtf/mica-level-2-and-level-3/q-and-a/esma-qa-2608-pre-funding-clients-orders-clients-crypto-assets | — | Pre-funding z aktywów klientów = sub-custody → art. 70 i 75; dowód **szerokiej, funkcjonalnej wykładni custody przez ESMA** |
| ESMA Guidelines on reverse solicitation under MiCA (ESMA35-1872330276-2030) | https://www.esma.europa.eu/sites/default/files/2025-02/ESMA35-1872330276-2030_Guidelines_on_reverse_solicitation_under_MiCA.pdf | 02.2025 | Wąskie rozumienie reverse solicitation — istotne dla opcji geofencingu |
| ESMA Guidelines on maintenance of systems and security access protocols (ESMA75-223375936-6132) | https://www.esma.europa.eu/sites/default/files/2025-02/ESMA75-223375936-6132_Guidelines_on_maintenance_of_systems_and_security_access_protocols_under_MiCA.pdf | 02.2025 | Wytyczne do **art. 14 ust. 1 lit. d**, adresowane do **offerorów** — bezpośrednio dotyczą smart contractu VENT |
| ESMA Public Statement — koniec okresu przejściowego (ESMA75-113276571-1710) | https://www.esma.europa.eu/sites/default/files/2026-06/ESMA75-113276571-1710_Public_Statement_MiCA_transitional_period_ends.pdf | 06.2026 | Kontekst egzekwowania wobec nieautoryzowanych podmiotów |
| **Ustalenie negatywne** | — | 17.08.2026 | **Brak jakiegokolwiek materiału ESMA dot. art. 10 safeguarding / smart-contract escrow / non-custodial safeguarding** |

## Poziom 3 — Komisja Europejska / EBA

| Źródło | Link | Data | Co potwierdza |
|---|---|---|---|
| EBA — Consultation Paper on methodology for setting fines under MiCA (EBA/CP/2026/10) | https://www.eba.europa.eu/sites/default/files/2026-06/2b552586-bdf3-4faf-b1b3-136c4550f625/Consultation%20Paper%20on%20methodology%20for%20setting%20fines%20under%20MiCA.pdf | 26.06.2026 | Metodyka ustalania kar (zakres EBA); kontekst dla sekcji 12 |
| **Ustalenie negatywne** | — | 17.08.2026 | **Brak zidentyfikowanego Q&A Komisji, aktu delegowanego ani RTS/ITS doprecyzowującego art. 10.** Art. 10 nie zawiera mandatu Level 2 |

## Poziom 4 — AFM / Holandia

| Źródło | Link | Data | Co potwierdza |
|---|---|---|---|
| AFM — White papers (sekcja nadzorcza) | https://www.afm.nl/en/sector/cryptopartijen/toezicht/white-papers | — | Kanał notyfikacji `whitepapers.submission@afm.nl`; terminy z MiCAR |
| AFM — rejestry podmiotów crypto | https://www.afm.nl/en/sector/registers/vergunningenregisters/cryptopartijen | — | Rejestr autoryzowanych CASP w NL — lista kandydatów do Modelu B |
| Kamerstuk 36527 nr 3 (holenderska ustawa wdrożeniowa MiCAR) | https://zoek.officielebekendmakingen.nl/kst-36527-3.html | — | Podział kompetencji AFM/DNB; podstawa krajowego reżimu sankcyjnego — **`[VERIFY]` przez holenderskiego doradcę** |
| Precedens: white paper Plume zarejestrowany w ESMA po weryfikacji AFM | — | 19.06.2025 | AFM realnie obsługuje ścieżkę Tytułu II dla projektów zagranicznych |

## Poziom 5 — inne NCA

| Źródło | Link | Data | Co potwierdza |
|---|---|---|---|
| **AMF — Public offerings and admission to trading of crypto-assets: procedures for notifying the AMF** | https://www.amf-france.org/en/professionals/fintech/my-relations-amf/public-offerings-and-admission-trading-crypto-assets | — | **Kluczowe potwierdzenie wykładni home MS przez NCA**: offeror z państwa trzeciego → oddział w danym państwie albo pierwsza oferta / pierwszy wniosek o dopuszczenie w tym państwie |
| FMA (Austria) — sprawa Bitpanda, kara €70 000 | https://www.coindesk.com/business/2026/08/17/bitpanda-fined-eur70-000-in-austria-s-first-published-mica-enforcement-case ; https://cointelegraph.com/news/bitpanda-fined-austrian-published-mica-penalty | 14.08.2026 (publikacja 17.08.2026) | **Pierwsza opublikowana finalna kara MiCA w UE.** Naruszenia proceduralne (spóźniona notyfikacja WP, marketing przed publikacją, braki ujawnień). Tryb przyspieszony. Kalibracja realnego wymiaru kar |
| AMF / FMA / CONSOB — wspólne wezwanie do wzmocnienia europejskiego nadzoru nad rynkiem kryptoaktywów | https://www.amf-france.org/en/news-publications/news-releases/amf-news-releases/french-austrian-and-italian-markets-authorities-call-stronger-european-framework-crypto-asset | — | Kierunek zmian; ryzyko dla struktur opartych na luce third-country offeror |

## Poziom 7 — źródła pomocnicze (kancelarie, literatura)

*Użyte wyłącznie do potwierdzenia brzmienia i struktury przepisów oraz do rekonstrukcji praktyki. Nie stanowią podstawy żadnej konkluzji samodzielnie.*

| Źródło | Link | Co wnosi |
|---|---|---|
| White & Case — MiCA: New regulatory framework for Crypto-Assets Issuers and CASPs in the EEA | https://www.whitecase.com/insight-alert/mica-regulation-new-regulatory-framework-crypto-assets-issuers-and-crypto-asset | Struktura Tytułu II; brzmienie art. 10 ust. 3 |
| Norton Rose Fulbright — Regulating crypto-assets in Europe: Practical guide to MiCA | https://www.nortonrosefulbright.com/en/knowledge/publications/2cec201e/regulating-crypto-assets-in-europe-practical-guide-to-mica | Reżim usług i custody |
| Dechert — Application of Second Part of MiCA | https://www.dechert.com/knowledge/onpoint/2025/1/application-of-second-part-of-mica---regulation-of-casps-and-oth.html | Obowiązki przy ofercie publicznej |
| CMS — Safeguarding the digital vault: custody and administration of crypto-assets under MiCA | https://cms.law/en/int/publication/legal-experts-on-markets-in-crypto-assets-mica-regulation/safeguarding-the-digital-vault-custody-and-administration-of-crypto-assets-under-the-new-mica-regulation | Definicja custody, art. 75 |
| Ganado Advocates — Custody under MiCA: Who's really in control? | https://ganado.com/custody-under-mica-whos-really-in-control/ | **Analiza pojęcia „control" — kluczowa dla multisig/MPC**; potwierdza brak wytycznych co do progu |
| Freshfields — Digital Asset Protection: client asset rules under MiCA | https://technologyquotient.freshfields.com/post/102hyzl/digital-asset-protection-a-first-look-at-client-asset-rules-under-mica | Art. 70/75, segregacja, insolvency |
| A&O Shearman — MiCAR under the microscope, Part 8: White paper vs. Prospectus | https://www.aoshearman.com/en/insights/micar-under-the-microscopepart-8-white-paper-vs-prospectus | Procedura art. 8/9, brak prior approval |
| CERHA HEMPEL — When is a white paper required under MiCAR | https://www.cerhahempel.com/blog/fintech-ledger/when-is-a-white-paper-required-under-micar-applicability-and-exceptions | **Rozróżnienie art. 4 ust. 2 (wyłączenia WP) vs. art. 4 ust. 3 (wyłączenie Tytułu II)** |
| Stadler Partner — MiCA: When is a white paper really required? | https://stadlerpartner.at/en/insights/mica-when-is-a-white-paper-really-required | Jw., potwierdzenie niezależne |
| Osborne Clarke — EU white paper requirements in MiCAR | https://www.osborneclarke.com/insights/what-are-eus-white-paper-requirements-micar-and-do-they-apply-bitcoin | Zakres wyłączeń |
| KPMG Law — MiCAR enforcement regime and penalties | https://kpmglaw.ie/insight-micar-regime.html | Struktura sankcji |
| Capital Markets Law Journal — Crypto custody (Oxford Academic) | https://academic.oup.com/cmlj/article/19/3/207/7692861 | Analiza akademicka pojęcia custody pod MiCA |
| WH Partners — Demystifying ESMA's latest MiCA Q&As | https://whpartners.eu/news/demystifying-esmas-latest-mica-qas-clarification-or-reinterpretation/ | Kontekst Q&A ESMA |

---

# 15. WERYFIKACJA ZAŁOŻEŃ — „nie zakładaj, że wcześniejsze twierdzenia są poprawne"

| Twierdzenie do weryfikacji | Werdykt | Uzasadnienie |
|---|---|---|
| **Czy CASP jest zawsze wymagany?** | **NIE — „zawsze" jest fałszywe.** Wymagany, gdy stosuje się Tytuł II i oferta nie jest wyłączona z art. 4 ust. 3. Nie jest wymagany, gdy: (a) usługa jest operacyjna → art. 4 ust. 3; (b) wpłaty w EUR → instytucja kredytowa (lit. a); (c) brak oferty publicznej w UE. `UNCLEAR` dla ofert z art. 4 ust. 2 | zob. sekcje 2, 11 |
| **Czy art. 10 ust. 4 rzeczywiście pozwala na release po 14 dniach?** | **TAK — ale tylko dla ofert BEZ time limit, i dla VENT prawdopodobnie niedostępne** wskutek 12-miesięcznego limitu dla utility tokenów nieoperacyjnych | sekcja 3 |
| **Czy smart-contract escrow może mieć znaczenie prawne?** | **TAK — ale nie to, którego oczekujecie.** Znaczenie: (a) spełnia pierwszy człon art. 10 ust. 3 („effective arrangements to monitor and safeguard"); (b) chroni przed zarzutem nielicencjonowanego custody, jeśli jest neutral; (c) silnie łagodzi wymiar sankcji. **Nie** zastępuje podmiotu z listy | sekcje 2, 5 |
| **Czy admission to trading zmienia sytuację?** | **TAK, ale warunkowo** — wyłącza prawo odstąpienia dla zakupów po dopuszczeniu (art. 13 ust. 4), co przy ofercie bezterminowej zeruje okres z art. 10 ust. 4. Dla VENT zablokowane przez limit 12 miesięcy. `UNCLEAR` co do zerowania | sekcje 3.2, 11 (D5) |
| **Czy emitent z Wyoming może notyfikować WP w Holandii?** | **Tylko warunkowo** — gdy NL jest państwem pierwszej oferty publicznej, albo państwem pierwszego wniosku o dopuszczenie do obrotu. **Nie jest to swobodny wybór.** Rekomendacja: holenderskie B.V. | sekcja 8.2 |
| **Czy oferta bez time limitu jest dopuszczalna dla utility tokena VENT?** | **NIE**, jeśli usługa nie jest operacyjna — limit 12 miesięcy wymusza podanie terminu | sekcja 3.3 |
| **Czy istnieją dodatkowe ograniczenia dla utility tokena dot. usług jeszcze niedostępnych?** | **TAK — i jest to jedno z najważniejszych ustaleń raportu.** Limit 12 miesięcy trwania oferty, liczony od publikacji WP. Dodatkowo: brak dostępu do wyłączenia z art. 4 ust. 3, oraz wyższe ryzyko, że NCA potraktuje token jako instrument inwestycyjny | sekcje 3.3, 11 |
| **Czy USDT nadaje się jako waluta wpłat w ofercie w UE?** | **NIE.** Nie jest autoryzowanym EMT w UE; wycofywany z licencjonowanych platform w EOG. Użyć USDC (i/lub EURC) | sekcja 13.1 |

---

# 16. CHECKLIST DLA ZEWNĘTRZNEGO PRAWNIKA (przed launchem)

**Priorytet krytyczny — bez tego nie startować:**

1. **Czy usługa VENT jest „a good or service that exists or is in operation" w rozumieniu art. 4 ust. 3 MiCA?** Jeśli tak → cały Tytuł II odpada. To pytanie warte więcej niż cała reszta listy razem.
2. **Czy AFM zaakceptuje NL jako home Member State dla offerora z Wyoming?** Jeśli nie ma pewności — czy zakładamy holenderskie B.V.? (rekomendacja: tak)
3. **Jaki poziom kontroli CASP nad środkami w escrow AFM uzna za „kept in custody" w rozumieniu art. 10 ust. 3 lit. b?** Konkretnie: czy 2-of-2 multisig CASP+VENT wystarcza? Czy MPC z udziałem CASP wystarcza?
4. **Kto jest „klientem" CASP na potrzeby art. 10 ust. 3 lit. b i art. 75 ust. 3 — VENT czy nabywcy?** Od tego zależy koszt i UX.

**Priorytet wysoki:**

5. **Kiedy dokładnie kończy się obowiązek safeguardingu przy ofercie z time limit?** Czy model transzowy (D6) rozwiązuje problem w sposób akceptowalny dla AFM?
6. **Czy art. 10 i art. 13 stosują się do ofert wyłączonych na podstawie art. 4 ust. 2** (150 osób / €1 mln / qualified investors)?
7. **Czy VENT (utility token dla platformy) nie jest instrumentem finansowym pod MiFID II** w świetle ESMA Guidelines on the qualification of crypto-assets as financial instruments (ESMA75453128700-1323)? Negatywna odpowiedź to warunek istnienia całej analizy MiCA.
8. **Czy USDC jako EMT to „funds" w rozumieniu art. 10 ust. 3 lit. a?** Jeśli tak — czy lit. a wypiera lit. b, czy stosuje się alternatywnie?
9. **Potwierdzenie numeracji ustępów** wszystkich pozycji oznaczonych `[VERIFY]` na tekście urzędowym (PL i EN).

**Priorytet standardowy:**

10. **Reżim sankcyjny w NL** — implementacja art. 111–112 MiCA, pułapy kar dla Tytułu II, odpowiedzialność feitelijk leidinggevenden, zakres WED (odpowiedzialność karna).
11. **Odpowiedzialność z art. 15 za WP** — sformułowanie opisu safeguardingu tak, by nie zawierał twierdzenia o zgodności, którego nie da się obronić.
12. **Prawo konsumenckie UE i holenderskie** poza MiCA (dyrektywa o prawach konsumentów, nieuczciwe praktyki rynkowe, e-commerce) — obowiązuje niezależnie od Tytułu II, także przy ofercie wyłączonej.

---

## DISCLAIMER

Dokument przygotowany jako **materiał roboczy do dalszej analizy prawnej**. Nie stanowi opinii prawnej ani doradztwa prawnego, podatkowego ani inwestycyjnego. Powstał przy ograniczonym dostępie do źródeł urzędowych (zob. sekcja 0) i zawiera oznaczenia `[VERIFY]` oraz `UNCLEAR` wskazujące miejsca wymagające weryfikacji. Przed jakąkolwiek decyzją operacyjną wymagane jest potwierdzenie przez kwalifikowanego doradcę prawnego uprawnionego w Holandii oraz — w zakresie struktury korporacyjnej — w USA/Wyoming.
