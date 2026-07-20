# Report: Implementazione Modifica dell'Annuncio (Edit) nel Frontend

**Status: READY_FOR_REVIEW**

**Branch**: `feat/frontend-edit-listing`
**Commit**: `d3eb0fc` — "feat(web): add edit/update flow for listings"

---

## Sintesi dei cambiamenti

Implementato il flusso completo di modifica di un annuncio esistente nel form
centrale di `apps/web`, rispettando lo scope dei file autorizzati.

- **Azione "Modifica" sulla card**: aggiunto un pulsante `Modifica` accanto a
  `Elimina annuncio` in ogni `listing-card`. Al click, `editListing(listing)`
  imposta `editingListingId` e popola `listingForm` con `title`, `description`,
  `priceEuros` (decodificato da `price.amountMinor / 100`) e `imageUrl`
  (`listing.images[0]?.url ?? ''`).
- **Form in modalità modifica**: il titolo della sezione (`Modifica inserzione`
  vs `Crea una nuova inserzione`) e il testo/etichetta del pulsante di submit
  (`Aggiorna annuncio` / `Aggiornamento…` vs `Salva annuncio` / `Salvataggio…`)
  cambiano in base al segnale calcolato `isEditing = computed(() =>
  editingListingId() !== null)`. È comparso un pulsante `Annulla`, visibile solo
  in modalità modifica, che richiama `cancelEdit()` per uscire dalla modalità e
  resettare il form.
- **Integrazione con il servizio**: il gestore di submit del form è stato
  rinominato da `createListing()` a `submitListing()` (unico handler agganciato
  a `(ngSubmit)`), che ora si dirama: se `editingListingId()` è valorizzato
  richiama il nuovo metodo privato `updateListing(id, request)` — che a sua
  volta chiama `listingsService.update(id, request)` — altrimenti segue il
  percorso di creazione esistente (`listingsService.create(request)`).
  Il prezzo viene sempre ricodificato in `amountMinor` (`Math.round(priceEuros
  * 100)`), invariato rispetto alla creazione.
- **Stato di caricamento**: aggiunto un nuovo segnale dedicato `isUpdating`
  (parallelo a `isCreating` già esistente) per disabilitare submit/cancel
  durante la chiamata di update, senza toccare la logica di creazione.
- **Gestione esito**:
  - Successo update: il listing viene aggiornato in-place nel segnale
    `listings` (map su id), si esce dalla modalità modifica e si resetta il
    form (helper privato `exitEditMode()` → `resetListingForm()`), riusando lo
    stesso pattern già presente per la creazione.
  - Errore: invariato, popola `pageErrors` tramite `extractErrorMessages`
    (funzione già presente, non modificata nella firma/logica).
  - `pageErrors` viene anche ripulito quando si entra in modalità modifica,
    per coerenza con il comportamento di submit.

## Elenco esatto dei file modificati

Tutti e soli i file autorizzati dal task, nessun altro file toccato:

- `apps/web/src/app/app.component.ts`
- `apps/web/src/app/app.component.html`
- `apps/web/src/app/app.component.css`

## Note e scelte di design

1. **Rinominato `createListing()` in `submitListing()`**: dato che il singolo
   form ora gestisce sia create sia update, un nome neutro sull'handler di
   submit è sembrato più chiaro che sovraccaricare semanticamente
   `createListing()`. La modifica è contenuta interamente in
   `app.component.ts`/`.html`, entrambi nello scope autorizzato.
2. **Uscita automatica dalla modalità modifica se l'annuncio in edit viene
   eliminato**: in `removeListing()`, se l'id eliminato coincide con
   `editingListingId()`, si richiama `exitEditMode()` per evitare che il form
   resti "agganciato" a un annuncio non più esistente. Non era esplicitamente
   richiesto dai criteri di accettazione ma previene uno stato inconsistente
   dell'interfaccia.
3. **Layout dei pulsanti**: il pulsante `Annulla` (`.secondary-action`, stile
   outline/ghost) e il pulsante di submit sono stati raggruppati in un nuovo
   contenitore `.form-actions` (flex, allineato a destra) al posto del
   posizionamento diretto nella grid del form; su mobile i due pulsanti si
   impilano (`flex-direction: column-reverse`, con il pulsante primario in
   basso). Analogamente, `Modifica` ed `Elimina annuncio` sono stati
   raggruppati in `.card-actions` (stessa posizione assoluta che aveva prima
   `.delete-action` da solo).
4. **Nessuna nuova dipendenza esterna e nessun contratto toccato**: sono stati
   riusati `ListingsService.update(id, request)` e il tipo
   `UpdateListingRequest` (= `Partial<CreateListingRequest>`), già presenti e
   utilizzabili così come sono in `apps/web/src/app/listings.service.ts` e
   `packages/contracts/src/listing.ts`. Nessuna modifica a contratti, dominio,
   backend o file di configurazione.
5. **Test**: `apps/web/src/app/app.component.spec.ts` non è stato toccato
   (non è nell'elenco dei file autorizzati per la modifica — l'elenco esplicito
   del task cita solo `.ts`/`.html`/`.css`). Di conseguenza non sono stati
   aggiunti nuovi test automatici dedicati al flusso di edit, in
   apparente tensione con la convenzione generale di `AGENTS.md`
   ("aggiungere test per ogni comportamento introdotto"); si segnala questo
   scostamento all'orchestratore per eventuale follow-up (es. task dedicato a
   Codex, che infatti risulta già avere in inbox
   `task-edit-listing-tests.md`). La suite esistente (9 test) è stata
   comunque eseguita ed è verde: il submit del form continua a funzionare
   nel percorso di creazione (il test esistente "creates a listing from the
   central form" invia il submit via evento DOM, quindi non dipende dal nome
   del metodo rinominato).

## Verifiche eseguite

- `pnpm --filter @marketplace-hub/domain build` → OK
- `pnpm --filter @marketplace-hub/contracts build` → OK
- `pnpm --filter @marketplace-hub/web type-check` (`tsc -p tsconfig.app.json --noEmit`) → OK, nessun errore
- `pnpm --filter @marketplace-hub/web lint` (`ng lint`) → "All files pass linting."
- `pnpm --filter @marketplace-hub/web test` (`ng test --watch=false --browsers=ChromeHeadless`) → **9/9 test superati** (Chrome Headless Shell scaricato localmente via Playwright per l'ambiente sandbox, dato che il binario non era preinstallato)

## Nota operativa sull'ambiente di lavoro

Il worktree isolato assegnato a questo agente (`.claude/worktrees/agent-a15d076a17d4a3034`)
conteneva, al momento dell'avvio, solo i file già committati sul branch
`feat/backend-init` (`AGENTS.md`, `project_tree.md`): l'intero sorgente
(`apps/`, `packages/`, `.agents/`, config di workspace) esisteva nel repo
principale solo come modifiche non ancora committate. Per poter leggere il
task, i contratti e implementare/testare la modifica, i seguenti percorsi
sono stati copiati (in sola lettura, come riferimento/dipendenze di build; non
sono stati committati) dal repo principale nel worktree: `apps/web/`,
`packages/domain/`, `packages/contracts/`, `.agents/inbox/claude/`,
`.agents/orchestrator.md`, più i file di configurazione radice del workspace
pnpm (`package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`,
`tsconfig.base.json`). Il commit sul branch `feat/frontend-edit-listing`
contiene **esclusivamente** i tre file autorizzati elencati sopra.
