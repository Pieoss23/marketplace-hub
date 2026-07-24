# Report — Retry per pubblicazioni fallite

## Stato

`READY_FOR_REVIEW`

## Contesto

Incremento richiesto direttamente dall'utente in sessione interattiva, scelto da uno
shortlist proposto dopo il completamento del lavoro sui refresh token. Prima di
implementare ho verificato lo stato attuale: il backend **permetteva già** il retry di
un canale `FAILED` — il commento nel codice di `PublishAnnouncementUseCase.execute()`
lo dichiarava esplicitamente ("a FAILED attempt may be retried, creating a new
publication row"), ma **nessun test lo dimostrava** e il **motivo del fallimento non
raggiungeva mai il frontend** sulla risposta di pubblicazione/storico (solo sullo stato
canale corrente). Il lavoro quindi non ha richiesto modifiche alla state machine, solo
a chiudere questi due gap reali più l'affordance UI mancante.

## Riepilogo

### Backend (`apps/api`, `packages/contracts`)

- `PublishAnnouncementResponse` (contratto condiviso) e il DTO corrispondente ora
  includono `lastError?: string`, popolato da `announcement.mapper.ts` a partire da
  `AnnouncementPublication.lastError` (già esistente nel dominio, semplicemente non
  mappato prima).
- Nuovo test in `publish-announcement.use-case.spec.ts`: dimostra per la prima volta
  che un retry dopo `FAILED` non viene bloccato (nessun 409), crea una nuova riga di
  pubblicazione (non riusa quella fallita) e può concludersi con successo.

### Frontend (`apps/web`)

- Il pulsante "Pubblica su Mock" ora usa `publishButtonLabel()`: `'Riprova
  pubblicazione'` quando il canale è `FAILED`, `'Pubblicato'` (disabilitato) quando è
  già `PUBLISHED`, altrimenti invariato. Nessuna modifica a `publishChannel()` — chiama
  lo stesso endpoint che il backend già tratta come retry.
- Il motivo del fallimento (`lastError`) è ora visibile sia nello stato canale corrente
  sia in ogni voce dello storico pubblicazioni.
- Nuovi test in `app.component.spec.ts`: mostra l'errore e permette il retry con lo
  stesso pulsante (verificata una seconda richiesta HTTP al click); disabilita il
  pulsante dopo `PUBLISHED`; mostra `lastError` in una voce storica.

## Test e verifiche

- **Backend**: 120/120 verdi (unit + e2e reali contro Postgres), lint e typecheck
  puliti.
- **Contracts**: build pulita.
- **Frontend**: `tsc --noEmit` pulito su `tsconfig.app.json` e `tsconfig.spec.json`,
  `eslint .` diretto pulito. `ng test`/`ng build` non eseguibili in questo ambiente per
  lo stesso motivo già documentato in `refresh-token-report.md` (Node 18.19.1 vs
  requisito Angular CLI ≥20.19) — nessuna verifica manuale in browser reale per questo
  incremento.

## File principali

- `packages/contracts/src/announcement.ts`
- `apps/api/src/announcements/dto/publish-announcement-response.dto.ts`
- `apps/api/src/announcements/announcement.mapper.ts`
- `apps/api/src/announcements/application/publish-announcement.use-case.spec.ts`
- `apps/web/src/app/app.component.ts`, `app.component.html`, `app.component.css`
- `apps/web/src/app/app.component.spec.ts`
