# Integrazione tra web app ed estensione Chrome

## Obiettivo

La dashboard Angular e l'estensione Chrome sono due superfici dello stesso
prodotto Marketplace Hub. Condividono l'annuncio centrale e i contratti REST,
ma hanno cicli di esecuzione diversi:

- la web app gestisce creazione, modifica, configurazione e pubblicazione mock;
- l'estensione recupera gli stessi annunci e ne facilita il riutilizzo
  consapevole nel browser;
- l'estensione può funzionare anche quando la dashboard non è aperta, purché
  l'API configurata sia raggiungibile.

## Confini

L'integrazione usa soltanto interfacce documentate:

```text
web app ───────┐
               ├── REST API /api/announcements ── annuncio centrale
estensione ────┘

estensione ── deep link ?announcementId=<id> ──> web app
estensione <── scheda attiva con lo stesso parametro ── web app
```

Non vengono condivisi direttamente stato Angular, storage del browser,
selettori DOM della web app o accesso al database. I tipi di trasporto
provengono da `@marketplace-hub/contracts`.

L'estensione mantiene separati:

- `apiBaseUrl`, necessario per il funzionamento autonomo;
- `webAppBaseUrl`, necessario solo per aprire nella dashboard l'annuncio
  selezionato.

Web app ed estensione usano gli stessi contratti `LoginRequest` e
`AuthResponse`, ma non condividono storage di sessione. L'estensione esegue il
login attraverso la REST API, conserva solo JWT e utente in
`chrome.storage.local` e cancella la sessione su logout, cambio endpoint o
risposta `401`. La password vive soltanto nel form durante la richiesta.

Nello stato V1 corrente il backend protegge le mutazioni Announcement, mentre
le letture restano pubbliche per decisione esplicita dei test API. Il popup
richiede comunque una sessione per coerenza di prodotto. L'eventuale protezione
server delle letture deve essere decisa insieme al modello di ownership degli
annunci; non va simulata soltanto nel client.

Il manifest autorizza in modo permanente soltanto API locali. Un endpoint
HTTP(S) remoto richiede un host permission opzionale limitato alla sua origine,
richiesto dal click esplicito con cui l'utente salva la configurazione. Il
permesso non abilita content script remoti: questi restano vincolati alla sola
pagina demo controllata.

La web app accetta il parametro opzionale `announcementId` e mette in evidenza
la scheda corrispondente. Il parametro non concede capacità ulteriori e non
sostituisce la lettura dell'annuncio attraverso l'API.

Il percorso inverso parte sempre dall'azione “Usa nell'estensione” nella
dashboard. L'azione aggiorna l'URL della scheda corrente; quando l'utente apre
il popup, l'estensione legge la sola scheda attiva e preseleziona l'annuncio se
origin e path coincidono con `webAppBaseUrl`. L'annuncio completo viene comunque
caricato dalla REST API: il parametro trasporta soltanto l'identificatore.

## Roadmap

### Incremento 1 — fondamenta verificabili

- build unpacked riproducibile;
- configurazione API locale;
- configurazione API remota con consenso host per singola origine;
- elenco e selezione annunci;
- copie esplicite e compilazione della sola pagina demo;
- validazione runtime di risposte API e messaggi content script;
- controller popup isolato dalle API Chrome;
- login/logout autonomi tramite i contratti auth condivisi;
- test automatici sui confini del manifest.

### Incremento 2 — coesione con la dashboard

- URL web app configurabile;
- azione esplicita “Apri nella web app”;
- deep link per evidenziare lo stesso annuncio in Angular;
- azione esplicita “Usa nell'estensione” e preselezione dal contesto della
  scheda attiva;
- terminologia e feedback coerenti tra le due superfici.

### Incremento 3 — validazione end-to-end locale

- smoke test dell'artefatto `dist`;
- avvio coordinato di API, web app e pagina demo;
- checklist ripetibile per caricamento unpacked e prova completa;
- raccolta manuale delle metriche definite nel piano di validazione.

### Incrementi futuri, subordinati ad approvazione

Ogni adattatore per un sito reale richiede una decisione separata, verifica dei
termini applicabili, selettori documentati e approvazione esplicita. Non sono
ammessi invio automatico di form, click automatici, scraping o pubblicazione
senza un'azione consapevole dell'utente.
