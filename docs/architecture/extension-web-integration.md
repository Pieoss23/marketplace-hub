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
login attraverso la REST API, conserva access token, refresh token e utente in
`chrome.storage.local` e non conserva mai la password. Su un `401` ruota il
refresh token e ripete una sola volta la lettura; un refresh fallito cancella
la sessione. Il logout cancella subito lo stato locale e tenta la revoca lato
server in modalità best-effort.

Nello stato V1 corrente il backend protegge **tutti** gli endpoint Announcement,
letture incluse (`JwtAuthGuard` a livello di controller): la sessione richiesta
dal popup non è solo coerenza di prodotto lato client, ma riflette un vincolo
reale del server. Un token mancante o scaduto restituisce `401`; l'estensione
lo intercetta, cancella la sessione locale e richiede un nuovo accesso. Non
esiste isolamento dei dati per utente: tutti gli account autenticati vedono lo
stesso spazio di annunci, coerente con "un singolo annuncio centrale"
(`docs/project-plan/v1-scope.md`).

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

## Modello di coerenza funzionale

Web app ed estensione sono superfici coordinate, non copie identiche. La web
app è la superficie completa: può includere flussi articolati, viste di
dettaglio, configurazioni e strumenti di gestione. L'estensione è una
superficie rapida e intenzionalmente più piccola: contiene le funzionalità
principali utili durante il riutilizzo dell'annuncio nel browser.

Per ogni incremento della web app, il piano deve stabilire se la modifica
interessa il nucleo condiviso:

| Esito | Criterio | Obbligo |
| --- | --- | --- |
| Nucleo condiviso | La funzione è essenziale per consultare, selezionare o riutilizzare consapevolmente l'annuncio nel browser | Mantenere coerenti web app ed estensione nello stesso incremento |
| Funzione web avanzata | La funzione riguarda gestione, analisi, configurazione o un flusso articolato | Mantenerla nella web app e, se utile, offrire un deep link dall'estensione |
| Esclusione | La funzione viola i confini di sicurezza o non ha senso nell'estensione | Non replicarla e non aggirare il limite |

Il nucleo condiviso usa i contratti e la REST API; non duplica logica di
dominio nel popup e non condivide direttamente lo stato Angular. Copia,
apertura della dashboard e compilazione della pagina demo restano sempre
azioni esplicite.

Esempi correnti:

- autenticazione, elenco, selezione e contesto dell'annuncio hanno parità;
- creazione, modifica e configurazione completa restano nella web app e sono
  raggiungibili tramite apertura esplicita della dashboard;
- pubblicazione mock, eliminazione e qualsiasi invio automatico non vengono
  replicati nel popup;
- integrazioni con siti reali restano escluse finché non vengono approvate
  separatamente.

Una modifica al nucleo condiviso è completa solo con test su entrambe le
superfici. Una nuova delega alla web app deve verificare il deep link. Una
nuova classe di esclusione deve essere documentata senza trasformare
l'estensione in una seconda dashboard completa.

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
