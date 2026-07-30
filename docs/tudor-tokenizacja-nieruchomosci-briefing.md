# Tokenizacja nieruchomości — briefing przedspotkaniowy
### Tudor Nieruchomości (Konrad Kopij) × Tokenuj sp. z o.o.
**Spotkanie: 31 lipca 2026 | Stan prawny sprawdzony na: 30–31 lipca 2026 | Przygotował: Tokenuj sp. z o.o.**

---

## Nota metodologiczna (przeczytać przed użyciem dokumentu)

Ten dokument powstał na podstawie rzeczywistego researchu internetowego przeprowadzonego 30 lipca 2026 r. (osiem niezależnych wątków badawczych, źródła pierwotne: EUR-Lex, ESMA, KNF, ISAP, Sejm RP, Rada UE, oraz liczne, wzajemnie krzyżowo weryfikowane źródła wtórne — kancelarie prawne, prasa branżowa). W trakcie researchu narzędzie do bezpośredniego pobierania treści stron (WebFetch) było w tej sesji niedostępne dla większości domen źródłowych (EUR-Lex, ESMA, ISAP, KNF) — ustalenia oparto na wynikach wyszukiwania (WebSearch), które zwracają cytowane fragmenty tych stron, skrzyżowane między wieloma niezależnymi źródłami. Oznacza to:

- Tam, gdzie fakt/przepis jest potwierdzony przez wiele niezależnych, zbieżnych źródeł — traktuję go jako **ustalony z wysoką pewnością**.
- Tam, gdzie opieram się na pojedynczym źródle wtórnym lub ekstrapolacji — oznaczam to wyraźnie jako **do potwierdzenia** i wskazuję, co dokładnie wymaga weryfikacji.
- **Numery artykułów aktów prawnych podane w tym dokumencie należy traktować jako wskazówkę nawigacyjną, a nie ostateczne źródło prawa.** Przed użyciem w dokumentacji prawnej lub złożeniem jakiejkolwiek wiążącej deklaracji wobec Konrada Kopija, prawnik rynku kapitałowego/kryptoaktywów powinien samodzielnie zweryfikować przywołane przepisy bezpośrednio na EUR-Lex/ISAP/KNF.
- Ten dokument **nie jest opinią prawną ani podatkową** — to materiał przygotowawczy do rozmowy biznesowej, wskazujący kierunki analizy, ryzyka i pytania do dalszego zbadania.
- Obszar prawny opisany w tym dokumencie jest w Polsce **wyjątkowo dynamiczny w lipcu 2026 r.** (patrz sekcja 6.4) — zalecane jest odświeżenie kluczowych ustaleń bezpośrednio przed każdym kolejnym krokiem formalnym (nie tylko przed samym spotkaniem 31 lipca).

---

# 1. Najważniejsze wnioski przed spotkaniem

1. **Polska nie ma obowiązującej ustawy implementującej MiCA.** Projekt był trzykrotnie wetowany przez Prezydenta RP Karola Nawrockiego (ostatnio **11 czerwca 2026 r.**), a unijny okres przejściowy z art. 143 ust. 3 MiCA **zakończył się 1 lipca 2026 r.** i nie mógł zostać przedłużony żadnym aktem krajowym. Efekt: **w Polsce obecnie nie ma organu uprawnionego do przyjmowania notyfikacji whitepaper MiCA ani wniosków o licencję CASP** — nie dlatego, że KNF odmawia, lecz dlatego, że nie została ustawowo wyznaczona jako organ właściwy. To najważniejszy, najbardziej czasowo krytyczny fakt tego briefu.
2. **To nie zamyka drogi do tokenizacji — zmienia jej kształt.** Praktyczna droga dla polskich projektów objętych MiCA to dziś notyfikacja/licencja CASP w innym państwie UE/EOG (najczęściej wskazywane: Niemcy, Estonia, Francja, Austria, Holandia; Litwa zamknęła nowe wnioski w styczniu 2026) z wykorzystaniem mechanizmu paszportowania na Polskę. To rozwiązanie zgodne z prawem, nie „obejście" — MiCA wprost to przewiduje.
3. **Model prywatnej emisji inwestycyjnej (Ścieżka 1) prawdopodobnie w ogóle nie podlega MiCA.** Jeśli token inkorporuje prawa typowe dla papieru wartościowego (udział w zyskach, wierzytelność, zbywalność), zgodnie z art. 2 ust. 4 lit. a) MiCA oraz wytycznymi ESMA ws. kwalifikacji kryptoaktywów jako instrumentów finansowych (ESMA75-453128700-1323, obowiązują od 18.05.2025) — token wypada z MiCA i podlega reżimowi Rozporządzenia Prospektowego + polskiego prawa rynku kapitałowego. To oznacza, że **luka w polskiej ustawie o kryptoaktywach nie blokuje Ścieżki 1** — ale otwiera inne ryzyka (patrz pkt 5).
4. **Rozporządzenie Prospektowe ma nowy, wyższy próg.** Po reformie „EU Listing Act" (Rozporządzenie (UE) 2024/2809), od **5 czerwca 2026 r.** ogólny próg wyłączenia z obowiązku prospektowego wynosi **12 mln EUR w 12 miesięcy** (dawniej krajowe widełki 1–8 mln EUR), z opcją obniżenia przez państwo członkowskie do **5 mln EUR**. Polska ustawa dostosowująca krajowy próg była w toku prac sejmowych (skierowana do Sejmu 12.06.2026) — **na 30–31 lipca 2026 status jej uchwalenia wymaga świeżego sprawdzenia**, bo to bezpośrednio wpływa na to, ile można zebrać bez prospektu.
5. **Największe realne ryzyko dla Ścieżki 1 to nie MiCA, lecz kwalifikacja SPV jako alternatywnego funduszu inwestycyjnego (AFI/ASI).** SPV zbierające kapitał od wielu inwestorów w celu ulokowania go w nieruchomość zgodnie z określoną polityką inwestycyjną literalnie odpowiada definicji AFI z ustawy o funduszach inwestycyjnych (art. 2 pkt 10a, art. 8a). Nie znaleziono oficjalnego stanowiska KNF wprost rozstrzygającego tę kwestię dla modeli tokenizacji nieruchomości — **to najważniejsze pytanie do zadania prawnikowi rynku kapitałowego przed strukturyzowaniem Modelu B/C**.
6. **Token nie może samodzielnie przenosić własności udziału w polskiej sp. z o.o.** Art. 180 KSH wymaga formy pisemnej z podpisami notarialnie poświadczonymi (poza wyjątkiem portalu S24). Blockchain może wspierać ewidencję, ale musi mieć pokrycie w ważnie zawartej umowie. Prosta spółka akcyjna (PSA) dopuszcza prowadzenie rejestru akcjonariuszy na DLT — ale wyłącznie przez uprawniony, regulowany podmiot (dom maklerski, bank powiernik, notariusz, KDPW), nie na dowolnym publicznym blockchainie.
7. **Geofencing nie jest samodzielnym zwolnieniem prawnym** — to jeden z elementów dowodowych, nie tarcza. Dotyczy to zarówno reżimu prospektowego, jak i MiCA (reverse solicitation jest interpretowane bardzo wąsko przez ESMA — wytyczne z 26.02.2025).
8. **Utility token musi być realnym dostępem do usługi, nie opakowaniem inwestycji.** Substance over form obowiązuje jednakowo po stronie MiCA i po stronie prawa papierów wartościowych — nazwanie tokena „utility" nie chroni przed przekwalifikowaniem.
9. **UOKiK aktywnie ściga podobne modele biznesowe.** Komunikat z 20 lipca 2026 r. o zarzutach wobec spółek condohotelowych (Linea Mare, Beskid Resort Properties, Haveno Estate, Zdrojowa Invest2) za wprowadzanie w błąd co do zysków z inwestycji w nieruchomości to najbliższy dostępny precedens egzekucyjny — bezpośrednio istotny dla języka marketingowego obu ścieżek.
10. **O Tudor Nieruchomości wiadomo niewiele z otwartych źródeł** — to małe, butikowe, jednoosobowe biuro Konrada Kopija w Szczecinie, aktywne lokalnie (Facebook, LinkedIn, wzmianka w lokalnym magazynie), bez śladu wcześniejszego zainteresowania blockchainem/krypto. To oznacza, że **odkrycie realnych potrzeb biznesowych na spotkaniu jest ważniejsze niż prezentowanie gotowego rozwiązania** — brief w pkt 2 poniżej wyjaśnia lukę informacyjną.

---

# 2. Informacje o Tudor i Konradzie istotne dla rozmowy

**Zastrzeżenie:** poniższe dane pochodzą z publicznie dostępnych, ale ograniczonych źródeł (WebFetch był niedostępny w sesji badawczej, więc strony firmowe nie zostały odczytane w pełnej treści — tylko fragmenty widoczne w wynikach wyszukiwania). Traktuj to jako punkt wyjścia do rozmowy, nie jako pewnik.

| Element | Ustalenie | Pewność |
|---|---|---|
| Firma | Tudor Nieruchomości, biuro pośrednictwa w obrocie nieruchomościami, ul. Swarożyca 14/10, 71-601 Szczecin | Wysoka |
| Właściciel | Konrad Kopij | Wysoka |
| Forma działalności | Prawdopodobnie jednoosobowa działalność gospodarcza (CEIDG) — wpis w Aleo.com jako „Konrad Kopij – usługi doradcze i brokerskie" | Średnia (NIP/REGON niepotwierdzone) |
| Zakres | Pośrednictwo w obrocie nieruchomościami mieszkaniowymi, inwestycje w nieruchomości; obszar Szczecin i powiat policki (możliwie szerzej woj. zachodniopomorskie) | Średnia |
| Skala | Mała, butikowa firma — LinkedIn firmowy ok. 132 obserwujących, Facebook ok. 1400 polubień (dane orientacyjne, niezweryfikowane bezpośrednio) | Niska–średnia |
| Wizerunek | Wyróżnienie w rankingu top100.pl (biura nieruchomości), wzmianka w lokalnym magazynie lifestyle „Prestiż Szczecin" („Królewskie otwarcie"), komunikacja skupiona na jakości obsługi/opiniach klientów | Średnia |
| Technologia/krypto | **Brak jakichkolwiek publicznych śladów zainteresowania blockchainem, krypto lub tokenizacją** | Wysoka (brak = luka danych, nie potwierdzenie braku zainteresowania) |
| Obecność zagraniczna | Brak danych o klientach zagranicznych | Brak danych — **dopytać na spotkaniu** |

**Wniosek praktyczny:** nie zakładaj, że Konrad zna terminologię blockchainową ani że ma gotowy projekt pilotażowy. Buduj rozmowę od jego celów biznesowych (wolumen, jakość obsługi, marketing, pozycja trendsettera), nie od technologii. Luka informacyjna o firmie to również dobry pretekst do dyskretnego pytania na wstępie: „Zanim przejdziemy dalej — jak wygląda dziś Wasz biznes: ile transakcji miesięcznie, jaki mix sprzedaż/wynajem, czy macie własny portfel nieruchomości inwestycyjnych?"

---

# 3. Pytania discovery

## Biznesowe
1. Czy chcesz finansować własne nieruchomości Tudor, projekty klientów, czy współpracę z deweloperami?
2. Czy Tudor posiada dziś jakiekolwiek nieruchomości inwestycyjne (własne lub w zarządzaniu)?
3. Jaki jest dziś miesięczny/roczny wolumen transakcji Tudor (sprzedaż, wynajem)?
4. Czy istnieje już konkretny projekt, który mógłby być pilotażem (adres, typ, status prawny)?
5. Co dokładnie oznacza dla Ciebie „bycie trendsetterem" na rynku szczecińskim — jaki konkretny efekt chcesz osiągnąć w ciągu 12 miesięcy?
6. Czy widzisz to jako nowy pion biznesowy Tudor (inwestycje/fintech), czy jako dodatek do istniejącej oferty pośrednictwa?
7. Kto w Twojej organizacji miałby to prowadzić operacyjnie?

## Finansowe
8. Jaka kwota miałaby zostać pozyskana w pilotażu i docelowo?
9. Jaki minimalny ticket inwestycyjny wyobrażasz sobie dla inwestora?
10. Ilu potencjalnych inwestorów Tudor realnie zna/ma w bazie kontaktów (obecni klienci, znajomi, lokalni przedsiębiorcy)?
11. Jak dziś finansujesz zakupy/remonty nieruchomości inwestycyjnych — kredyt, kapitał własny, wspólnicy?
12. Jaki budżet wdrożeniowy bierzesz pod uwagę na ten projekt?
13. Czy oczekujesz zwrotu z inwestycji w projekt tokenizacyjny, czy traktujesz go jako koszt marketingowo-wizerunkowy?

## Prawne
14. Czy inwestorzy mają być wyłącznie detaliczni, wyłącznie profesjonalni/kwalifikowani, czy mix?
15. Czy oferta ma być prowadzona tylko w Polsce, czy też za granicą?
16. Czy Tudor ma dziś jakichkolwiek klientów/kontakty zagraniczne (np. Niemcy, Skandynawia — typowe dla woj. zachodniopomorskiego)?
17. Czy Tudor jest gotowy utworzyć odrębną spółkę celową (SPV) pod projekt?
18. Czy token ma dawać prawo do czynszu, udziału w zysku ze sprzedaży, czy tylko zwrot kapitału z odsetkami?
19. Czy zależy Ci na obrocie wtórnym tokenami, czy inwestor ma „trzymać do końca"?
20. Czy rozważasz kiedykolwiek listing na giełdzie/platformie obrotu?

