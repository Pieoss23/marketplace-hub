# Report — Migrazioni automatiche nello stack containerizzato

## Stato

`READY_FOR_REVIEW`

## Contesto

Chiude un gap segnalato onestamente nel report del Dockerfile: lo stack
containerizzato avviava l'API ma **non applicava le migrazioni**, quindi
`docker compose up` su un volume DB fresco dava un'app funzionante ma senza
tabelle. Backend/infra puro, nessuna decisione di prodotto, nessuna collisione
con Codex.

## Riepilogo

- `apps/api/package.json`: nuovo script `db:migrate:deploy` (`prisma migrate
  deploy`, non interattivo, per ambienti non-dev — accanto all'esistente
  `db:migrate` che usa `migrate dev`).
- `docker-compose.yml`: nuovo servizio one-shot **`migrate`**, costruito dallo
  stage `build` del Dockerfile (che ha il CLI di Prisma + schema + migrazioni;
  l'immagine runtime `api` li elimina di proposito). Esegue `prisma migrate
  deploy` e poi esce. La `DATABASE_URL` è ora un anchor YAML condiviso tra
  `migrate` e `api` (niente duplicazione).
- Il servizio `api` ora dipende anche da `migrate` con
  `condition: service_completed_successfully`, oltre a postgres healthy.

Sequenza risultante di `docker compose up`: **postgres healthy → migrate
applica le migrazioni ed esce 0 → api parte**.

## Verifica (eseguita davvero, non distruttiva)

1. **Idempotenza**: `docker compose run --rm migrate` contro il DB già migrato →
   "No pending migrations to apply", exit 0.
2. **DB fresco**: creato un database vuoto `scratch_migrate_test` sullo stesso
   Postgres, eseguito il servizio `migrate` puntato lì → tutte e 5 le migrazioni
   applicate da zero, tabelle realmente create (`User`, `Announcement`,
   `RefreshToken`, `Listing`, `Publication`, …), `_prisma_migrations` con 5
   record completati. Scratch DB poi eliminato — DB principale intatto.
3. **Orchestrazione**: `docker compose up -d api` → postgres Healthy → migrate
   Started/Exited(0) → api Started e `Up (healthy)`; `/api/health/ready`
   risponde `ready`/`database:up`.

## File principali

- `apps/api/package.json` (script `db:migrate:deploy`)
- `docker-compose.yml` (servizio `migrate` + anchor DATABASE_URL + `api`
  depends_on migrate)
