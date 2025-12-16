# Moduły domenowe i granice odpowiedzialności

## Identity & Access
- Role: USER, COMMITTEE_MEMBER, SECRETARY, CHAIR, ADMIN
- RBAC na endpointach + sprawdzanie dostępu do zasobów (ownership / membership)

## Trials (Próby)
- Nagłówek próby (Trial): status globalny, daty, applicant, filtry (hufiec/drużyna)
- Formularz (TrialForm): payload JSONB (dane osobowe + historia)
- Wymagania: instancje wymagań per próba (TrialRequirement) + statusy per wymaganie
- Dowody: pliki przypięte do wymagań (Evidence)
- Świadkowie: osoba obecna (Witness) – user z systemu lub wpis ręczny
- Komentarze kapituły (TrialComment)
- Historia statusów (TrialStatusHistory)

## Meetings (Posiedzenia)
- Terminy (Meeting) + limity miejsc
- Zapisy (MeetingRegistration) z kontrolą współbieżności

## Files
- StoredFile: metadane + stan pipeline (AV/OCR) w przyszłości
- Dostęp do plików wyłącznie przez presigned URL generowane po autoryzacji

## Audit & Compliance
- AuditLog: kto/co/kiedy + metadane + requestId
- Retencja / eksport danych – etap późniejszy, ale model gotowy

## Documents (później)
- Rejestr dokumentów (Document) + powiązanie do StoredFile
- PDF generowany w workerze (HTML → Playwright)
