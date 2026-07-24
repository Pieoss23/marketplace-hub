# Report — Validazione dell'ambiente all'avvio

## Stato

`READY_FOR_REVIEW`

## Contesto

Quinto e — su indicazione esplicita dell'utente — **ultimo** incremento backend
prima di fermarsi per i commit in questa sessione (il working tree ora tocca
`apps/api`, `apps/web` e `apps/extension` con modifiche non committate sia mie sia
di Codex, che ha integrato il refresh token nell'estensione in parallelo).

`apps/api/src/config/configuration.ts` legge ogni variabile d'ambiente con un
fallback `||`, sicuro contro valori mancanti ma non validato nella forma. L'unica
variabile senza alcun fallback è `DATABASE_URL`, letta direttamente da Prisma
(`env("DATABASE_URL")` in `schema.prisma`), fuori da `configuration.ts`: se manca,
l'errore emerge in profondità dentro Prisma con un `P1012` poco chiaro — capitato
davvero in questa sessione lanciando `prisma migrate dev` senza aver caricato
`.env`. `ConfigModule.forRoot(...)` in `app.module.ts` non aveva alcuna funzione
`validate`.

## Scelta di perimetro

Deliberatamente **non** ho cercato di rilevare/rifiutare il secret JWT di default
insicuro (`'dev-insecure-secret-change-me'`): richiederebbe un concetto di ambiente
(dev vs produzione) che questo codebase non ha da nessuna parte (`NODE_ENV` non
compare mai in `apps/api/src`), e introdurlo sarebbe una decisione più grande e
discutibile di quanto competa a un incremento non richiesto esplicitamente. Il
perimetro resta meccanico: validare forma e tipo di ciò che è effettivamente
impostato. Quando `JWT_SECRET` **è** impostato esplicitamente, applico comunque un
minimo di 16 caratteri — un limite non controverso contro valori palesemente troppo
corti, non un giudizio su quale ambiente si stia usando.

## Riepilogo

- Nuovo `apps/api/src/config/env.validation.ts`: classe `EnvironmentVariables`
  (`class-validator`, già dipendenza esistente) + funzione `validate()` che lancia
  un errore chiaro elencando tutti i problemi se la configurazione non è valida.
  `DATABASE_URL` obbligatoria; tutto il resto opzionale (coerente con i fallback già
  esistenti in `configuration.ts`) ma tipizzato/vincolato quando presente.
- `apps/api/src/app.module.ts`: aggiunta `validate` a `ConfigModule.forRoot(...)`.

## Nota tecnica

Il primo giro di test ha rivelato un problema reale, non solo teorico: le funzioni
`plainToInstance`/`validateSync` di `class-validator` dipendono da
`Reflect.getMetadata`, disponibile solo dopo l'import di `reflect-metadata` — nell'app
reale lo fa `main.ts` come prima riga in assoluto. Il nuovo test unitario puro
(`env.validation.spec.ts`), che chiama `validate()` direttamente senza passare da
nessun bootstrap Nest, falliva con `Reflect.getMetadata is not a function` finché non
ho aggiunto lo stesso import in cima al file di test.

## Test e verifiche

- Nuovo `env.validation.spec.ts`: ambiente completo valido non lancia; solo
  `DATABASE_URL` impostata non lancia (prova che gli altri campi sono davvero
  opzionali); `DATABASE_URL` mancante, `API_PORT` non numerico, `JWT_SECRET` troppo
  corto lanciano tutti un errore che nomina il campo.
- Suite e2e esistente invariata e verde: `.env` root soddisfa già tutte le regole
  (nessuna modifica necessaria altrove).
- 127/127 test verdi (era 122, +5 nuovi), lint e typecheck puliti.

## File principali

- `apps/api/src/config/env.validation.ts` (nuovo)
- `apps/api/src/config/env.validation.spec.ts` (nuovo)
- `apps/api/src/app.module.ts`
