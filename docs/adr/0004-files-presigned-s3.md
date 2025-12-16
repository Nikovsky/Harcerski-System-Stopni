# ADR 0004: Pliki w S3 (MinIO) + presigned URLs, brak public access

- Status: Accepted
- Data: 2025-12-16

## Kontekst
System przechowuje dokumenty i załączniki zawierające dane osobowe.
Wymagania:
- brak publicznego dostępu do plików,
- kontrola dostępu per rola i per zasób (kto może pobrać),
- rejestrowanie zdarzeń (upload/download) w audycie,
- przygotowanie pod przyszłe AV/OCR/PDF pipeline.

## Decyzja
- Pliki trzymamy w MinIO (S3-compatible), buckety prywatne.
- Backend generuje presigned URL (PUT/GET) wyłącznie po autoryzacji i sprawdzeniu uprawnień.
- W DB trzymamy metadane w `StoredFile` i relacje:
  - dowody do wymagań: `TrialRequirementEvidence`
  - dokumenty generowane: `Document`
- Stosujemy krótkie TTL dla presigned URL.
- Zdarzenia plikowe (upload/download) zapisujemy do `AuditLog`.

## Alternatywy
1. Trzymanie plików w bazie (BLOB)
2. Trzymanie plików na lokalnym filesystem serwera
3. Public bucket + “sekretne linki”
4. Managed S3 (AWS) od startu

## Konsekwencje
Pozytywne:
- Zmniejszenie ryzyka wycieku (brak public access)
- Skalowalny storage, łatwy backup i replikacja
- Spójny model danych: DB = metadane + ACL, storage = treść
- Gotowość pod pipeline (AV/OCR/PDF) przez statusy/metadane w `StoredFile`

Negatywne / koszty:
- Dodatkowa infrastruktura (MinIO) i konfiguracja polityk
- Potrzeba konsekwentnego egzekwowania autoryzacji przed generowaniem URL

Uwagi implementacyjne
- Klucz obiektu (objectKey) powinien zawierać kontekst (np. trialId / requirementCode)
- Backend nie udostępnia “gołych” URL; zawsze generuje presigned
- Dla download: można generować presigned z `response-content-disposition` (nazwa pliku)
