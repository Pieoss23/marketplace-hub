# Task: Test Unitari e Funzionali per la Modifica dell'Annuncio (Edit)

## Obiettivo
Scrivere i test di regressione e di unità nel file di test del componente principale (`app.component.spec.ts`) per verificare il comportamento della funzionalità di modifica dell'annuncio implementata da Claude Code.

---

## Dettagli Esecutivi

- **Branch di riferimento**: `feat/frontend-edit-listing` (stesso branch dell'implementazione per facilitare la verifica globale).
- **File autorizzato per la modifica**:
  - [app.component.spec.ts](file:///home/poss/dev/reseller_cross/apps/web/src/app/app.component.spec.ts)
- **File vietati**:
  - Tutti i file applicativi (inclusi `app.component.ts`, `app.component.html`, contratti, ecc.).

---

## Requisiti e Casi di Test Richiesti

Devi implementare test che coprano i seguenti scenari:

1. **Popolamento del Form in Edit**:
   - Verificare che cliccando sul pulsante "Modifica" di un annuncio esistente, il form venga popolato con i valori corretti dell'annuncio (titolo, descrizione, prezzo in euro convertito, URL immagine).
   - Verificare che il componente entri nello stato di modifica.

2. **Salvataggio con Successo (PATCH)**:
   - Simulare il submit del form in modalità modifica.
   - Verificare che venga effettuata una richiesta HTTP `PATCH` all'URL `/api/listings/{id}` con il body corretto (`UpdateListingRequest`).
   - Simulare una risposta positiva (`200 OK` con il modello aggiornato) e verificare che la lista locale degli annunci rifletta le modifiche apportate.
   - Verificare che l'applicazione esca dalla modalità modifica e che il form venga resettato.

3. **Annullamento della Modifica (Cancel)**:
   - Verificare che cliccando sul pulsante "Annulla" durante la modifica, il form venga resettato e l'applicazione esca dallo stato di modifica.

4. **Gestione degli Errori dell'API**:
   - Simulare il submit in modalità modifica e fare in modo che il server risponda con un errore (es. `400 Bad Request` o `422 Unprocessable Entity` con errori strutturati).
   - Verificare che i messaggi di errore vengano estratti correttamente e mostrati nel pannello degli errori della pagina (`pageErrors`).

---

## Formato del Risultato
Quando hai completato la stesura dei test, scrivi un report riassuntivo in:
`.agents/outbox/codex/task-edit-listing-tests.md`

Il report deve contenere:
- L'elenco dei casi di test aggiunti.
- L'esito dell'esecuzione locale dei test (dopo che il codice di Claude è stato integrato).
- Eventuali note tecniche sulla suite di test.
