<!-- @file: SECURITY.md -->

# SECURITY.md - Polityka Bezpieczenstwa (HSS)

**Jezyk:** Polski | [English](./SECURITY.en.md)

Ten dokument definiuje podejscie do bezpieczenstwa, proces zglaszania podatnosci,
oraz niepodlegajace negocjacjom zasady dla HSS (Harcerski System Stopni).

## 1) Wspierane wersje

HSS jest w aktywnym rozwoju. Wsparciem bezpieczenstwa objeta jest wylacznie galaz `main`
(lub najnowsze oznaczone wydanie, jesli jest uzywane).

## 2) Zglaszanie podatnosci

### NIE tworz publicznego GitHub Issue
Publiczne zgloszenie moze narazic uzytkownikow na realne ryzyko (natychmiastowe ujawnienie).
Uzyj kanalu prywatnego.

### Preferowane kanaly zgloszen (wybierz jeden)
1. **GitHub Private Vulnerability Reporting (preferowany)**
   - URL: `https://github.com/Nikovsky/Harcerski-System-Stopni/security/advisories/new`
2. **E-mail security**
   - `hss@zhr.pl`
   - Sugerowany temat: `[HSS][SECURITY] <krotki tytul>`
3. **Prywatny/wewnetrzny tracker** (tylko gdy dostep jest ograniczony do zaufanych maintainerow)

> Jesli przypadkowo utworzysz publiczny issue, natychmiast usun dane wrazliwe
> i skontaktuj sie z maintainerami, aby przeniesc zgloszenie do kanalu prywatnego.

### Co dolaczyc do zgloszenia
Podaj prosze:
- jasny opis problemu i wskazanie dotknietego komponentu(ow),
- kroki reprodukcji / proof of concept (bezpieczne i minimalne),
- ocene wplywu (co moze zostac naruszone),
- logi/zrzuty ekranu po usunieciu sekretow,
- wersje/branch/hash commita, na ktorym zaobserwowano problem,
- propozycje remediacji (jesli ja masz).

### Zakres zgloszen
In scope (przyklady):
- obejscie uwierzytelniania/autoryzacji,
- eskalacja uprawnien lub obejscie RBAC/owner-check,
- IDOR/wyciek danych (proby, zalaczniki, dane uzytkownikow),
- wyciek sekretow/tokenow,
- CSRF dla akcji zmieniajacych stan,
- podatnosci typu injection (SQL/NoSQL/header/template).

Out of scope (chyba ze wykazano realny wplyw bezpieczenstwa):
- zgloszenia czysto informacyjne bez sciezki eksploatacji,
- self-XSS wymagajacy nierealistycznego samokompromitowania uzytkownika,
- zgloszenia o brakujacych naglowkach best-practice bez scenariusza ataku,
- socjotechnika/phishing niezwiązane z kodem lub infrastruktura tego repo.

### Czas reakcji (best effort)
- Potwierdzenie przyjecia zgloszenia: do **72 godzin**
- Wstepny triage i klasyfikacja severity: do **7 dni**
- Aktualizacje statusu dla potwierdzonych zgloszen: co najmniej raz na **14 dni**
- Docelowe okna napraw (best effort):
  - **Critical**: do 7 dni
  - **High**: do 30 dni
  - **Medium/Low**: zgodnie z ryzykiem i cyklem wydan

### Coordinated disclosure
Preferujemy skoordynowane ujawnienie:
- nie publikuj szczegolow przed dostepnoscia poprawki,
- uzgodnimy harmonogram ujawnienia zaleznie od severity.

## 3) Cele bezpieczenstwa i model zagrozen (high level)

### Glowne cele
- Zapobieganie nieautoryzowanemu dostepowi do kont i zasobow chronionych
  (RBAC egzekwowany po stronie serwera).
- Zapobieganie wyciekom sekretow, tokenow i PII (szczegolnie w logach).
- Utrzymanie integralnosci danych w PostgreSQL i obiektow w MinIO (S3).
- Ograniczanie powierzchni ataku przez scisla walidacje wejscia, bezpieczne domyslne ustawienia
  i zasade minimalnych uprawnien.

### Glowne granice zaufania
- Internet/klienci -> nginx -> API (NestJS)
- Web (Next.js SSR) -> API
- API -> Keycloak (OIDC)
- API -> PostgreSQL
- API -> MinIO (S3)

## 4) Obowiazkowe zasady bezpieczenstwa (non-negotiable)

### 4.1 Sekrety i dane uwierzytelniajace
- Nigdy nie commituj sekretow, tokenow, hasel, kluczy prywatnych ani plikow `.env`.
- Uzywaj `.env.example` oraz udokumentowanych wymaganych zmiennych.
- Rotuj dane dostepowe natychmiast, jesli podejrzewasz ich ujawnienie.
- Ograniczaj dlugo zyjace tokeny, gdzie to mozliwe.

### 4.2 Uwierzytelnianie i autoryzacja (Keycloak / RBAC)
- RBAC musi byc egzekwowany **po stronie serwera** na granicy API.
- Kontrole po stronie klienta maja charakter tylko UX.
- Nigdy nie ufaj niezweryfikowanym claims roli dostarczonym przez uzytkownika.
- Stosuj zasade minimalnych uprawnien: rola domyslna nie moze dawac uprawnien administracyjnych.

