# ADR 0005: Audyt i historia statusów jako wymaganie od MVP

- Status: Accepted
- Data: 2025-12-16

## Kontekst
System obsługuje proces decyzyjny komisji i dane osobowe.
Wymagane jest:
- rozliczalność: kto zmienił status, kto dodał komentarz, kto wygenerował/dodał dokument,
- możliwość odtworzenia historii działań (w tym spory/odwołania),
- wsparcie RODO i kontroli dostępu.

## Decyzja
- Wprowadzamy od MVP:
  - `TrialStatusHistory` jako historia zmian statusu próby
  - `AuditLog` jako log zdarzeń (kto/co/kiedy + metadata + requestId)
- Każda zmiana statusu = transakcja: aktualizacja `Trial` + wpis `TrialStatusHistory` + wpis `AuditLog`.
- Audyt obejmuje min.:
  - create/update trial, submit
  - status transitions
  - upload/download plików (event)
  - meeting CRUD i rejestracje
  - kluczowe zmiany administracyjne (role, ustawienia)

## Alternatywy
1. Brak audytu w MVP, “dołożymy później”
2. Logi aplikacyjne jako jedyne źródło prawdy
3. Zewnętrzny system audytowy od startu (np. SIEM)

## Konsekwencje
Pozytywne:
- Rozliczalność i zgodność procesowa od pierwszego dnia
- Łatwiejsze debugowanie (requestId koreluje logi i zdarzenia)
- Podstawa pod raporty i zgodność RODO (kto miał dostęp / co zmienił)

Negatywne / koszty:
- Więcej danych w DB (należy planować retencję/archiwizację)
- Dyscyplina developerska: każdy kluczowy endpoint musi emitować audit event

Uwagi implementacyjne
- AuditLog powinien mieć indeksy po (entityType, entityId, createdAt) i po actorUserId
- Retencja: do ustalenia (np. 12–24 miesięcy dla eventów niskiej wartości, dłużej dla decyzji)
