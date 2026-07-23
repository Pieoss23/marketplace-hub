# Marketplace Hub — Extension (esperimento di validazione)

MVP di Chrome extension per validare l'ipotesi descritta in
[`docs/project-plan/extension-validation.md`](../../docs/project-plan/extension-validation.md):
chi pubblica lo stesso annuncio su più marketplace può risparmiare tempo se
può recuperare l'annuncio centrale e copiarne rapidamente i campi dal
browser.

Legge gli annunci **esclusivamente** tramite la REST API già esistente
(`GET /api/announcements`). Non effettua login a marketplace, non memorizza le
loro credenziali, non contiene adattatori per siti reali e non compie mai azioni
automatiche: ogni copia o compilazione richiede un comando esplicito
dell'utente nel popup.

L'accesso a Marketplace Hub usa `POST /api/auth/login` e i contratti condivisi:
l'estensione conserva in `chrome.storage.local` il JWT e l'utente restituiti
dall'API, ma non salva mai la password. La sessione è indipendente dallo storage
Angular; dal popup si può aprire la registrazione nella web app.

## Struttura

- `src/popup/` — popup dell'estensione: elenco annunci, selezione, copia
  campi/riepilogo, comando di compilazione del form demo.
- `src/content/demo-form-content-script.ts` — script iniettato solo sulla
  pagina demo (`http://localhost:4300/*`), applica i valori ricevuti dal
  popup ai campi noti (`#demo-title`, `#demo-description`, `#demo-price`).
- `src/lib/` — funzioni pure (mapping, formattazione, contratto messaggi),
  coperte da test unitari.
- `demo/` — pagina form demo statica e piccolo server locale per servirla.

## Build

```bash
pnpm --filter @marketplace-hub/extension build
```

Produce un'estensione unpacked riproducibile in `apps/extension/dist/`.
La build termina con uno smoke check che verifica i file richiesti, Manifest V3
e il collegamento tra popup e bundle generati.

## Configurazione locale dell'URL API

Il popup mostra un campo "URL API" (persistito in `chrome.storage.local`,
default `http://localhost:3000/api`). Cambialo se il backend non gira sulla
porta di default.

Localhost e `127.0.0.1` sono autorizzati dal manifest. Per un endpoint HTTP(S)
diverso, Chrome mostra una richiesta di accesso limitata alla sola origine
configurata quando l'utente preme "Salva". Se il permesso viene rifiutato,
l'URL non viene salvato e non parte alcuna richiesta. URL con protocolli
diversi da HTTP(S) o credenziali incorporate vengono rifiutati.

Il campo "URL web app" (default `http://localhost:4200`) è indipendente
dall'URL API. Serve all'azione esplicita "Apri nella web app", che apre la
dashboard con `?announcementId=<id>` e mette in evidenza lo stesso annuncio.
L'estensione continua a funzionare senza la dashboard aperta.

Nella direzione opposta, il pulsante "Usa nell'estensione" della dashboard
inserisce lo stesso parametro nell'URL corrente. Aprendo poi il popup,
l'annuncio viene preselezionato solo se la scheda attiva coincide con l'URL
della web app configurata. I dati restano letti dalla REST API.

## Test

```bash
pnpm --filter @marketplace-hub/extension test
pnpm --filter @marketplace-hub/extension typecheck
```

La suite verifica mapping e formattazione, validazione delle risposte REST,
contratto messaggio popup → content script, compilazione del DOM demo e confini
di sicurezza del manifest (host locali e permessi minimi).

## Checklist manuale per il caricamento in Chrome e la prova end-to-end

1. Avvia il backend (`pnpm --filter @marketplace-hub/api dev`, con Postgres
   attivo) così che `GET /api/announcements` risponda.
2. Costruisci l'estensione: `pnpm --filter @marketplace-hub/extension build`.
3. In Chrome: `chrome://extensions` → attiva "Modalità sviluppatore" → "Carica
   estensione non pacchettizzata" → seleziona `apps/extension/dist`.
4. Avvia la pagina demo: `pnpm --filter @marketplace-hub/extension demo`
   (serve `http://localhost:4300/`) e aprila in una scheda.
5. Apri il popup dell'estensione, accedi con un account Marketplace Hub e
   verifica che l'URL API sia corretto e che compaia l'elenco degli annunci
   centrali esistenti. Se non hai un account, usa "Crea account nella web app".
6. Seleziona un annuncio e prova, uno alla volta: "Copia titolo", "Copia
   descrizione", "Copia prezzo", "Copia riepilogo completo" — incolla altrove
   per verificare il contenuto copiato.
7. Con la scheda della pagina demo attiva, premi "Compila pagina form demo":
   verifica che titolo, descrizione e prezzo vengano popolati nel form della
   pagina demo.
8. Prova il caso di errore: chiudi il backend o inserisci un URL API errato e
   verifica che il popup mostri un messaggio di errore comprensibile invece di
   fallire silenziosamente.
9. Nella dashboard premi "Usa nell'estensione" su un annuncio, apri il popup e
   verifica che lo stesso annuncio sia preselezionato.
10. Dal popup premi "Apri nella web app" e verifica che la dashboard evidenzi
    lo stesso annuncio.

## Limitazioni (per costruzione, non da rimuovere in questa fase)

- Nessun login o storage di credenziali di marketplace.
- Nessuna password Marketplace Hub persistita; logout, cambio endpoint e
  risposta `401` eliminano la sessione locale dell'estensione.
- Nessun adattatore per siti reali: il content script è vincolato via
  `matches` alla sola pagina demo locale (`localhost:4300`).
- Gli host API remoti sono permessi opzionali: non sono accessibili finché
  l'utente non autorizza esplicitamente l'origine configurata.
- Nessuna azione automatica: ogni copia/compilazione è avviata da un click
  esplicito nel popup.
