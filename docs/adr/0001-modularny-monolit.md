# ADR 0001: Modularny monolit + worker

- Status: Accepted
- Data: 2025-12-16

## Kontekst
HSS jest systemem dla lokalnej Komisji/Kapituły z MVP obejmującym workflow prób, załączniki oraz terminarz posiedzeń.
W kolejnych etapach planowane są zadania asynchroniczne: generowanie PDF, OCR, powiadomienia (email/SMS).
Na starcie priorytetem jest niski koszt operacyjny i szybkie dowiezienie MVP przy zachowaniu jakości, bezpieczeństwa i audytu.

## Decyzja
Budujemy modularny monolit:
- Frontend: Next.js
- Backend API: NestJS (moduły domenowe z czytelnymi granicami)
- Worker (osobny proces): obsługa BullMQ/Redis dla zadań asynchronicznych (PDF/OCR/notifications).

## Alternatywy
1. Mikroserwisy od startu
2. Monolit bez workera (wszystko synchronicznie w API)
3. Serverless/lambdy do zadań (PDF/OCR)

## Konsekwencje
Pozytywne:
- Prostota wdrożenia i utrzymania MVP (jeden backend + opcjonalny worker)
- Jasne granice domenowe bez narzutu mikroserwisów
- Naturalna ścieżka rozwoju: dołożenie jobów bez refaktoru architektury

Negatywne / koszty:
- Wymagana dyscyplina modularności (żeby nie zrobić “wielkiego serwisu”)
- Worker to dodatkowy proces do uruchomienia i obserwowania (ale wciąż prosty)

Uwagi implementacyjne:
- Komunikacja API→worker przez kolejkę (BullMQ)
- Domain events in-proc w API (opcjonalnie), mapowane na joby w workerze
