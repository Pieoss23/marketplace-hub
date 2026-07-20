# Task: Implementazione Modifica dell'Annuncio (Edit) nel Frontend

## Obiettivo
Implementare il flusso di modifica (Edit/Update) di un annuncio esistente nel frontend Angular (`apps/web`). L'utente deve poter modificare un annuncio inserito inserendo i nuovi valori nel form centrale.

---

## Dettagli Esecutivi

- **Branch di riferimento**: `feat/frontend-edit-listing`
- **File autorizzati per la modifica**:
  - [app.component.ts](file:///home/poss/dev/reseller_cross/apps/web/src/app/app.component.ts)
  - [app.component.html](file:///home/poss/dev/reseller_cross/apps/web/src/app/app.component.html)
  - [app.component.css](file:///home/poss/dev/reseller_cross/apps/web/src/app/app.component.css)
- **File vietati**:
  - Qualsiasi file al di fuori di `apps/web/src/app/app.component.*` (inclusi contratti, dominio, backend API e file di configurazione).

---

## Requisiti e Criteri di Accettazione

1. **Azione "Modifica" sulla Card dell'Annuncio**:
   - Aggiungere un pulsante o link "Modifica" per ciascun annuncio nell'elenco (accanto o vicino a "Elimina annuncio").
   - Al clic sul pulsante "Modifica", il form centrale di creazione deve essere popolato con i valori dell'annuncio selezionato (titolo, descrizione, prezzo in euro decodificato da `amountMinor`, ed eventuale URL dell'immagine).
   - L'applicazione deve entrare in modalità modifica tracciando l'ID dell'annuncio selezionato (`editingListingId`).

2. **Form in Modalità Modifica**:
   - Il testo del pulsante del form deve cambiare da "Salva annuncio" a "Aggiorna annuncio" (o simile).
   - Deve essere visualizzato un pulsante "Annulla" nel form, visibile solo in modalità modifica. Cliccando su "Annulla", il form deve resettarsi e l'applicazione deve uscire dalla modalità modifica.
   - Il titolo della sezione del form deve rispecchiare l'operazione in corso (es. "Modifica inserzione" invece di "Crea una nuova inserzione").

3. **Integrazione con il Servizio**:
   - Al submit del form in modalità modifica, deve essere chiamato `listingsService.update(id, request)` passando l'ID dell'annuncio in modifica e il relativo `UpdateListingRequest`.
   - Il prezzo deve essere ricodificato in `amountMinor` (moltiplicando per 100).
   - Gestire lo stato di caricamento (`isCreating` o un nuovo flag dedicato come `isUpdating`) per disabilitare i controlli durante l'invio.

4. **Gestione dell'Esito**:
   - **Successo**: Aggiornare l'annuncio nella lista locale (`listings`), uscire dalla modalità modifica, resettare il form e pulire eventuali errori di pagina.
   - **Errore**: Catturare l'errore e popolare il segnale `pageErrors` usando la funzione `extractErrorMessages` già presente nel file.

---

## Formato del Risultato
Quando hai completato l'implementazione, scrivi un report riassuntivo in:
`.agents/outbox/claude/task-edit-listing.md`

Il report deve contenere:
- Una sintesi dei cambiamenti effettuati.
- L'elenco esatto dei file modificati.
- Eventuali note o scelte di design per l'interfaccia utente.