### 4.3 Sesje, cookie, CSRF
Jesli cookies sa uzywane do auth:
- Cookies musza miec `HttpOnly`, `Secure` oraz adekwatna polityke `SameSite`.
- Musi istniec ochrona CSRF dla zapytan zmieniajacych stan autoryzowanych cookie.
- Nie przechowuj tokenow auth w `localStorage` i nie eksponuj ich do client bundle.

### 4.4 Walidacja i sanityzacja wejscia
- Waliduj kazde niezaufane wejscie na granicach:
  - HTTP DTO / parametry sciezki / query params,
  - formularze,
  - konfiguracje startupowa (env).
- Uzywaj walidacji opartej o schematy (zod w `packages/schemas`, walidacja DTO w API).
- Stosuj allowlisty dla pol sortowania/filtrowania (bez dowolnego dostepu do pol SQL/Prisma).
- Zapobiegaj ryzykom injection (SQL/NoSQL/header/template injection).

### 4.5 Upload plikow i S3 (MinIO)
- Egzekwuj scisle limity rozmiaru plikow i allowlisty typow zawartosci.
- Nie ufaj rozszerzeniom plikow; waliduj rzeczywista zawartosc, gdzie to mozliwe.
- Przechowuj uploady jako prywatne domyslnie.
- Uwzglednij seam pod skanowanie malware (nawet jesli jeszcze nie jest wdrozone).

### 4.6 Obsluga bledow i ujawnianie informacji
- Nigdy nie ujawniaj stack trace, bledow wewnetrznych ani szczegolow konfiguracji klientom.
- Uzywaj spojnych envelope bledow ze stabilnymi kodami.
- Unikaj zwracania szczegolowych powodow porazek auth, ktore pomagaja atakujacym.

### 4.7 Logowanie (redakcja PII / sekretow)
- Nigdy nie loguj:
  - hasel, tokenow, refresh tokenow,
  - naglowkow authorization,
  - cookies sesyjnych,
  - sekretow ani kluczy prywatnych.
- Logi musza byc ustrukturyzowane, poziomowane i zawierac request/correlation id, gdy dostepne.
- Traktuj dane osobowe jako wrazliwe; loguj minimum niezbednych danych.

### 4.8 Higiena zaleznosci i supply-chain
- Zmiany lockfile musza byc recenzowane.
- Unikaj nieutrzymywanych bibliotek dla funkcji krytycznych bezpieczenstwa.
- Uruchamiaj audyty w CI (`pnpm audit` lub odpowiednik).
- Utrzymuj obrazy Docker przypiete i aktualne.

## 5) Bazowy poziom bezpieczenstwa infrastruktury

### nginx / TLS
- Terminacja TLS odbywa sie na nginx (HTTPS wymagany).
- Naglowki bezpieczenstwa musza byc wlaczone (HSTS, nosniff, frame protection, referrer policy itd.).
- Preferuj nowoczesne wersje TLS i wylacz slabe szyfry.

### PostgreSQL
- Uzywaj kont DB z minimalnymi uprawnieniami (oddzielnie migracje/admin, jesli potrzebne).
- Upewnij sie, ze istnieja procedury backupu i odtwarzania (nawet jesli na poczatku manualne).
- Unikaj wystawiania PostgreSQL do publicznego internetu.

### Keycloak
- Utrzymuj Keycloak za TLS.
- Hardenuj dostep administracyjny (silne dane dostepowe, minimalna ekspozycja).
- Weryfikuj, ze procedury realm/import sa deterministyczne i powtarzalne.

### MinIO
- Nie wystawiaj bucketow publicznie domyslnie.
- Ogranicz dostep do konsoli do zaufanych sieci, gdzie to mozliwe.

## 6) Uwaga o skalowaniu horyzontalnym

HSS jest projektowany jako stateless-by-default. Kazda kontrola bezpieczenstwa implementowana in-memory
(np. rate limiting) musi byc oznaczona jako:

`// [SINGLE-INSTANCE] reason: in-memory security control`

i udokumentowana z docelowym, horyzontalnie bezpiecznym zamiennikiem
(np. rate limit oparty o Redis).

## 7) Oczekiwania dot. testow bezpieczenstwa

Minimalny baseline:
- testy unit dla helperow auth i walidatorow granicznych,
- testy integracyjne dla chronionych tras API,
- testy E2E dla kluczowych flow auth i tras chronionych.

Rekomendowane (przyszlosc):
- SAST/secret scanning w CI,
- container scanning dla obrazow Docker,
- skanowanie podatnosci zaleznosci jako quality gate.

## 8) Reakcja na incydent (podstawowa)

Jesli podejrzewany jest incydent bezpieczenstwa:
1. Ogranicz skutki: uniewaznij/obroc ujawnione dane dostepowe i tokeny.
2. Ocen wplyw: zidentyfikuj dotkniete dane/uzytkownikow.
3. Napraw: wdroz poprawki.
4. Komunikuj: poinformuj wlasciwych interesariuszy (najpierw wewnetrznie).
5. Postmortem: udokumentuj przyczyne zrodlowa i kroki zapobiegawcze.

## 9) Kontakty security

- GitHub Private Vulnerability Reporting:
  - `https://github.com/Nikovsky/Harcerski-System-Stopni/security/advisories/new`
- E-mail security:
  - `hss@zhr.pl`

Publiczne GitHub Issues nie sa akceptowanym kanalem zglaszania podatnosci.

---

Dziekujemy za pomoc w utrzymaniu bezpieczenstwa HSS.
