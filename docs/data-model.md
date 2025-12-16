# Model danych (Prisma) – uzasadnienia projektowe

## Cele
- Stabilny workflow (Trial status + historia)
- Wymagania jako rdzeń procesu (statusy per wymaganie, dowody, świadkowie)
- Elastyczność formularza (JSONB payload)
- Wydajne listy kapituły (filtry po hufcu/drużynie)

## Normalizacja
- Encje procesowe (Trial, TrialRequirement, Meeting, StoredFile) w 3NF.
- Relacje M:N przez tabele łączące (Evidence, Registration, UserRole).

## Kontrolowana denormalizacja
- Trial.unitHufiec/unitDruzyna: pod filtry i indeksy.
- Snapshot TrialRequirement code/title/description/order: niezmienność historyczna.

## Atomowość (transakcje)
- Submit/status-change: Trial + TrialStatusHistory + AuditLog.
- Registration limit: lock/serializable.
- Evidence: StoredFile + Evidence + AuditLog.

## Indeksy (kluczowe)
- Trial: (status, submittedAt), (unitHufiec, status), (unitHufiec, unitDruzyna)
- TrialRequirement: (trialId, order), (trialId, progressStatus), unique(trialId, code)
- Meeting: (status, startsAt)
- MeetingRegistration: unique(meetingId, userId), (meetingId, status)
- AuditLog: (entityType, entityId, createdAt), (actorUserId, createdAt)
