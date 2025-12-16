# ADR 0003: TrialForm jako JSONB + relacyjne wymagania

- Status: Accepted
- Data: 2025-12-16

## Kontekst
Formularz próby zawiera rozbudowane dane kandydata i historię służby (listy, opisy, zmienne w czasie).
Jednocześnie próba zawiera wymagania, gdzie każde wymaganie ma:
- plan działania,
- sposób weryfikacji,
- deklarację “wykonałem/wykonam”,
- status realizacji,
- dowody (pliki),
- świadków/instruktorów obecnych.
Te elementy muszą być audytowalne i wygodne w UI (panel kapituły).

## Decyzja
- Dane opisowe formularza trzymamy w `TrialForm.payload` jako JSONB (wersjonowane `formVersion`).
- Wymagania modelujemy relacyjnie: `TrialRequirement` + `TrialRequirementEvidence` + `TrialRequirementWitness`.
- Używamy template wymagań: `RequirementTemplate` + `RequirementTemplateItem` (seed), a przy tworzeniu próby tworzymy snapshot `TrialRequirement` (kod/tytuł/opis/kolejność).

## Alternatywy
1. Wszystko relacyjnie (dużo tabel i migracji przy zmianach formularza)
2. Wszystko w JSON (łatwe zmiany, ale trudny workflow, audyt i wydajność UI)
3. EAV (entity-attribute-value) dla formularza

## Konsekwencje
Pozytywne:
- Elastyczność formularza bez częstych migracji
- Stabilny workflow i audyt dla wymagań
- Dobre indeksowanie i szybkie listy w panelu kapituły
- Snapshot chroni przed zmianami template w trakcie trwania próby

Negatywne / koszty:
- Walidacja JSON po stronie aplikacji (zod/DTO), wersjonowanie payload
- Część raportów po danych “z JSON” wymaga dodatkowej pracy (promocja pól do kolumn)