## Operacyjne
21. Kto będzie zarządzał nieruchomością operacyjnie (najem, konserwacja, relacje z najemcami)?
22. Kto ponosi ryzyko pustostanów — SPV, Tudor, inwestorzy proporcjonalnie?
23. Jak dziś wyceniasz nieruchomości — własny rzeczoznawca, zewnętrzny, portale?
24. Czy masz już zaufanego notariusza/kancelarię, z którą regularnie pracujesz?
25. Jaki jest oczekiwany termin uruchomienia pilotażu?

## Technologiczne
26. Czy Tudor ma dziś jakąkolwiek platformę cyfrową (CRM, portal klienta) poza standardowymi portalami ogłoszeniowymi?
27. Jaki jest poziom komfortu zespołu Tudor z nowymi technologiami — czy potrzebne będzie szkolenie?
28. Czy zależy Ci na własnej aplikacji/panelu inwestora pod marką Tudor, czy wystarczy biała etykieta dostawcy?

## Marketingowe
29. Czy chcesz oddzielną markę inwestycyjną (np. „Tudor Capital"/„Tudor Invest"), czy wszystko pod marką Tudor Nieruchomości?
30. Jak dziś wygląda Twój marketing — kanały, budżet, kto go prowadzi?
31. Czy zależy Ci bardziej na rozgłosie/PR („pierwsza tokenizacja nieruchomości w Szczecinie"), czy na cichym, kontrolowanym pilotażu?
32. Czy masz program poleceń/lojalnościowy dziś? Jak działa?

---

# 4. Prywatna emisja inwestycyjna (Ścieżka 1)

## 4.1 Model A — pożyczka/obligacja tokenizowana

**Mechanizm:** inwestorzy finansują SPV (kupno/remont/deweloperkę/refinansowanie) poprzez tokenizowaną pożyczkę lub obligację. Token odzwierciedla wierzytelność — **ale sam token/smart kontrakt nie zastępuje umowy pożyczki/warunków emisji obligacji, jeśli prawo wymaga formy pisemnej lub rejestru** (np. obligacje rejestrowane w depozycie wymagają agenta emisji).

| Element | Opis |
|---|---|
| Rola Tudor | Sourcing nieruchomości, pośrednictwo transakcyjne, zarządzanie relacją z inwestorami lokalnymi, częściowo zarządzanie najmem |
| Rola SPV | Pożyczkobiorca/emitent obligacji, właściciel nieruchomości, strona umów z wykonawcami/najemcami |
| Rola Tokenuj | Struktura prawna, tokenomika, smart kontrakt, platforma/panel inwestora, KYC/AML, dokumentacja, marketing |
| Rola inwestora | Pożyczkodawca/obligatariusz — wierzyciel SPV, nie właściciel nieruchomości |
| Przepływ pieniędzy | Inwestor → SPV (kapitał) → SPV → sprzedawca/wykonawca (zakup/remont) → najem/sprzedaż → SPV → inwestor (spłata + odsetki) |
| Przepływ tokenów | Emisja po wpłacie i whitelistowaniu portfela → token w portfelu inwestora → (opcjonalnie) transfer na wykup przy spłacie |
| Zabezpieczenia inwestora | Zależnie od struktury: hipoteka na nieruchomości, zastaw na udziałach SPV, poręczenie Tudor/Konrada, gwarancja bankowa — do wynegocjowania, nie domyślne |
| Źródło spłaty | Przychody z najmu i/lub cena sprzedaży nieruchomości |
| Dystrybucja przychodów | Wg harmonogramu w umowie pożyczki/warunkach emisji — okresowo (np. kwartalnie) lub jednorazowo przy exit |
| Zabezpieczenia rzeczowe | Hipoteka (wymaga wpisu do księgi wieczystej — token tego nie zastępuje), zastaw rejestrowy na udziałach SPV |
| Wycena nieruchomości | Niezależny rzeczoznawca majątkowy przed emisją i okresowo (np. rocznie) |
| Due diligence | Prawne (stan księgi wieczystej, obciążenia, pozwolenia), techniczne (stan budynku), finansowe (biznesplan, model finansowy) |
| Exit | Spłata pożyczki/wykup obligacji wg harmonogramu; refinansowanie kredytem bankowym; sprzedaż nieruchomości |
| Wcześniejsze wyjście | Możliwe tylko jeśli umowa to przewiduje (opcja wcześniejszej spłaty) lub przez kontrolowany obrót wtórny — nie jest gwarantowane |
| Ryzyko braku płynności | Wysokie — token nie jest automatycznie zbywalny na rynku wtórnym bez zorganizowanej platformy |
| Niewypłacalność SPV | Inwestor jako wierzyciel podlega ogólnym zasadom prawa upadłościowego/restrukturyzacyjnego; pozycja zależy od zabezpieczeń |
| Podatki | Po stronie inwestora: przychód odsetkowy, prawdopodobnie art. 30a PIT (19% zryczałtowany), pobierany przez SPV jako płatnika — **do potwierdzenia interpretacją indywidualną** (patrz sekcja 6.4) |
| Koszty administracyjne | Księgowość SPV, obsługa prawna, agent emisji (jeśli obligacje rejestrowane), platforma technologiczna |

**Kwalifikacja regulacyjna:** token-wierzytelność, zbywalny, emitowany seryjnie do wielu inwestorów → wysokie prawdopodobieństwo kwalifikacji jako **transferable security** wg MiFID II art. 4(1)(44)(b) → **poza zakresem MiCA** (art. 2 ust. 4 lit. a) MiCA + wytyczne ESMA ESMA75-453128700-1323) → podlega Rozporządzeniu Prospektowemu i polskiemu prawu rynku kapitałowego.

## 4.2 Model B — udział/prawo korporacyjne w SPV

**Mechanizm:** SPV posiada nieruchomość, inwestor obejmuje udział (sp. z o.o.) lub akcję (S.A./PSA), token wspiera ewidencję i proces transakcyjny.

**Ograniczenie polskiego prawa spółek — kluczowe do wyjaśnienia Konradowi wprost:**
- **Sp. z o.o.:** zbycie udziału wymaga formy pisemnej z podpisami notarialnie poświadczonymi (art. 180 KSH), poza wyjątkiem spółek zawiązanych w portalu S24 (kwalifikowany podpis elektroniczny/podpis zaufany, ale tylko w tym systemie). **Token sam w sobie nie przenosi własności udziału** — może być jedynie pomocniczą ewidencją z pokryciem w ważnej umowie.
- **Dodatkowe ograniczenie od 10.11.2023 r. (art. 182¹/257¹ KSH):** zakaz kierowania oferty objęcia/nabycia udziałów sp. z o.o. do „nieoznaczonego adresata" oraz zakaz promowania takiej oferty wobec nieoznaczonego adresata — sankcja karna do 6 miesięcy pozbawienia wolności (art. 595¹/595² KSH). To bezpośrednio ogranicza możliwość szerokiego marketingu udziałowego crowdfundingu w sp. z o.o.
- **Prosta spółka akcyjna (PSA):** dopuszcza prowadzenie rejestru akcjonariuszy w rozproszonej, zdecentralizowanej bazie danych (blockchain) — **ale wyłącznie przez uprawniony podmiot regulowany** (dom maklerski, bank powiernik prowadzący rachunki papierów wartościowych, zagraniczna instytucja kredytowa/firma inwestycyjna działająca w Polsce, KDPW, lub notariusz). Blockchain publiczny, bezzezwoleniowy, zarządzany samodzielnie przez spółkę/dostawcę technologii **nie spełnia tego wymogu**.

**Wniosek praktyczny:** Model B jest technicznie i prawnie najbardziej złożony. Token pełni rolę warstwy ewidencyjnej/UX (panel inwestora, raportowanie, komunikacja), a nie samodzielnego nośnika własności. Wymaga PSA (nie sp. z o.o.) jeśli ma być realny komponent DLT w samym rejestrze akcjonariuszy, oraz współpracy z uprawnionym podmiotem prowadzącym ten rejestr.

**Ryzyko AFI/ASI (patrz też sekcja 6.3):** SPV zbierające kapitał od wielu inwestorów w celu ulokowania go zgodnie z określoną polityką inwestycyjną odpowiada definicji AFI (art. 2 pkt 10a UFI). Próg rejestracji (bez zezwolenia) zamiast pełnego zezwolenia ZASI: **100 mln EUR aktywów** (z dźwignią) lub **500 mln EUR** (bez dźwigni, brak prawa do umorzenia przez 5 lat) — pilotaż na jedną nieruchomość prawdopodobnie mieści się poniżej progu rejestracyjnego, ale **sam obowiązek rejestracji jako ZASI może i tak powstać** i wymaga odrębnej analizy prawnej przed uruchomieniem.

## 4.3 Model C — udział w przychodach/zyskach

**Mechanizm:** inwestor finansuje projekt w zamian za określony % udziału w przychodach z najmu i/lub zysku ze sprzedaży, bez formalnego stosunku pożyczki ani udziału korporacyjnego (revenue-share agreement).

| Ryzyko kwalifikacji | Ocena |
|---|---|
| Papier wartościowy | **Wysokie** — jeśli prawo do udziału w przychodach jest zbywalne i emitowane seryjnie (ta sama treść dla wielu inwestorów), funkcjonalnie przypomina „papier wartościowy równoważny akcji" (MiFID II art. 4(1)(44)(a)) |
| Instrument finansowy | Pochodna powyższego — jeśli tak, poza MiCA, w reżimie MiFID II/Prospektowym |
| Zbiorowe inwestowanie (AFI) | **Wysokie** — to najbardziej „podręcznikowy" przykład zbierania kapitału od wielu inwestorów wg określonej polityki inwestycyjnej; ryzyko wyższe niż w Modelu B, bo brak formalnej struktury korporacyjnej może wyglądać jeszcze bardziej jak fundusz |
| Działalność crowdfundingowa (ECSPR) | Zależy od kanału dystrybucji: jeśli oferowane przez **publicznie dostępną platformę internetową** — tak, wymaga zezwolenia CSP (próg 5 mln EUR/12 mies.); jeśli **w pełni prywatnie, na imienne zaproszenie, bez otwartej platformy** — prawdopodobnie poza zakresem ECSPR (na podstawie analogii do ESMA Q&A 3.11 o ofercie do pojedynczego inwestora — ale ESMA nie potwierdziła tego wprost dla grupy kilkunastu zaproszonych osób, co jest istotną luką interpretacyjną) |
| Działalność wymagająca licencji | Jeśli struktura jest dystrybuowana przez pośrednika finansowego świadczącego usługi inwestycyjne (przyjmowanie/przekazywanie zleceń, doradztwo) — tak, wymaga licencji firmy inwestycyjnej lub działania przez podmiot już licencjonowany |

