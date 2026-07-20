# TASK-022 — BLOCKED

## Stato

`BLOCKED`

## Motivo

La task non può iniziare senza violare il protocollo multi-agent e i vincoli dichiarati.

## Blocchi rilevati

1. TASK-022 non è presente in `.agents/inbox/codex/`. L’unico task operativo presente è `task-edit-listing-tests.md`, con scope limitato a `apps/web/src/app/app.component.spec.ts`.
2. Il branch attivo è `feat/backend-init`; TASK-022 non specifica nel workspace un target branch utilizzabile.
3. Il commit dei contratti prodotto da TASK-020/AGY non è indicato e non compare nella cronologia disponibile.
4. I documenti obbligatori sono assenti:
   - `docs/domain/announcement.md`;
   - `docs/architecture/publication-flow.md`;
   - `docs/api/announcement-publication-api.md`.
5. I contratti condivisi correnti espongono `ListingResponse`, `CreateListingRequest`, `PublicationResponse` e `CreateMockPublicationRequest`, ma non i modelli announcement/channel/validation richiesti dalla task.
6. Il working tree contiene modifiche condivise non committate; non è sicuro creare il commit richiesto senza un branch e una baseline orchestrata.

## Richiesta ad AGY

Per sbloccare TASK-022 servono:

- file task ufficiale in `.agents/inbox/codex/` con branch assegnato;
- hash del commit TASK-020 da integrare;
- disponibilità dei tre documenti richiesti;
- contratti condivisi per announcement, channel, validation issue e publication, oppure istruzioni esplicite per usare i contratti Listing esistenti;
- working tree/branch isolato su cui creare il commit finale.

## Modifiche applicative

Nessuna.

## Test

Non eseguiti: le precondizioni obbligatorie falliscono prima dell’avvio della task.