**Wniosek:** Model C jest najprostszy komunikacyjnie („inwestujesz i dostajesz % z najmu"), ale ma **najwyższe łączne ryzyko regulacyjne** ze wszystkich trzech modeli — brakuje mu twardej kotwicy prawnej (ani dług, ani udział korporacyjny), więc kwalifikacja opiera się w całości na testach „substance over form". Rekomendacja: jeśli Tudor chce iść w tym kierunku, warto rozważyć oparcie konstrukcji o Model A (pożyczka z odsetkami powiązanymi z wynikiem — np. oprocentowanie zmienne uzależnione od przychodu z najmu) zamiast czystego revenue-share, żeby mieć jaśniejszą kotwicę prawną.

## 4.4 Wyłączenia dla emisji prywatnej — tabela (Rozporządzenie Prospektowe vs MiCA)

**Nie mieszaj tych dwóch reżimów — to częsty błąd.** Poniższa tabela pokazuje, że mają różne przesłanki, różne progi i różny cel.

| Kryterium | Rozporządzenie Prospektowe (UE) 2017/1129 (po Listing Act) | MiCA (UE) 2023/1114, Tytuł II |
|---|---|---|
| Czego dotyczy | Papiery wartościowe (udziały, obligacje, tokeny-security) | „Inne kryptoaktywa" (nie ART/EMT, nie instrumenty finansowe) |
| Próg wartości oferty w 12 mies. | **12 mln EUR** ogólnie w UE od 5.06.2026; państwo członkowskie może obniżyć do **5 mln EUR** (status polskiej ustawy dostosowującej na 30.07.2026 — do sprawdzenia na bieżąco) | **1 mln EUR** w 12 miesiącach (art. 4 ust. 2) |
| Wyłącznie inwestorzy kwalifikowani | Tak (art. 1 ust. 4 lit. a) | Tak (art. 4 ust. 3) |
| Próg liczby osób | **Mniej niż 150 osób** na państwo członkowskie (art. 1 ust. 4 lit. b) | **Mniej niż 150 osób** na państwo członkowskie (art. 4 ust. 3) — ten sam próg liczbowy, ale w innym akcie |
| Minimalny nominał jednostkowy | **100 000 EUR** (art. 1 ust. 4 lit. c) | Brak takiego wyłączenia w MiCA |
| Minimalna wartość nabycia na inwestora | **100 000 EUR** (art. 1 ust. 4 lit. d) | Brak takiego wyłączenia w MiCA |
| Wyłączenie dla dostępu do istniejącej usługi | Nie dotyczy | Tak — „utility token exemption" dla dostępu do towaru/usługi już działającej (art. 4 ust. 3) |
| Organ właściwy | KNF (zatwierdzenie prospektu / przyjęcie memorandum) | Docelowo KNF (notyfikacja whitepaper) — **obecnie brak umocowania ustawowego w Polsce** |
| Charakter kontroli | Prospekt zatwierdzany merytorycznie przez KNF; memorandum poniżej progu — bez zatwierdzania, ale z obowiązkiem notyfikacji | Whitepaper **notyfikowany, nie zatwierdzany** (art. 8 MiCA) — nawet w części UE, gdzie MiCA już w pełni działa |
| Sankcja za obejście | Grzywna do 10 mln zł i/lub do 2 lat pozbawienia wolności (polska ustawa o ofercie publicznej) + kary administracyjne KNF | Sankcje wynikające z krajowej ustawy implementującej — **w Polsce obecnie niedostępne z powodu braku ustawy**, co samo w sobie jest źródłem niepewności prawnej, nie luką bezkarności |

**Zasada dla Modeli A/B/C:** jeśli token kwalifikuje się jako papier wartościowy (co jest najbardziej prawdopodobne dla Ścieżki 1), **stosuje się reżim Prospektowy, nie MiCA** — nawet jeśli token jest technicznie zapisany na blockchainie. Polska luka ustawowa w MiCA **nie blokuje** tej ścieżki.

## 4.5 Kontrola dostępu do emisji prywatnej — proces

| # | Element | Wynika z prawa czy dobra praktyka? |
|---|---|---|
| 1 | Zamknięty landing page (bez publicznej ceny/przycisku zakupu) | Dobra praktyka wspierająca zachowanie wyłączenia z prospektu — prawo nie nakazuje formy strony, ale skutki jej otwartości mogą zniweczyć wyłączenie |
| 2 | Dostęp wyłącznie na indywidualne zaproszenie | **Wynika z prawa** — konieczne dla zachowania „oferty do mniej niż 150 osób" / uniknięcia „nieoznaczonego adresata" (art. 182¹ KSH przy udziałach) |
| 3 | NDA / potwierdzenie poufności | Dobra praktyka |
| 4 | Formularz inwestora | Dobra praktyka (operacyjna konieczność) |
| 5 | Kwalifikacja inwestora (kwalifikowany/detaliczny) | **Wynika z prawa**, jeśli oferta ma korzystać z wyłączenia dla inwestorów kwalifikowanych |
| 6 | KYC/AML | **Wynika z prawa** — jeśli w proces zaangażowany jest podmiot będący instytucją obowiązaną (np. agent emisji, CASP); jeśli emitent/SPV działa samodzielnie bez pośrednika regulowanego, status jako instytucji obowiązanej jest niejednoznaczny (patrz sekcja 6.2), ale **obowiązek screeningu sankcyjnego obowiązuje zawsze**, niezależnie od statusu instytucji obowiązanej |
| 7 | Suitability/appropriateness | Wynika z prawa **tylko** jeśli usługę świadczy podmiot objęty MiFID II (doradztwo/zarządzanie portfelem) |
| 8 | Potwierdzenie kraju rezydencji | Dobra praktyka wspierająca ocenę zakresu terytorialnego |
| 9 | Zaakceptowanie dokumentów (regulamin, risk disclosure) | Dobra praktyka + częściowo wynika z ogólnych zasad prawa cywilnego (skuteczność zgody) |
| 10 | Podpis elektroniczny | Dla umowy pożyczki/obligacji — forma dokumentowa może wystarczyć; dla udziałów sp. z o.o. — **wymagany podpis notarialnie poświadczony** (poza S24) |
| 11 | Wpłata | Operacyjna konieczność |
| 12 | Whitelistowanie portfela | Dobra praktyka / element compliance dla warstwy blockchain |
| 13 | Mint lub transfer tokena | Techniczna konieczność |
| 14 | Bieżące raportowanie | Dobra praktyka, wzmacniana przez ogólne obowiązki informacyjne wobec wierzycieli/wspólników |
| 15 | Dystrybucja świadczeń | Wynika z umowy (pożyczka/obligacja/udział) |
| 16 | Kontrolowany obrót wtórny | Dobra praktyka + **wymaga odrębnej analizy prawnej**, bo nieprawidłowo zorganizowany obrót wtórny może sam stworzyć „rynek" i zmienić kwalifikację oferty |

---

# 5. Publiczny utility token Tudor (Ścieżka 2)

## 5.1 20–30 realnych utility — podział wg ryzyka regulacyjnego

### Bezpieczne regulacyjnie (bezpośredni dostęp do usługi/produktu, brak cech inwestycyjnych)
1. Dostęp do ofert nieruchomości przed publikacją (early access)
2. Dostęp do ofert off-market
3. Pierwszeństwo rezerwacji terminu prezentacji nieruchomości
4. Rabat na prowizję pośrednika przy transakcji
5. Rabat na usługi przygotowania nieruchomości do sprzedaży (home staging, drobne remonty)
6. Dostęp do raportów i analiz lokalnego rynku (Szczecin, woj. zachodniopomorskie)
7. Dostęp do webinarów i materiałów edukacyjnych
8. Dostęp do zamkniętej społeczności inwestorów/właścicieli (np. grupa networkingowa)
9. Vouchery na konkretne usługi (np. sesja ze stagerem, konsultacja z architektem wnętrz)
10. Priorytetowa obsługa klienta (szybsza odpowiedź, dedykowany agent)
11. Program poleceń (rabat za polecenie nowego klienta)
12. Poziomy członkostwa (np. Bronze/Silver/Gold) odblokowujące kolejne funkcje platformy
13. Dostęp do wydarzeń i spotkań networkingowych Tudor

### Wymagające dodatkowej analizy (zależą od konstrukcji — mogą przesunąć się w stronę ryzyka)
14. Wyceny i raporty „premium" (jeśli sugerują rekomendację inwestycyjną — bliżej doradztwa inwestycyjnego niż utility)
15. Dostęp do partnerów: kredyty hipoteczne (pośrednictwo kredytowe ma odrębny reżim regulacyjny — ustawa o kredycie hipotecznym)
16. Dostęp do partnerów: notariusz, architekt, ekipy remontowe, zarządzanie najmem (samo pośrednictwo OK, ale uważać na prowizje wpływające na klasyfikację jako usługa finansowa)
17. Pakiety concierge (jeśli obejmują elementy doradztwa inwestycyjnego — do analizy)
18. Głosowanie nad funkcjami platformy/rozwojem ekosystemu (governance) — ryzyko, jeśli głosowanie dotyczy alokacji kapitału/decyzji inwestycyjnych, a nie funkcji produktu
19. Program lojalnościowy dla kupujących/sprzedających/najemców/wynajmujących (OK jako mechanika, ale unikać elementów przypominających zwrot z kapitału)
20. Płatność za usługi tokenem (jeśli token pełni funkcję zbliżoną do środka płatniczego na szerszą skalę — ryzyko klasyfikacji jako e-money token, patrz sekcja 6)

### Wysokiego ryzyka (bliskie cechom inwestycyjnym — unikać lub izolować od rdzenia produktu)
21. Token jako zabezpieczenie/kolateral dla innych produktów finansowych
22. Mechanizm buy-back/odkup tokena przez Tudor po ustalonej lub rosnącej cenie
23. Jakikolwiek mechanizm „staking" tokena z obiecanym zwrotem
24. Emisja dodatkowych tokenów proporcjonalnie do posiadanej ilości (przypomina dywidendę)
25. Powiązanie wartości tokena ze wzrostem wartości portfela nieruchomości Tudor
26. Sprzedaż tokena z narracją „im więcej osób kupi, tym więcej zarobisz" (ryzyko systemu piramidalnego — art. 7 ustawy o przeciwdziałaniu nieuczciwym praktykom rynkowym)
27. Token jako „udział" w przyszłych przychodach z prowizji Tudor

**Rekomendacja:** buduj rdzeń produktu z pozycji 1–13 (bezpieczne), traktuj 14–20 jako opcjonalny rozwój po konsultacji prawnej, **wyklucz całkowicie** pozycje 21–27 z pierwszej wersji produktu.

## 5.2 Czego utility token nie powinien obiecywać

Dywidendy · odsetek · czynszu · gwarantowanego zwrotu · gwarantowanego wzrostu ceny · udziału w zysku Tudor · udziału we wzroście wartości nieruchomości · obowiązkowego odkupu po wyższej cenie · sztywnego powiązania z PLN/EUR/nieruchomością · pasywnego dochodu.

**Każdy z tych elementów, jeśli obecny, przesuwa token w stronę instrumentu finansowego/ART/EMT — niezależnie od nazwy „utility".**

## 5.3 Ryzykowne zwroty marketingowe i bezpieczniejsze odpowiedniki

| Unikać | Dlaczego | Bezpieczniejszy odpowiednik |
|---|---|---|
| „Inwestycja" | Sugeruje oczekiwanie zwrotu z kapitału — kluczowe słowo w testach „substance over form" i w definicjach nieuczciwych praktyk rynkowych | „Uczestnictwo w ekosystemie", „dostęp do usług" |
| „ROI" | Wprost odwołuje się do zwrotu z inwestycji | „Korzyści z członkostwa", „oszczędności na usługach" |
| „Zarabianie na tokenie" | Sugeruje pasywny dochód/spekulację | „Korzystanie z tokena", „wykorzystanie tokena w ekosystemie" |
| „Wzrost wartości" | Obietnica aprecjacji ceny — typowa cecha papieru wartościowego | „Rozwój ekosystemu", „rosnący zakres funkcji" |
| „Bezpieczny zysk" | Podwójnie problematyczne: „bezpieczny" (nieprawda przy każdej inwestycji) + „zysk" | Unikać całkowicie — nie ma bezpiecznego odpowiednika, bo to obietnica z definicji niedozwolona |
| „Token zabezpieczony nieruchomością" | Sugeruje asset-referenced token (ART) lub zabezpieczenie rzeczowe typowe dla papieru dłużnego | „Token wykorzystywany w usługach Tudor", ewentualnie opisowo bez odniesienia do zabezpieczenia |
| „Pasywny dochód" | Klasyczny element testu Howey/instrumentu finansowego | Unikać całkowicie |

**Kontekst egzekucyjny:** UOKiK w komunikacie z 20 lipca 2026 r. postawił zarzuty spółkom sprzedającym udziały w condohotelach (Linea Mare, Beskid Resort Properties, Haveno Estate, Zdrojowa Invest2) właśnie za wprowadzanie w błąd co do wysokości i pewności zysków z inwestycji w nieruchomości. To najbliższy dostępny precedens egzekucyjny w Polsce — model biznesowy (inwestor nabywa prawo do nieruchomości z obietnicą zwrotu z najmu) jest strukturalnie bliski tokenizacji nieruchomości.

---

# 6. Klasyfikacja regulacyjna

## 6.1 Zastrzeżenie klasyfikacyjne — zasada nadrzędna

**Token powiązany z nieruchomością nie ma jednej, z góry ustalonej kategorii prawnej.** Klasyfikacja zależy wyłącznie od praw, jakie faktycznie inkorporuje — nie od nazwy nadanej przez emitenta, technologii (blockchain) ani intencji marketingowej. Nazwanie tokena „utility" nie przesądza jego klasyfikacji — obowiązuje zasada **substance over form**, wprost potwierdzona przez wytyczne ESMA (ESMA75-453128700-1323, obowiązujące od 18.05.2025) wydane na podstawie art. 2 ust. 4 lit. a) MiCA.

## 6.2 Analiza wariantowa — co token daje posiadaczowi

| Prawo inkorporowane w tokenie | Najbardziej prawdopodobna klasyfikacja | Uzasadnienie |
|---|---|---|
| Udział w spółce (SPV) | **Papier wartościowy** (transferable security, MiFID II art. 4(1)(44)(a)) → poza MiCA | „Akcje spółek i inne papiery wartościowe równoważne akcjom" |
| Prawo do dywidendy | **Papier wartościowy** / instrument finansowy | Klasyczna cecha udziałowa |
| Prawo do czynszu | **Prawdopodobnie papier wartościowy lub jednostka uczestnictwa w zbiorowym inwestowaniu (AFI)** | Zależnie od tego, czy powiązane z formalnym udziałem, czy z umową revenue-share przy wielu inwestorach |
| Udział w przychodach | **Wysokie ryzyko: papier wartościowy i/lub AFI** | Brak twardej kotwicy prawnej (patrz Model C, sekcja 4.3) |
| Udział w zysku ze sprzedaży nieruchomości | **Wysokie ryzyko: papier wartościowy i/lub AFI** | Jak wyżej |
| Odsetki | **Instrument dłużny (obligacja/pożyczka tokenizowana)** → poza MiCA, w reżimie Prospektowym | „Obligacje lub inne formy sekurytyzowanego długu" (MiFID II art. 4(1)(44)(b)) |
| Obowiązek odkupu | Wzmacnia klasyfikację jako **instrument dłużny/papier wartościowy** | Cecha typowa dla obligacji, nie dla utility |
| Prawo do zwrotu kapitału | Jak wyżej | — |
| Prawo do wzrostu wartości aktywa | **Instrument pochodny lub papier wartościowy** | Zbliżone do kontraktu na różnicę / instrumentu pochodnego (MiFID II Sekcja C pkt 9) jeśli rozliczane pieniężnie |
| Prawo głosu ws. zarządzania nieruchomością | **Element wzmacniający klasyfikację jako AFI/jednostka zbiorowego inwestowania** lub udział korporacyjny | Governance nad wspólnym aktywem to cecha strukturalna funduszu/spółki |
| Wyłącznie dostęp do produktów/usług/zniżek/funkcji platformy | **Utility token w rozumieniu MiCA** (art. 3 MiCA), poza MiFID II | Warunek: brak jakiegokolwiek elementu z powyższych wierszy |

## 6.3 Drzewo decyzyjne (test klasyfikacyjny)

```
START: Co token faktycznie daje posiadaczowi? (analiza treści praw, nie nazwy)
│
├─ Czy token daje prawo do udziału w kapitale/zysku/przychodach spółki lub SPV,
│  jest zbywalny i emitowany seryjnie (ta sama treść dla wielu posiadaczy)?
│  │
│  ├─ TAK → Test MiFID II art. 4(1)(44): czy to "klasa papierów wartościowych"
│  │        zbywalna na rynku kapitałowym, nie instrument płatniczy?
│  │  │
│  │  ├─ TAK → PAPIER WARTOŚCIOWY / INSTRUMENT FINANSOWY
│  │  │        → poza zakresem MiCA (art. 2 ust. 4 lit. a MiCA)
│  │  │        → stosuje się: MiFID II + Rozporządzenie Prospektowe (UE) 2017/1129
│  │  │          + polska ustawa o ofercie publicznej / o obrocie instrumentami finansowymi
│  │  │        → SPRAWDŹ DODATKOWO: czy struktura (SPV zbierające kapitał od wielu
│  │  │          inwestorów wg polityki inwestycyjnej) = AFI/ASI (ustawa o funduszach
│  │  │          inwestycyjnych, art. 2 pkt 10a, art. 8a)? → jeśli tak, dodatkowy
│  │  │          reżim rejestracji/zezwolenia ZASI
│  │  │
│  │  └─ NIE (np. niezbywalny, pojedyncza umowa, nie "klasa") →
│  │           prawdopodobnie ZWYKŁE ROSZCZENIE CYWILNOPRAWNE poza MiFID/MiCA,
│  │           ALE token jako "cyfrowa reprezentacja prawa" może nadal mieścić się
│  │           w definicji "crypto-asset" MiCA art. 3 → sprawdź wyłączenia art. 4 ust. 3
│  │
├─ Czy token ma na celu utrzymanie stabilnej wartości w odniesieniu do waluty/koszyka
│  aktywów (nie jest instrumentem finansowym)?
│  │
│  ├─ Odniesienie do jednej waluty urzędowej → E-MONEY TOKEN (MiCA Tytuł IV)
│  ├─ Odniesienie do koszyka/innych wartości → ASSET-REFERENCED TOKEN (MiCA Tytuł III)
│  │
├─ Czy token jest unikatowy i niezamienny, reprezentujący konkretną, pojedynczą
│  nieruchomość lub prawo (nie ułamkowy, nie emitowany seryjnie)?
│  │
│  ├─ TAK → potencjalnie POZA ZAKRESEM MiCA (art. 2 ust. 3 — wyłączenie NFT),
│  │        ALE: fractionalizacja (podział na wiele tokenów) usuwa to wyłączenie
│  │
├─ Czy token daje WYŁĄCZNIE dostęp do towaru/usługi Tudor (bez praw finansowych
│  z powyższych gałęzi)?
│  │
│  └─ TAK → UTILITY TOKEN w rozumieniu MiCA (art. 3) → Tytuł II MiCA
│           (obowiązek whitepaper, chyba że zastosowanie ma wyłączenie z art. 4 ust. 3:
│           próg <1 mln EUR/12mies., <150 osób/state, inwestorzy kwalifikowani,
│           dostęp do już istniejącej usługi, ograniczona sieć)
│           → SPRAWDŹ: czy polski organ jest obecnie zdolny przyjąć notyfikację
│             (na 30.07.2026 — NIE, patrz sekcja 6.4) → rozważ notyfikację przez
│             podmiot z innego państwa EOG
│
└─ Czy token jest wyłącznie środkiem wymiany bez odniesienia do konkretnego
   dostawcy usługi (płatniczy, ogólny)?
   │
   └─ TAK → sprawdź czy to "waluta wirtualna" w rozumieniu ustawy AML
            (definicja negatywna wyklucza instrumenty finansowe) → jeśli tak,
            reżim AML dla VASP + MiCA (jeśli objęty definicją ART/crypto-asset)
```

**Kluczowy wniosek dla Was:** ten test trzeba przejść **oddzielnie dla Ścieżki 1 (prawdopodobnie kończy się w gałęzi „papier wartościowy") i Ścieżki 2 (celowo projektowana, by wylądować w gałęzi „utility token")**. Mieszanie cech z obu gałęzi w jednym tokenie to najczęstszy błąd projektowy — patrz sekcja 13.

## 6.4 Status polskiej ustawy o rynku kryptoaktywów po wecie z 11 czerwca 2026 r. — potwierdzone fakty

| Fakt | Data | Pewność |
|---|---|---|
| Rządowy projekt ustawy (implementacja MiCA) wpływa do Sejmu (druk 1424) | 26.06.2025 | Wysoka |
| Sejm uchwala pierwszą wersję | listopad 2025 | Wysoka |
| I weto Prezydenta RP | grudzień 2025 | Średnia (dzień dzienny niepotwierdzony) |
| Sejm uchwala złagodzoną wersję | ok. 18.12.2025 | Średnia |
| II weto Prezydenta RP | grudzień 2025/styczeń 2026 | Średnia |
| Nieudana próba odrzucenia weta (243 za, wymagane 263 — 3/5) | wiosna 2026 | Średnia |
| Sejm uchwala trzecią wersję | ok. 15.05.2026 | Niska–średnia |
| **III weto Prezydenta RP** | **11.06.2026** | **Wysoka — wiele niezależnych, zbieżnych źródeł prasowych** |
| Zapowiedź „czwartej ustawy" (minister finansów Andrzej Domański) | krótko po 11.06.2026 | Wysoka |
| Wynik ew. głosowania nad odrzuceniem III weta | **Nieustalone w tym researchu** | Brak danych — do sprawdzenia bezpośrednio przed spotkaniem |
| **Koniec okresu przejściowego MiCA (art. 143 ust. 3)** | **1.07.2026, nieprzedłużalny** | **Wysoka — potwierdzone stanowiskiem KNF z 10.02.2026** |
| Stan na koniec lipca 2026: brak ustawy, brak wyznaczonego organu, ok. 1200–1800 podmiotów w polskim rejestrze walut wirtualnych dotkniętych luką | lipiec 2026 | Wysoka |

**Praktyczne konsekwencje dla projektu Tudor:**
- **KNF nie jest formalnie umocowana** do przyjmowania notyfikacji whitepaper ani wniosków o licencję CASP w Polsce — nie z powodu odmowy, lecz braku ustawowego wyznaczenia organu.
- Jedyna praktycznie dostępna droga dla elementów projektu objętych MiCA (przede wszystkim utility token, jeśli wymaga whitepaper) to **notyfikacja/licencja CASP uzyskana w innym państwie UE/EOG** (najczęściej wskazywane: Niemcy, Estonia, Francja, Austria, Holandia — Litwa zamknęła okno nowych wniosków w styczniu 2026) z wykorzystaniem mechanizmu paszportowania na Polskę (art. 11 MiCA dla whitepaper, art. 65 MiCA dla CASP).
- **To nie jest sugestia obchodzenia polskiego prawa** — to jedyny obecnie funkcjonujący, zgodny z prawem UE mechanizm, z którego korzystają setki polskich podmiotów w analogicznej sytuacji.
- **Ścieżka 1 (prywatna emisja jako papier wartościowy) jest w praktyce mniej dotknięta tą luką**, ponieważ nie podlega MiCA — podlega Rozporządzeniu Prospektowemu i prawu krajowemu, gdzie KNF ma pełne umocowanie ustawowe.

---

# 7. Limity i wyłączenia

*(Tabela Prospekt vs MiCA — patrz sekcja 4.4 powyżej, nie duplikuję).*

## 7.1 ECSPR (crowdfunding) — kiedy ma zastosowanie

| Element | Ustalenie |
|---|---|
| Próg | **5 mln EUR w 12 miesięcy** (art. 1 ust. 2 lit. c ECSPR) — powyżej progu ECSPR nie ma zastosowania, wymagany prospekt |
| Definicyjny warunek kluczowy | Usługa finansowania społecznościowego wymaga **publicznie dostępnej platformy internetowej z jednym operatorem** (art. 2 ust. 1 lit. d) |
| Precedens ESMA | Q&A ESMA35-42-1088 (23.09.2022): oferta do **pojedynczego** inwestora nie jest „usługą finansowania społecznościowego" — brak elementu publicznej platformy. **ESMA nie wypowiedziała się wprost o ofercie do kilku/kilkunastu imiennie zaproszonych inwestorów** — istotna luka interpretacyjna |
| Polski akt implementujący | Ustawa z 7.07.2022 o finansowaniu społecznościowym dla przedsięwzięć gospodarczych (Dz.U. 2022 poz. 1488), nadzór KNF |
| Sankcje | Kary administracyjne KNF (do ok. 2 250 000 PLN lub 5% rocznego przychodu) oraz sankcje karne za działalność bez zezwolenia |
| Wniosek dla Tudor | Jeśli emisja jest w pełni prywatna (zamknięta grupa, imienne zaproszenia, brak otwartej platformy) — dobre argumenty za wyłączeniem spod ECSPR, ale **niepotwierdzone wprost przez ESMA/KNF dla scenariusza wieloosobowego** → rekomendacja: zapytanie/interpretacja KNF przed poleganiem na tej analizie |

## 7.2 AML/KYC/Travel Rule/sankcje — co obowiązuje już dziś

| Obszar | Stan na 30.07.2026 |
|---|---|
| Travel Rule (Rozporządzenie (UE) 2023/1113) | W pełni stosowane od 30.12.2024 r. Próg dodatkowej weryfikacji dla portfeli niehostowanych: **1000 EUR** (art. 14). Brak progu de minimis dla transferów między CASP. |
| AMLR (nowy pakiet UE, Rozporządzenie (UE) 2024/1624) | **Jeszcze nie obowiązuje dla CASP** — data pełnego stosowania to **10 lipca 2027 r.** Obecnie obowiązuje „stary" reżim krajowy + Travel Rule. |
| Polska ustawa AML (1.03.2018) | VASP jako instytucja obowiązana (art. 2 ust. 1 pkt 12) — status formalnie trwa, ale w praktyce podmioty z polskiego rejestru walut wirtualnych (RDWW) są w „podwójnej niespójności": nadal instytucje obowiązane, ale bez możliwości uzyskania licencji CASP w Polsce |
| Sankcje UE | Aktywny, rozbudowywany reżim wobec Rosji (20. pakiet 23.04.2026, 21. pakiet sygnalizowany ok. 23.07.2026) obejmujący m.in. zakazy dot. usług kryptoaktywowych; obowiązek screeningu sankcyjnego dotyczy **każdego podmiotu w UE**, niezależnie od statusu instytucji obowiązanej |
| KYC przy prywatnej emisji papierów wartościowych | Katalog instytucji obowiązanych w ustawie AML ma charakter zamknięty — zwykłe SPV emitujące własne papiery wartościowe bez pośrednictwa licencjonowanego podmiotu **prawdopodobnie nie staje się z tego tytułu samodzielnie instytucją obowiązaną** (hipoteza robocza, do potwierdzenia u prawnika), ale nadal podlega obowiązkowi screeningu sankcyjnego. Jeśli w emisję zaangażowany jest agent emisji (dom maklerski) — to on, jako firma inwestycyjna, przeprowadza KYC. |

---

# 8. Geofencing

> **Geofencing nie zmienia klasyfikacji prawnej tokena i nie jest samodzielnym wyłączeniem regulacyjnym. Jest jednym z elementów wykazania, do których państw oferta nie była kierowana.**

Potwierdza to również stanowisko ESMA ws. reverse solicitation (wytyczne ESMA35-1872330276-2030, ostateczne 26.02.2025, obowiązują od ok. 27.04.2025): wyjątek jest interpretowany **bardzo wąsko** — sam disclaimer „nie kierujemy oferty do UE" nie chroni, jeśli faktyczne działania (marketing, dostępność strony, follow-up, lokalna domena/język) wskazują inaczej. Nie znaleziono oficjalnych wytycznych ESMA ani KNF stwierdzających wprost, że geoblocking sam w sobie jest wystarczającym dowodem braku kierowania oferty — traktowany jest jako **element wspierający w ocenie całościowej**, nie samodzielna „bezpieczna przystań".

## 8.1 System wielowarstwowy

**Warstwa marketingowa:** niewyświetlanie reklam w zablokowanych państwach; wykluczenia lokalizacji w Google Ads/Meta/X i innych kanałach; brak influencerów kierujących treści do zablokowanych państw; brak lokalnych wersji językowych sugerujących aktywne kierowanie oferty; brak SEO/kampanii na frazy inwestycyjne w wyłączonych krajach; disclaimery o ograniczeniach terytorialnych.

**Warstwa strony internetowej:** kontrola IP i blokowanie krajów; komunikat o niedostępności zamiast strony ofertowej; niewyświetlanie ceny i przycisku zakupu poza dozwolonym obszarem; ograniczenie dostępu do dokumentów ofertowych za logowaniem; logowanie prób dostępu; wykrywanie VPN/proxy/Tor; ponowna kontrola przy rejestracji i zakupie (nie tylko przy pierwszym wejściu).

**Warstwa użytkownika:** deklaracja kraju zamieszkania i obywatelstwa; dokument potwierdzający adres; numer podatkowy; pełne KYC; screening sankcyjny i PEP; weryfikacja źródła środków przy określonych progach; zaakceptowanie „restricted persons statement"; blokada wielokrotnych kont (jeden inwestor = jedno konto).

**Warstwa blockchain:** transfer restrictions na poziomie smart kontraktu; whitelista portfeli; rola compliance administratora z uprawnieniami do zamrożenia transferów; kontrola mint i transfer; ograniczenie peer-to-peer poza whitelistą; możliwość wymuszonego transferu w przypadkach prawnych (nakaz sądu/spadek); rejestr statusu KYC bez ujawniania danych osobowych on-chain (dane osobowe **off-chain**, on-chain tylko hashe/identyfikatory — zgodnie z podejściem rekomendowanym przez unijne organy ochrony danych, patrz sekcja 9); procedura utraty klucza; procedura dziedziczenia; procedura śmierci inwestora; procedura wykonania nakazu organu/sądu.

**Warstwa dowodowa:** logi dostępu i transakcji; wersjonowanie regulaminów z datami; timestamp akceptacji dokumentów; dowód źródła ruchu (analytics); archiwizacja kampanii reklamowych; kopie komunikatów marketingowych; historia statusu KYC; zapis zastosowanych blokad geograficznych.

## 8.2 Macierz państw (orientacyjna — wymaga potwierdzenia prawnika lokalnego przed uruchomieniem)

| Kraj/region | Wstępna ocena | Uwaga |
|---|---|---|
| Polska | Rynek docelowy | Pełne KYC/AML + zgodność z krajowym prawem rynku kapitałowego |
| Pozostałe państwa EOG | Możliwe przy zgodności z MiCA (paszportowanie) / Rozporządzeniem Prospektowym | Wymaga analizy per state (niektóre kraje mają dodatkowe wymogi krajowe) |
| USA | **Domyślnie zablokować** | Reżim securities (Securities Act, Reg D/S) niezależny od UE, wysokie ryzyko egzekucji SEC |
| Wielka Brytania | **Domyślnie zablokować do opinii lokalnego prawnika** | Poza UE, własny reżim FCA (financial promotion regime) |
| Szwajcaria | **Domyślnie zablokować do opinii lokalnego prawnika** | Poza UE/EOG, własny reżim FINMA |
| ZEA | **Domyślnie zablokować do opinii lokalnego prawnika** | Odrębne reżimy (ADGM/DIFC/VARA), wysokie ryzyko błędnej kwalifikacji bez lokalnej opinii |
| Kanada | **Domyślnie zablokować do opinii lokalnego prawnika** | Odrębny reżim securities per prowincja |
| Australia | **Domyślnie zablokować do opinii lokalnego prawnika** | Odrębny reżim ASIC |
| Kraje objęte sankcjami UE (Rosja, Białoruś, Iran, Korea Płn. i in.) | **Zawsze zablokować** | Obowiązek screeningu sankcyjnego niezależny od modelu biznesowego |
| Pozostałe państwa trzecie | **Domyślnie zablokować do czasu analizy** | Zasada: brak analizy = brak dostępu |

**Nie przesądzamy dostępności w żadnym z powyższych krajów bez aktualnej, odrębnej analizy lokalnego prawnika** — powyższe to wyłącznie domyślne ustawienie ostrożnościowe do czasu takiej analizy.

## 8.3 Rozróżnienia pojęciowe

| Pojęcie | Definicja robocza |
|---|---|
| Geofencing | Techniczne blokowanie dostępu wg lokalizacji (IP, deklaracja) — element dowodowy, nie zwolnienie prawne |
| Reverse solicitation | Wyjątek dla sytuacji, gdy to klient z własnej, niezainicjowanej przez ofertującego inicjatywy zwraca się o usługę — interpretowany bardzo wąsko przez ESMA |
| Oferta transgraniczna | Świadczenie usługi/oferowanie instrumentu do klienta w innym państwie niż państwo emitenta — samo w sobie neutralne, ale uruchamia pytanie o właściwy reżim (paszport, notyfikacja, lokalne prawo) |
| Paszportowanie | Formalny mechanizm UE pozwalający na świadczenie usług w całej Unii na bazie jednej autoryzacji/notyfikacji w państwie macierzystym (np. art. 65 MiCA dla CASP, art. 11 MiCA dla whitepaper) |
| Aktywny marketing | Celowe kierowanie komunikacji do odbiorców w danym państwie (reklama, lokalna domena, język, SEO) — kluczowy element ustalający, czy oferta była „kierowana" do danego państwa |
| Przypadkowe wejście użytkownika na stronę | Brak zamierzonego kierowania — nie powinno samo w sobie tworzyć oferty w danym państwie, ale ryzyko rośnie, jeśli strona nie ma żadnych zabezpieczeń geograficznych |
| Rzeczywiste oferowanie tokena w danym państwie | Suma powyższych czynników oceniana całościowo przez organ nadzoru — nie ma jednego testu, decyduje kontekst |

---

# 9. Dokumentacja

## 9.1 Prywatna emisja inwestycyjna

| Dokument | Status |
|---|---|
| Legal classification memorandum (test z sekcji 6.3) | Obowiązkowy |
| Term sheet | Obowiązkowy |
| Uchwały korporacyjne SPV | Obowiązkowy |
| Umowa inwestycyjna | Obowiązkowy |
| Umowa pożyczki / warunki emisji obligacji / umowa udziału w przychodach | Obowiązkowy (zależny od wybranego modelu A/B/C) |
| Dokument ofertowy / memorandum informacyjne | Obowiązkowy, jeśli powyżej krajowego progu bez-dokumentowego; zależny od wartości emisji |
| Regulamin emisji | Rekomendowany |
| Umowa objęcia | Obowiązkowy |
| Polityka KYC/AML | Prawdopodobnie obowiązkowy (zależny od tego, czy emitent/pośrednik jest instytucją obowiązaną) |
| Procedura sankcyjna | Obowiązkowy (niezależnie od statusu instytucji obowiązanej) |
| Polityka reklamacyjna | Rekomendowany |
| Risk disclosure | Obowiązkowy (minimalizacja ryzyka regulacyjnego + UOKiK) |
| Dokument dot. konfliktów interesów (Tudor/Tokenuj/SPV) | Rekomendowany, prawdopodobnie obowiązkowy przy zaangażowaniu podmiotu regulowanego |
| Wycena nieruchomości | Obowiązkowy |
| Raport techniczny nieruchomości | Rekomendowany |
| Audyt prawny nieruchomości (w tym księga wieczysta) | Obowiązkowy |
| Biznesplan | Obowiązkowy |
| Model finansowy | Obowiązkowy |
| Dokumentacja zabezpieczeń (hipoteka/zastaw) | Zależny od konstrukcji |
| Waterfall płatności | Obowiązkowy |
| Polityka raportowania | Rekomendowany |
| Umowa z operatorem nieruchomości (zarządzanie najmem) | Zależny od konstrukcji |
| Umowa między Tudor a SPV | Obowiązkowy |
| Dokumentacja smart kontraktu | Obowiązkowy |
| Audyt smart kontraktu | Obowiązkowy (bezpieczeństwo + wiarygodność wobec inwestorów) |
| Polityka transferów (whitelist, ograniczenia) | Obowiązkowy |
| Polityka odzyskiwania dostępu (utrata klucza) | Rekomendowany |
| RODO / privacy policy | Obowiązkowy |
| Regulamin platformy | Obowiązkowy |
| Procedura defaultu SPV | Rekomendowany |
| Procedura wyjścia i likwidacji projektu | Rekomendowany |

## 9.2 Utility token

| Dokument | Status |
|---|---|
| Classification memorandum | Obowiązkowy |
| Crypto-asset whitepaper zgodny z MiCA (format iXBRL/XHTML) | Obowiązkowy, jeśli powyżej progów wyłączenia z art. 4 MiCA — **z zastrzeżeniem braku organu w Polsce (sekcja 6.4), notyfikacja przez podmiot z innego EOG** |
| Wyjaśnienie klasyfikacyjne do notyfikacji (dlaczego to nie ART/EMT/instrument finansowy) | Obowiązkowy przy notyfikacji |
| Regulamin sprzedaży tokena | Obowiązkowy |
| Regulamin korzystania z ekosystemu | Obowiązkowy |
| Opis utility (dokładny zakres funkcji) | Obowiązkowy |
| Regulamin voucherów | Zależny od konstrukcji |
| Regulamin programu partnerskiego | Zależny od konstrukcji |
| Zasady governance (jeśli głosowanie) | Zależny od konstrukcji |
| Polityka KYC/AML | Zależny od tego, czy dystrybucja odbywa się przez CASP |
| Polityka geofencingu | Rekomendowany, praktycznie obowiązkowy |
| Restricted countries policy | Rekomendowany |
| Privacy policy | Obowiązkowy (RODO) |
| Cookies policy | Obowiązkowy |
| Risk disclosure | Obowiązkowy |
| Polityka reklamacji | Rekomendowany |
| Procedura odstąpienia (14 dni, art. 13 MiCA) | Obowiązkowy dla nabywców detalicznych |
| Marketing communications policy | Obowiązkowy (art. 7 MiCA) |
| Tokenomics | Obowiązkowy |
| Dokumentacja techniczna | Obowiązkowy |
| Audyt smart kontraktów | Obowiązkowy |
| Sustainability disclosures | Zależny — obowiązkowy dla CASP (art. 66 MiCA); dla emitenta Tytułu II wymaga odrębnego potwierdzenia zakresu w art. 6/Zał. I MiCA |
| Zasady przechowywania tokenów | Rekomendowany |
| Procedura utraty portfela | Rekomendowany |
| Procedura zmian smart kontraktu | Rekomendowany |
| Incident response plan | Rekomendowany |
| Polityka cyberbezpieczeństwa | Rekomendowany |
| Warunki współpracy z CASP (jeśli dystrybucja przez zewnętrzny CASP) | Obowiązkowy, jeśli dotyczy |
| Polityka listingu i płynności | Rekomendowany |

---

# 10. Korzyści dla emitenta (Tudor)

| Korzyść | Wartość biznesowa | Warunek wdrożenia | Ryzyko | KPI |
|---|---|---|---|---|
| Nowe źródło przychodów (fee od emisji/platformy) | Dywersyfikacja poza prowizję pośrednictwa | Wolumen wystarczający do pokrycia kosztów wdrożenia | Niski popyt w pilotażu | Przychód z fee / kwartał |
| Obsługa inwestorów, nie tylko kupujących | Nowy segment klienta o innej częstotliwości kontaktu | Osobny proces onboardingu inwestora | Kanibalizacja uwagi zespołu sprzedażowego | Liczba aktywnych inwestorów |
| Finansowanie konkretnych projektów | Alternatywa dla kredytu bankowego | Dobrze zdefiniowany projekt pilotażowy | Niedomknięta emisja (patrz sekcja 15 — obiekcje) | % zebranej kwoty vs cel |
| Szybsze testowanie zainteresowania projektem | Walidacja popytu przed pełnym zaangażowaniem kapitału | Jasne kryteria sukcesu pilotażu | Fałszywie pozytywny/negatywny sygnał przy małej próbie | Czas do zebrania pierwszych X% |
| Budowanie własnej bazy inwestorów | Aktyw długoterminowy, niezależny od jednej transakcji | CRM i zgody marketingowe | Koszt utrzymania relacji | Wielkość bazy, retencja |
| Zwiększenie powtarzalności relacji z klientem | Klient inwestor wraca przy kolejnych projektach | Jakość pierwszego doświadczenia | Zawód przy pierwszym projekcie niszczy zaufanie do kolejnych | % inwestorów powracających |
| Program lojalnościowy | Wyższe LTV klienta | Utility token z sekcji 5 | Nadmierna komplikacja dla małej firmy | Aktywność w programie |
| Cross-selling usług (kredyt, notariusz, remont) | Dodatkowe przychody partnerskie | Sieć partnerów | Jakość partnerów wpływa na markę Tudor | Liczba transakcji cross-sell |
| Community | Organiczny marketing, niższy CAC | Aktywne moderowanie | Wymaga czasu/zasobów | Zaangażowanie community |
| Pozyskiwanie leadów | Nowy kanał akwizycji | Landing page + content | Koszt pozyskania | Koszt/lead |
| Dostęp do klientów zagranicznych po zapewnieniu compliance | Rozszerzenie rynku (Niemcy/Skandynawia — bliskość Szczecina) | Pełna analiza geofencingu per kraj | Wysokie ryzyko regulacyjne bez lokalnej opinii | Liczba inwestorów zagranicznych |
| Częściowa automatyzacja rozliczeń | Niższe koszty administracyjne w skali | Wdrożona platforma | Koszt wdrożenia > oszczędności przy małej skali | Czas obsługi/inwestora |
| Transparentne raportowanie | Wzrost zaufania, przewaga konkurencyjna | Panel inwestora | Koszt utrzymania | NPS inwestorów |
| Program partnerski dla agentów i klientów | Motywacja zespołu i sieci | Jasne zasady prowizyjne | Konflikt z modelem prowizyjnym pośrednictwa | Liczba aktywnych partnerów |
| Przewaga wizerunkowa | Pozycjonowanie jako trendsetter | Spójna komunikacja (sekcja 5.3) | Ryzyko wizerunkowe przy błędzie regulacyjnym (odwrotność korzyści) | Udział głosu w mediach lokalnych |
| Wyróżnienie na rynku szczecińskim | Pierwszeństwo „first mover" | Rzeczywiste wdrożenie, nie tylko zapowiedź | Konkurencja może skopiować szybciej niż Tudor zbuduje przewagę | Udział w rynku lokalnym |
| Osobna marka inwestycyjna | Separacja ryzyka i pozycjonowania | Decyzja Konrada (sekcja 13) | Koszt budowy drugiej marki | Rozpoznawalność marki |
| Współpraca z deweloperami/właścicielami gruntów | Nowy kanał pozyskiwania projektów | Reputacja po pilotażu | Zależność od jakości pierwszego projektu | Liczba ofert od deweloperów |
| Zarządzanie portfelem nieruchomości | Nowy, powtarzalny strumień przychodu (fee za zarządzanie) | Zasoby operacyjne | Odpowiedzialność za jakość zarządzania | AUM (assets under management) |
| Możliwość tworzenia kolejnych SPV | Powtarzalny model po pilotażu | Sukces pierwszego SPV | Ryzyko rozcieńczenia uwagi na wiele projektów naraz | Liczba kolejnych emisji/rok |
| Dane o zachowaniu klientów i popycie | Lepsze decyzje produktowe/marketingowe | Analityka platformy | RODO — ograniczenia w wykorzystaniu danych | Jakość segmentacji klientów |

---

# 11. Korzyści i ryzyka dla inwestora/użytkownika

## 11.1 Emisja prywatna

**Korzyści:** niższy próg wejścia (jeśli konstrukcja i prawo na to pozwalają) · dostęp do konkretnych, lokalnie znanych projektów · cyfrowe raportowanie · automatyzacja świadczeń · transparentność przepływów · uporządkowany onboarding · możliwość kontrolowanego obrotu wtórnego, jeśli prawnie dopuszczalny.

**Ryzyka:** utrata całości kapitału · ryzyko deweloperskie (opóźnienia, przekroczenie budżetu) · ryzyko wyceny (nieruchomość warta mniej niż zakładano) · ryzyko najemcy (pustostany, niepłacenie) · brak płynności (token trudny do zbycia przed terminem) · niewypłacalność SPV · ryzyko prawne (błędna klasyfikacja, zmiana przepisów) · ryzyko podatkowe (niejasna kwalifikacja, patrz sekcja 6/9) · ryzyko smart kontraktu (błąd, podatność) · utrata klucza dostępu · ryzyko operatora nieruchomości · opóźnienia w realizacji projektu · brak gwarancji sprzedaży nieruchomości po zakładanej cenie.

## 11.2 Utility token

**Korzyści:** tańsze usługi (rabaty) · lepszy dostęp (early access, off-market) · pierwszeństwo obsługi · dodatkowe funkcje platformy · udział w społeczności · korzyści partnerskie (kredyt, notariusz, remont).

**Ryzyka:** utrata wartości tokena · ograniczona płynność (brak gwarantowanego rynku wtórnego) · zmiana zakresu usług przez emitenta · awaria techniczna platformy/smart kontraktu · zakończenie projektu przez Tudor/Tokenuj · ograniczenia terytorialne (geofencing może wykluczyć część użytkowników) · ryzyko regulacyjne (zmiana klasyfikacji tokena w trakcie życia projektu) · **brak systemu gwarancji depozytów lub rekompensat** (utility token nie jest objęty żadnym systemem ochrony analogicznym do depozytów bankowych).

---

# 12. Porównanie ofert

| Kryterium | Ścieżka 1 — Prywatna emisja inwestycyjna | Ścieżka 2 — Publiczny utility token |
|---|---|---|
| Główny cel | Finansowanie konkretnej nieruchomości/portfela | Rozwój ekosystemu usług Tudor |
| Odbiorcy | Ograniczona, imiennie zaproszona grupa (inwestorzy kwalifikowani/detaliczni) | Szeroki krąg klientów Tudor (kupujący, sprzedający, najemcy, wynajmujący) |
| Źródło wartości tokena | Prawa ekonomiczne do nieruchomości/SPV | Użyteczność w ekosystemie usług |
| Prawa posiadacza | Wierzytelność/udział/przychód (zależnie od modelu A/B/C) | Dostęp do usług/rabaty/funkcje |
| Publiczny marketing | **Ograniczony/zakazany** poza wąskim kręgiem (ryzyko utraty wyłączenia z prospektu, art. 53 ustawy o ofercie publicznej) | Możliwy, w granicach uczciwych praktyk rynkowych i art. 7 MiCA |
| Klasyfikacja regulacyjna | Prawdopodobnie papier wartościowy/instrument finansowy, poza MiCA | Prawdopodobnie utility token w rozumieniu MiCA (jeśli zaprojektowany zgodnie z sekcją 5) |
| Wymagane dokumenty | Sekcja 9.1 (ok. 27 dokumentów) | Sekcja 9.2 (ok. 27 dokumentów) |
| Potencjalne licencje | Brak licencji CASP; możliwy wymóg rejestracji ZASI (AFI); ew. agent emisji (dom maklerski) | Notyfikacja whitepaper MiCA (obecnie przez podmiot z innego EOG, patrz 6.4); ew. CASP jeśli dystrybucja przez zewnętrzną platformę |
| KYC | Obowiązkowy, dostosowany do progu i statusu inwestora | Zależny od skali i sposobu dystrybucji |
| Geofencing | Kluczowy dla zachowania wyłączenia z prospektu | Kluczowy dla ograniczenia odpowiedzialności terytorialnej |
| Wielkość możliwej emisji | Do progu wyłączenia z prospektu (5–12 mln EUR/12 mies. — zależnie od finalnego polskiego progu) | Do 1 mln EUR/12 mies. bez whitepaper; powyżej — pełny whitepaper |
| Czas wdrożenia | Dłuższy (struktura prawna SPV, due diligence nieruchomości) | Krótszy dla wersji podstawowej (rdzeń: dostęp do usług) |
| Koszt wdrożenia | Wyższy (struktura SPV, dokumentacja inwestycyjna, wycena, audyt) | Niższy dla wersji podstawowej, rośnie z zakresem funkcji |
| Koszty utrzymania | Raportowanie okresowe, obsługa prawna SPV, audyt | Utrzymanie platformy, aktualizacje whitepaper |
| Płynność | Niska, zależna od zorganizowanego obrotu wtórnego | Zależna od skali ekosystemu i ew. listingu (z zastrzeżeniem ryzyk z sekcji 16) |
| Ryzyko prawne | Wysokie przy błędnej klasyfikacji (AFI, papier wartościowy bez zgodności z Prospektowym) | Średnie — głównie ryzyko „ukrytej" cechy inwestycyjnej (substance over form) |
| Atrakcyjność dla Tudor | Bezpośrednie finansowanie projektów, twardy KPI (zebrana kwota) | Budowa marki i lojalności, miękkie KPI w krótkim terminie |
| Łatwość sprzedaży (na spotkaniu) | Wymaga konkretnego projektu pilotażowego | Łatwiejsza do zrozumienia bez konkretnego aktywa |
| Skalowalność | Skalowalna przez kolejne SPV/emisje | Skalowalna organicznie z bazą klientów |
| Możliwość powtarzania | Tak, każda nieruchomość = nowa emisja/SPV | Tak, jeden token, rozwijany funkcjonalnie |

**Widełki kosztowe wdrożenia — orientacyjne, wymagają dostosowania po warsztacie discovery:**

| Wariant | Orientacyjne widełki (jednorazowo) | Orientacyjne koszty utrzymania (rocznie) |
|---|---|---|
| Podstawowy (jedna ścieżka, prosty smart kontrakt, zamknięty onboarding) | do doprecyzowania po discovery — zależne od zakresu prawnego i liczby jurysdykcji | do doprecyzowania |
| Rozszerzony (platforma inwestora, panel emitenta, płatności, raportowanie) | do doprecyzowania po discovery | do doprecyzowania |
| Ekosystemowy (utility token, marketplace, aplikacja, integracje partnerskie) | do doprecyzowania po discovery | do doprecyzowania |

*Celowo nie podaję tu konkretnych kwot PLN/EUR — zależą od zakresu prawnego (liczba jurysdykcji, model A/B/C), wybranej infrastruktury technologicznej i tego, czy Tokenuj korzysta z własnych, czy partnerskich licencji CASP. To temat na komercyjną rozmowę po warsztacie discovery, nie na pierwsze spotkanie.*

---

# 13. Rekomendowany model dla Tudor

**Zastrzeżenie:** poniższa rekomendacja opiera się na ograniczonych publicznie dostępnych danych o Tudor (sekcja 2) i musi zostać zweryfikowana odpowiedziami z discovery (sekcja 3). Nie traktuj jej jako gotowej decyzji do przedstawienia jako fakt dokonany — przedstaw ją jako **punkt wyjścia do dyskusji**.

## Etap 1 — Pilotaż prywatny (Ścieżka 1)
Jedna konkretna nieruchomość · osobne SPV · ograniczona grupa inwestorów (np. istniejący klienci/kontakty Tudor) · pełne KYC · brak masowej reklamy · zamknięty panel inwestora · kontrolowany smart kontrakt (whitelist, brak wolnego obrotu wtórnego na start) · cykliczne raportowanie · cel: potwierdzenie popytu i dopracowanie procesu przy niskim ryzyku regulacyjnym i wizerunkowym.

**Dlaczego od tego zacząć:** mała skala pilotażu prawdopodobnie mieści się poniżej progów wymagających pełnego prospektu i licencji CASP; buduje realny dowód koncepcji (nie tylko deklarację) do wykorzystania w materiałach dla przyszłych inwestorów i w PR; nie wymaga rozwiązania kwestii braku organu MiCA w Polsce, bo Ścieżka 1 prawdopodobnie w ogóle nie podlega MiCA.

## Etap 2 — Ekosystem publiczny (Ścieżka 2)
Utility token Tudor · zniżki · priorytetowy dostęp · program partnerski · community · płatne funkcje · rozbudowa sieci partnerów · wdrożenie zgodne z MiCA odpowiednie do finalnej klasyfikacji (notyfikacja przez podmiot z innego EOG, jeśli w Polsce nadal brak organu właściwego).

**Dlaczego po pilotażu, nie równolegle:** Etap 2 korzysta z wiarygodności zbudowanej w Etapie 1 („Tudor już to zrobił, to działa"); rozdzielenie w czasie zmniejsza ryzyko pomieszania narracji inwestycyjnej i użytkowej (patrz niżej).

## Separacja obu tokenów — odpowiedź na pytanie z briefu

**Tak, oba tokeny powinny być całkowicie oddzielone:**
- **Prawnie:** różne reżimy (papier wartościowy/Prospektowy vs. MiCA Tytuł II) — połączenie w jednym instrumencie tworzy hybrydę podlegającą najsurowszemu z obu reżimów.
- **Ekonomicznie:** wartość utility tokena nie może być powiązana z wynikiem finansowym projektów nieruchomościowych — inaczej przejmuje cechy inwestycyjne.
- **Technologicznie:** osobne smart kontrakty — współdzielona infrastruktura zwiększa ryzyko, że błąd/incydent w jednym projekcie wpłynie na drugi.
- **Marketingowo:** osobna komunikacja — użytkownik utility tokena nie powinien nigdy zobaczyć komunikatu sugerującego, że jego token jest powiązany z wynikiem inwestycji nieruchomościowej.
- **Poprzez osobne strony i dokumentację:** osobne domeny/podstrony, osobne regulaminy, osobne whitepapers/memoranda.

**Ryzyko połączenia (do wprost wyartykułowania Konradowi):** jeśli utility token Tudor zacznie być komunikowany razem z projektami inwestycyjnymi (np. „posiadacze utility tokena dostają dostęp do najlepszych ofert inwestycyjnych z dyskontem na wejściu do SPV"), realne staje się ryzyko, że **cały utility token zostanie przekwalifikowany jako instrument finansowy** — bo w oczach regulatora i przeciętnego odbiorcy staje się furtką do produktu inwestycyjnego. To zniweczyłoby całą przewagę modelu utility (brak whitepaper poniżej progu, prostszy marketing, brak reżimu prospektowego).

---

# 14. Scenariusz spotkania (45–60 minut)

## Otwarcie (2–3 minuty) — dosłowny tekst

> „Konrad, dzięki że znalazłeś czas. Zanim powiem cokolwiek o technologii czy przepisach, chcę zrozumieć, gdzie dziś jest Tudor i dokąd chcesz go zaprowadzić. Wiem, że rozwijacie wolumen transakcji, jakość obsługi i marketing, i że zależy Ci, żeby Tudor był postrzegany jako lider, a nie tylko kolejne biuro nieruchomości w Szczecinie. Chciałbym dziś porozmawiać o dwóch rzeczach, które robimy w Tokenuj i które — jeśli będą pasować do Twojego biznesu — mogą Ci w tym pomóc: sposobie na pozyskanie kapitału na konkretne projekty nieruchomościowe bez klasycznego kredytu, oraz sposobie na zbudowanie własnego ekosystemu lojalnościowego wokół Twojej marki. Ale zanim przejdę do szczegółów — chcę najpierw zadać Ci kilka pytań o to, jak dziś wygląda Twój biznes, żebyśmy nie tracili czasu na rozwiązania, które się nie dopasują."

## Discovery
*(Pełna lista 32 pytań — sekcja 3 powyżej. W spotkaniu 45–60 min realistycznie zadasz 8–12 najważniejszych — priorytetyzuj pytania biznesowe i finansowe [1–13], dodaj 2–3 prawne, resztę zostaw na warsztat discovery.)*

## Prezentacja dwóch modeli (po 4–5 minut każdy)

### 1. Prywatna emisja inwestycyjna
- **Problem:** finansowanie zakupu/remontu konkretnej nieruchomości dziś oznacza albo kredyt bankowy (wolny, sztywny, wymaga zdolności kredytowej), albo własny kapitał (ogranicza skalę), albo wspólnicy (komplikują strukturę własności).
- **Rozwiązanie:** Tudor identyfikuje projekt, Tokenuj strukturyzuje prawnie i technologicznie sposób, w jaki grono zaproszonych inwestorów może sfinansować go wspólnie — z jasnymi zasadami spłaty/udziału w zysku, cyfrowym raportowaniem i uporządkowanym procesem prawnym.
- **Mechanizm:** SPV kupuje/remontuje nieruchomość, inwestorzy wchodzą jako wierzyciele lub udziałowcy (zależnie od struktury), rozliczenia i raportowanie odbywają się przez panel inwestora.
- **Korzyści:** nowe źródło kapitału niezależne od banku; twardy dowód popytu na kolejne projekty; baza inwestorów do wykorzystania przy następnych nieruchomościach.
- **Ograniczenia:** to nie jest publiczna zbiórka — krąg inwestorów musi być ograniczony i dobrze poprowadzony prawnie; wymaga realnego, konkretnego projektu na start.
- **Przykład:** jedna kamienica do remontu w Szczecinie, 8–15 zaproszonych inwestorów, jasny harmonogram spłaty z przychodu z najmu po remoncie.
- **Następny krok:** wybór konkretnej nieruchomości pod pilotaż i warsztat discovery.

### 2. Publiczny utility token
- **Problem:** dziś relacja Tudor z klientem kończy się zwykle na jednej transakcji — brak mechanizmu, który utrzymuje kontakt i buduje lojalność między transakcjami, oraz brak narzędzia budującego markę „Tudor jako ekosystem", a nie „Tudor jako pojedynczy agent".
- **Rozwiązanie:** token dający dostęp do realnych korzyści w ekosystemie usług Tudor — wcześniejszy dostęp do ofert, rabaty, priorytetowa obsługa, społeczność.
- **Mechanizm:** klienci zdobywają/kupują token, wykorzystują go do korzystania z usług Tudor i partnerów — bez obietnicy zwrotu finansowego.
- **Korzyści:** budowa własnej, mierzalnej bazy lojalnych klientów; cross-selling z partnerami (kredyt, notariusz, remont); wizerunek innowatora na rynku szczecińskim.
- **Ograniczenia:** to nie jest produkt inwestycyjny i nigdy nie powinien być tak komunikowany — inaczej wraca całe ryzyko prawne Ścieżki 1.
- **Przykład:** posiadacz tokena dostaje 48h wcześniejszy dostęp do nowych ofert i 10% rabatu na przygotowanie nieruchomości do sprzedaży.
- **Następny krok:** warsztat discovery nad zakresem funkcji i priorytetyzacją utility.

## Obiekcje Konrada — odpowiedzi

| Obiekcja | Odpowiedź |
|---|---|
| Po co token, skoro można zrobić zwykłą spółkę/pożyczkę? | Token nie zastępuje umowy — jest warstwą techniczną nad nią: automatyzuje raportowanie, ułatwia zarządzanie wieloma inwestorami, daje przejrzystość. Prawna podstawa (pożyczka/udział) pozostaje taka sama jak w klasycznym modelu. |
| Czy token gwarantuje płynność? | Nie i nikt uczciwie tego nie obieca — płynność zależy od zorganizowania rynku wtórnego, którego na starcie nie ma. Mówimy o tym wprost, bo to jedno z realnych ryzyk dla inwestora. |
| Czy możemy reklamować to publicznie? | Zależy od ścieżki: prywatna emisja — nie, publiczna reklama niszczy wyłączenie z prospektu i grozi sankcjami; utility token — tak, w granicach uczciwej reklamy. |
| Czy potrzebujemy zgody KNF? | Zależy od skali i konstrukcji — dla małego pilotażu prywatnego prawdopodobnie nie (poniżej progu prospektowego); dla utility tokena obowiązek zależy od tego, czy przekroczysz próg 1 mln EUR/12 mies. i czy zdecydujemy się notyfikować whitepaper. To ustalimy dokładnie w warsztacie discovery z prawnikiem. |
| Czy możemy sprzedawać tokeny za granicą? | Technicznie tak, prawnie wymaga to odrębnej analizy per kraj — nie zakładamy tego automatycznie, budujemy geofencing i rozszerzamy rynek stopniowo, po opinii prawnej. |
| Czy wystarczy zablokować USA? | Nie — inne jurysdykcje (UK, Szwajcaria, ZEA, Kanada, Australia) mają własne reżimy i wymagają osobnej analizy, nie jednego wyjątku. |
| Czy geofencing chroni nas prawnie? | Sam w sobie nie — to jeden z elementów dowodowych, nie tarcza. Chroni w połączeniu z resztą compliance (KYC, dokumentacja, ograniczony marketing). |
| Czy utility token może rosnąć na wartości? | Może się tak zdarzyć organicznie wraz z rozwojem ekosystemu, ale nigdy tego nie obiecujemy ani nie projektujemy jako mechanizmu — inaczej przestaje być utility tokenem w sensie prawnym. |
| Czy możemy obiecać inwestorowi określony zwrot? | Nie — to jest właśnie granica między legalną strukturą a obietnicą, której nie możemy dotrzymać z pewnością. Możemy pokazać model finansowy i założenia, nie gwarancję. |
| Czy możemy wypłacać czynsz w stablecoinie? | Technicznie możliwe, ale wymaga dodatkowej analizy (stablecoin jako e-money token pod MiCA, obowiązki podmiotu wypłacającego) — nie zakładamy tego bez sprawdzenia. |
| Co się stanie, gdy inwestor zgubi portfel? | Potrzebujemy jasnej, opisanej z góry procedury odzyskiwania dostępu — to element dokumentacji, którą przygotowujemy dla każdego projektu. |
| Czy inwestor rzeczywiście posiada fragment nieruchomości? | Zależy od modelu: w Modelu A jest wierzycielem SPV (nie współwłaścicielem nieruchomości), w Modelu B może posiadać udział korporacyjny w SPV, które jest właścicielem. To rozróżnienie musimy jasno komunikować, żeby nie wprowadzać w błąd. |
| Czy token można sprzedać na giełdzie? | Nie na starcie i nie obiecujemy tego — listing wiąże się z dodatkowymi wymogami i ryzykami, które omówimy, jeśli w ogóle będzie rozważany w przyszłości. |
| Ile trwa wdrożenie? | Zależy od wybranego wariantu — szczegóły w roadmapie (sekcja 17), dokładne ramy czasowe ustalimy po warsztacie discovery. |
| Ile kosztuje wdrożenie? | Przedstawimy widełki po discovery — zależą od zakresu prawnego, liczby jurysdykcji i wybranego wariantu (podstawowy/rozszerzony/ekosystemowy). |
| Kto odpowiada za dokumenty? | Tokenuj przygotowuje dokumentację przy współpracy z kancelarią prawną — Tudor i SPV podejmują ostateczne decyzje biznesowe i podpisują dokumenty jako strona. |
| Co się stanie, jeżeli projekt nie zbierze całej kwoty? | To ustalamy z góry w warunkach emisji — typowo: próg minimalny, poniżej którego środki są zwracane inwestorom (all-or-nothing) lub projekt jest finansowany częściowo z korektą zakresu. |
| Jak budujemy zaufanie inwestorów? | Transparentna dokumentacja, niezależna wycena, audyt smart kontraktu, realne raportowanie, i — najważniejsze — brak przesadzonych obietnic w marketingu. |
| Dlaczego Tudor ma być emitentem/organizatorem? | Bo to Tudor zna lokalny rynek, ma relację z klientami i wiarygodność w Szczecinie — Tokenuj dostarcza strukturę prawną i technologię, ale zaufanie do konkretnej nieruchomości buduje Tudor. |
| Jak Tokenuj zarabia na projekcie? | Wynagrodzenie za wdrożenie (jednorazowe) i/lub opłata za utrzymanie platformy (cykliczna) — model rozliczeń ustalimy transparentnie po ustaleniu zakresu projektu. |

## Zamknięcie rozmowy — dosłowny skrypt

> „Konrad, nie oczekuję, że dziś podejmiesz decyzję o pełnym wdrożeniu — to byłoby nieodpowiedzialne z mojej strony, bo dobrze zrobiony projekt wymaga solidnego przygotowania. To, o co chcę Cię dziś poprosić, to zgoda na cztery konkretne, ograniczone kroki: po pierwsze, wspólny warsztat discovery, na którym dokładnie zmapujemy Twoje cele, dostępne projekty i grupę potencjalnych inwestorów. Po drugie, wybór jednej konkretnej nieruchomości, którą moglibyśmy potraktować jako pilotaż. Po trzecie, udostępnienie nam podstawowych danych o tej nieruchomości i Twoim dotychczasowym biznesie, żebyśmy mogli przygotować wstępną architekturę prawno-biznesową. Po czwarte — na tej podstawie przygotujemy dwa warianty budżetu, żebyś mógł podjąć świadomą decyzję go/no-go, bez żadnego zobowiązania na tym etapie. Czy to brzmi jak rozsądny następny krok?"

---

# 15. Odpowiedzi na obiekcje
*(Zintegrowane w sekcji 14 powyżej — tabela obiekcji jest częścią scenariusza spotkania zgodnie z żądaną strukturą numerowaną).*

---

# 16. Zamknięcie rozmowy
*(Skrypt zamykający — patrz sekcja 14, „Zamknięcie rozmowy — dosłowny skrypt").*

---

# 17. Roadmapa

## Wariant podstawowy
**Etapy:** analiza i klasyfikacja prawna → dokumentacja → prosty smart kontrakt → zamknięty onboarding → brak obrotu wtórnego na start.
**Zależności:** wybór konkretnej nieruchomości/projektu pilotażowego; dostępność danych od Tudor.
**Odpowiedzialność:** Tokenuj — struktura prawna, dokumentacja, technologia; Tudor — sourcing nieruchomości, relacja z inwestorami, dane wejściowe.
**Ryzyka:** błędna klasyfikacja bez dogłębnej analizy prawnej; niedoszacowanie czasu na due diligence nieruchomości.
**Orientacyjny czas:** do ustalenia po discovery (zależny od gotowości dokumentacji nieruchomości).
**Orientacyjne widełki kosztowe / koszty utrzymania:** do doprecyzowania po discovery (sekcja 12).

## Wariant rozszerzony
**Etapy:** wszystko z wariantu podstawowego + platforma inwestora + panel emitenta + pełne KYC + integracja płatności + raportowanie automatyczne + dystrybucja świadczeń + zaawansowana dokumentacja (waterfall, procedury defaultu).
**Zależności:** sukces/wnioski z wariantu podstawowego (jeśli realizowany etapowo); wybór dostawcy KYC/płatności.
**Odpowiedzialność:** Tokenuj — pełny stack technologiczny i compliance; Tudor — operacyjne zarządzanie nieruchomością i relacją z inwestorami.
**Ryzyka:** wyższa złożoność projektu, dłuższy czas wdrożenia, wyższe wymagania co do jakości danych i procesów Tudor.
**Orientacyjny czas / koszty:** do doprecyzowania po discovery.

## Wariant ekosystemowy
**Etapy:** utility token Tudor + program partnerski + marketplace usług + community + aplikacja + kolejne emisje SPV + integracje z zewnętrznymi partnerami (kredyt, notariusz, remont, zarządzanie najmem).
**Zależności:** dojrzałość marki i bazy klientów Tudor; wynik pilotażu Ścieżki 1 (wiarygodność) — rekomendowane uruchomienie po Etapie 1, nie równolegle (patrz sekcja 13).
**Odpowiedzialność:** Tokenuj — platforma i zgodność z MiCA; Tudor — sieć partnerów i zaangażowanie community.
**Ryzyka:** największe ryzyko pomieszania narracji inwestycyjnej i utility (sekcja 13); wymaga dyscypliny komunikacyjnej w czasie.
**Orientacyjny czas / koszty:** do doprecyzowania po discovery, istotnie wyższe niż warianty poprzednie ze względu na zakres funkcjonalny.

---

# 18. Materiały do przedstawienia

Poniżej zarys zawartości każdego materiału (do przygotowania jako osobne pliki/slajdy na bazie tego dokumentu):

1. **Jednostronicowa ściąga na spotkanie** → patrz sekcja 20 „Ściąga Michała".
2. **Executive summary** → sekcja 1 (najważniejsze wnioski) w formie skróconej, 1 strona.
3. **Dwie jednostronicowe karty ofert** → oparte na sekcji 14 „Prezentacja dwóch modeli" (problem/rozwiązanie/mechanizm/korzyści/ograniczenia/przykład/następny krok).
4. **Tabela porównawcza** → sekcja 12, gotowa do wklejenia do prezentacji.
5. **Roadmapa wdrożenia** → sekcja 17, w formie trzech kolumn (podstawowy/rozszerzony/ekosystemowy).
6. **Checklista dokumentów** → sekcja 9 (tabele 9.1 i 9.2).
7. **Schemat przepływu środków** → do zwizualizowania na bazie sekcji 4 (Inwestor → SPV → wykonawca/sprzedawca → najem/sprzedaż → SPV → Inwestor).
8. **Schemat struktury SPV** → Tudor (sourcing/zarządzanie) — SPV (właściciel nieruchomości) — Tokenuj (struktura/technologia) — Inwestorzy (kapitał).
9. **Schemat geofencingu i whitelisty** → na bazie sekcji 8 (pięć warstw: marketing, strona, użytkownik, blockchain, dowodowa).
10. **Lista pytań discovery** → sekcja 3, gotowa do wydruku jako checklista na warsztat.
11. **Lista czerwonych flag** → sekcja 19.
12. **Lista zakazanych obietnic marketingowych** → sekcja 5.2 i 5.3.
13. **FAQ dla Konrada** → tabela obiekcji z sekcji 14.
14. **Propozycja maila podsumowującego spotkanie** → szkic poniżej.
15. **Zarys późniejszej prezentacji dla inwestorów** → do przygotowania po wyborze konkretnego projektu pilotażowego (zawiera: opis nieruchomości, wycenę, harmonogram, warunki emisji, ryzyka) — nie tworzyć przed wyborem projektu.
16. **Propozycja pilotażu na pierwszej nieruchomości** → szablon do wypełnienia po warsztacie discovery (adres, typ, budżet, harmonogram, grupa docelowa inwestorów).

**Szkic maila podsumowującego (do wysłania po spotkaniu):**
> Temat: Podsumowanie rozmowy — tokenizacja nieruchomości dla Tudor
>
> Cześć Konrad,
>
> Dzięki za rozmowę. W skrócie omówiliśmy dwa kierunki: (1) prywatną emisję inwestycyjną dla konkretnej nieruchomości oraz (2) publiczny token użytkowy rozwijający ekosystem usług Tudor. Ustaliliśmy, że kolejnym krokiem jest [warsztat discovery / wybór projektu pilotażowego / inne — dopasować do faktycznych ustaleń]. W załączniku przesyłam materiały, o których mówiliśmy. Zaproponuję konkretny termin warsztatu w ciągu [X] dni.
>
> Pozdrawiam,
> [Michał]

---

# 19. Czerwone flagi — czego nie obiecywać na spotkaniu

| Nigdy nie mów | Dlaczego to fałsz/ryzyko |
|---|---|
| „Token jest poza regulacjami" | Nieprawda — klasyfikacja zależy od treści praw, nie od tego, czy ktoś nazwał coś tokenem |
| „To nie jest instrument finansowy, bo nazwaliśmy go utility" | Substance over form — nazwa nie przesądza klasyfikacji (sekcja 6.1) |
| „Geofencing całkowicie rozwiązuje problem prawa zagranicznego" | To jeden element dowodowy, nie samodzielne zwolnienie (sekcja 8) |
| „Token zawsze będzie płynny" | Płynność nie jest gwarantowana, wymaga zorganizowanego rynku wtórnego, którego często nie ma |
| „Nieruchomość gwarantuje bezpieczeństwo" | Nieruchomości tracą na wartości, generują ryzyko najemcy/pustostanów — brak gwarancji |
| „Inwestor jest właścicielem nieruchomości tylko dlatego, że posiada token" | Zależy od modelu — w Modelu A jest wierzycielem SPV, nie współwłaścicielem |
| „KNF nie ma nic do tego" | KNF ma kompetencje wobec prospektu/memorandum, ASI, i docelowo MiCA — nie da się tego pominąć |
| „Nie potrzebujemy KYC" | Ryzyko sankcyjne obowiązuje zawsze, niezależnie od statusu instytucji obowiązanej |
| „Możemy publicznie reklamować prywatną ofertę" | Niszczy wyłączenie z prospektu, narusza art. 53 ustawy o ofercie publicznej |
| „Smart kontrakt zastępuje wszystkie umowy" | Polskie prawo (np. art. 180 KSH) wymaga określonych form prawnych, których smart kontrakt nie zastępuje |
| „Utility token gwarantuje wzrost ceny" | Zakazana obietnica — przesuwa token w stronę instrumentu finansowego (sekcja 5.2) |
| „Listing można zapewnić" | Listing zależy od zewnętrznych podmiotów (giełdy/CASP) i nie jest czymś, co można obiecać z góry |
| „Zwrot jest gwarantowany" | Nigdy nie wolno tego obiecać — to najbardziej ryzykowne możliwe zdanie na całym spotkaniu, wprost analogiczne do zarzutów UOKiK wobec condohoteli (sekcja 5.3) |

---

# 20. Źródła

**Nota:** poniższe źródła zostały zebrane metodą WebSearch (z ograniczeniami opisanymi w nocie metodologicznej na początku dokumentu). Data weryfikacji dla wszystkich: **30 lipca 2026 r.**, chyba że wskazano inaczej.

**MiCA i ESMA:**
- Rozporządzenie (UE) 2023/1114 (MiCA), wersja skonsolidowana — eur-lex.europa.eu/eli/reg/2023/1114/2024-01-09/eng
- ESMA, Guidelines on the conditions and criteria for the qualification of crypto-assets as financial instruments, ESMA75-453128700-1323, final report 17.12.2024, tłumaczenia 19.03.2025, stosowane od 18.05.2025 — esma.europa.eu/document/guidelines-conditions-and-criteria-qualification-crypto-assets-financial-instruments
- ESMA, Guidelines on reverse solicitation under MiCA, ESMA35-1872330276-2030, final 26.02.2025 — esma.europa.eu/sites/default/files/2025-02/ESMA35-1872330276-2030_Guidelines_on_reverse_solicitation_under_MiCA.pdf
- ESMA, Advice on Initial Coin Offerings and Crypto-Assets, ESMA50-157-1391, 9.01.2019 — esma.europa.eu/sites/default/files/library/esma50-157-1391_crypto_advice.pdf

**Rozporządzenie Prospektowe i MiFID II:**
- Rozporządzenie (UE) 2017/1129, wersja skonsolidowana od 5.06.2026 — eur-lex.europa.eu/eli/reg/2017/1129/2026-06-05/eng
- Rozporządzenie (UE) 2024/2809 (EU Listing Act) — publikacja 14.11.2024
- Dyrektywa 2014/65/UE (MiFID II), art. 4 ust. 1 pkt 44, Załącznik I Sekcja C — eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A32014L0065

**ECSPR:**
- Rozporządzenie (UE) 2020/1503 — eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32020R1503
- ESMA Q&As on Crowdfunding — ECSPR, ESMA35-42-1088, 23.09.2022 — esma.europa.eu/sites/default/files/library/esma35-42-1088_qas_crowdfunding_ecspr.pdf
- Ustawa z 7.07.2022 o finansowaniu społecznościowym dla przedsięwzięć gospodarczych i pomocy kredytobiorcom, Dz.U. 2022 poz. 1488 — isap.sejm.gov.pl

**Polskie prawo rynku kapitałowego i spółek:**
- Ustawa z 29.07.2005 o ofercie publicznej…, tekst jedn. Dz.U. 2025 poz. 592 — isap.sejm.gov.pl
- Ustawa z 29.07.2005 o obrocie instrumentami finansowymi, tekst jedn. Dz.U. 2024 poz. 722 — isap.sejm.gov.pl
- Ustawa z 27.05.2004 o funduszach inwestycyjnych i zarządzaniu alternatywnymi funduszami inwestycyjnymi, tekst jedn. Dz.U. 2024 poz. 1034 — isap.sejm.gov.pl
- Kodeks spółek handlowych, tekst jedn. Dz.U. 2024 poz. 18 (art. 180, art. 182¹, 257¹, 300³⁰ i nast.) — isap.sejm.gov.pl
- Rozporządzenie (UE) 2022/858 (DLT Pilot Regime) — knf.gov.pl/dla_rynku/DLT

**AML/sankcje:**
- Rozporządzenie (UE) 2023/1113 (Travel Rule) — eur-lex.europa.eu/eli/reg/2023/1113/oj/eng
- EBA Travel Rule Guidelines, EBA/GL/2024/11 — eba.europa.eu
- Rozporządzenie (UE) 2024/1624 (AMLR) — eur-lex.europa.eu/eli/reg/2024/1624/oj/eng
- Ustawa z 1.03.2018 o przeciwdziałaniu praniu pieniędzy…, tekst jedn. Dz.U. 2025 poz. 644 — isap.sejm.gov.pl
- Rada UE, sankcje wobec Rosji (20. pakiet, 23.04.2026; 21. pakiet, sygnalizowany 23.07.2026) — consilium.europa.eu

**Status ustawy o kryptoaktywach (kluczowa sekcja bieżących wydarzeń):**
- rp.pl, „Weto pod ustawą o kryptoaktywach. Karol Nawrocki trzeci raz odrzuca projekt" — rp.pl/prawo-w-polsce/art44608471
- money.pl, „Weto po raz trzeci. Karol Nawrocki zdecydował ws. ustawy o kryptoaktywach" — money.pl
- gazetaprawna.pl, „Weto prezydenta Nawrockiego. Ustawa kryptowaluty 2026" — gazetaprawna.pl
- parkiet.com, „Nie pozwolimy na dziki zachód. Domański zapowiada czwartą ustawę o krypto" — parkiet.com
- KNF, stanowisko z 10.02.2026 „Sytuacja regulacyjna na rynku kryptoaktywów" — knf.gov.pl/komunikacja/komunikaty?articleId=83761
- ItisPay, „MiCA deadline z 1 lipca 2026 — status przejścia VASP wg kraju" — itispay.com

**Podatki/RODO/reklama:**
- Ustawa o PIT, art. 17 ust. 1 pkt 11, art. 30a, art. 30b — isap.sejm.gov.pl
- Ustawa o CIT, art. 4a pkt 35 (spółka nieruchomościowa), art. 28j (estoński CIT) — isap.sejm.gov.pl
- TSUE, wyrok C-264/14 Hedqvist, 22.10.2015
- Ustawa o ofercie publicznej, art. 53 (zakaz reklamy oferty niepublicznej) — isap.sejm.gov.pl
- UOKiK, komunikat z 20.07.2026 ws. zarzutów wobec spółek condohotelowych (Linea Mare, Beskid Resort Properties, Haveno Estate, Zdrojowa Invest2) — uokik.gov.pl
- Stanowisko UKNF ws. wydawania i obrotu kryptoaktywami (2020, na bazie komunikatu z 22.11.2017) — knf.gov.pl

**O Tudor Nieruchomości:**
- tudornieruchomosci.pl; facebook.com/tudnier; pl.linkedin.com/company/tudor-nieruchomości; prestizszczecin.pl/kronika-prestizowa/138/krolewskie-otwarcie; top100.pl/company/11764678/tudor-nieruchomosci

---

# Ściąga Michała na 10 minut przed spotkaniem

**10 najważniejszych informacji:**
1. Polska nie ma ustawy implementującej MiCA — III weto Prezydenta 11.06.2026, okres przejściowy MiCA skończył się 1.07.2026, brak organu w Polsce.
2. To nie blokuje Ścieżki 1 (prywatna emisja) — jeśli token to papier wartościowy, MiCA go w ogóle nie dotyczy.
3. Dla Ścieżki 2 (utility, jeśli objęty MiCA) jedyna droga to notyfikacja przez podmiot z innego kraju UE/EOG (Niemcy, Estonia, Francja, Austria, Holandia).
4. Nowy próg prospektowy: 12 mln EUR/12 mies. (z opcją obniżenia do 5 mln EUR) od 5.06.2026 — polski próg krajowy w toku dostosowania, sprawdzić na bieżąco.
5. Największe realne ryzyko Ścieżki 1 to nie MiCA, tylko możliwa kwalifikacja SPV jako AFI/ASI (fundusz inwestycyjny).
6. Token nie może samodzielnie przenosić własności udziału w sp. z o.o. (wymóg notarialny, art. 180 KSH) — PSA z blockchainem tylko przez uprawniony podmiot regulowany.
7. Geofencing to element dowodowy, nie zwolnienie prawne — powtórz to wprost, jeśli Konrad zapyta.
8. UOKiK właśnie (20.07.2026) ściga condohotele za obietnice zysku z nieruchomości — to najbliższy precedens, unikaj identycznego języka.
9. O Tudor wiadomo niewiele — małe, butikowe biuro, brak śladów zainteresowania krypto — nie zakładaj wiedzy technicznej Konrada.
10. Dwa tokeny (inwestycyjny i utility) muszą być całkowicie rozdzielone prawnie, ekonomicznie, technologicznie i marketingowo.

**10 najważniejszych pytań do zadania:**
1. Czy masz już konkretny projekt/nieruchomość pod pilotaż?
2. Jaka kwota miałaby zostać pozyskana?
3. Ilu potencjalnych inwestorów realnie znasz/masz w bazie?
4. Czy inwestorzy mają być detaliczni czy kwalifikowani?
5. Czy masz dziś klientów zagranicznych?
6. Jak ma zarabiać inwestor — czynsz, zysk ze sprzedaży, odsetki?
7. Czy jesteś gotowy utworzyć osobne SPV?
8. Kto zarządzałby nieruchomością operacyjnie?
9. Jaki jest Twój budżet i horyzont czasowy na pilotaż?
10. Co dokładnie oznacza dla Ciebie „bycie trendsetterem" — jaki efekt chcesz zobaczyć za rok?

**5 głównych ryzyk:**
1. Błędna klasyfikacja tokena (AFI/papier wartościowy) bez pogłębionej analizy prawnej.
2. Publiczny marketing prywatnej oferty niszczący wyłączenie z prospektu.
3. Pomieszanie narracji utility/inwestycja niszczące klasyfikację utility tokena.
4. Obietnice zwrotu/gwarancji — bezpośrednie ryzyko UOKiK i sankcji KNF.
5. Poleganie na samym geofencingu jako „tarczy prawnej".

**5 głównych argumentów sprzedażowych:**
1. Tudor nie musi wybierać między bankiem a inwestorami prywatnymi — token daje trzecią, elastyczną ścieżkę finansowania konkretnych projektów.
2. Pilotaż na jednej nieruchomości to niskie ryzyko, wysoki dowód koncepcji — nie trzeba stawiać całej firmy na tę kartę.
3. Utility token buduje powtarzalną relację z klientem, której dziś Tudor nie ma — to inwestycja w markę, nie w spekulację.
4. Tokenuj bierze na siebie całą złożoność prawną i technologiczną — Tudor koncentruje się na tym, co umie: nieruchomościach i relacjach.
5. Bycie pierwszym w Szczecinie ma realną wartość wizerunkową — ale tylko jeśli zrobione solidnie, nie pospiesznie.

**3 rekomendowane następne kroki:**
1. Warsztat discovery (2–3h) z udziałem prawnika rynku kapitałowego.
2. Wybór jednej konkretnej nieruchomości pod pilotaż Ścieżki 1.
3. Przygotowanie dwóch wariantów budżetu do decyzji go/no-go.

**Zdanie otwierające spotkanie:**
„Zanim powiem cokolwiek o technologii czy przepisach, chcę zrozumieć, gdzie dziś jest Tudor i dokąd chcesz go zaprowadzić."

**Zdanie zamykające spotkanie:**
„Nie oczekuję dziś decyzji o pełnym wdrożeniu — chcę Twojej zgody na jeden konkretny, ograniczony krok: warsztat discovery, po którym dostaniesz dwa warianty budżetu i podejmiesz świadomą decyzję go/no-go."
