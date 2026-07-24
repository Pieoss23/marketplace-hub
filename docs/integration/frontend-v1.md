# Frontend V1

La dashboard Angular implementa il flusso utente essenziale della V1 in una singola pagina responsive.

## Funzionalità

- accesso e registrazione (`/login`, `/signup`); il resto dell'app è
  raggiungibile solo con una sessione valida (`authGuard`);
- verifica sintetica della raggiungibilità del backend;
- elenco degli annunci centrali;
- ricerca per titolo, descrizione o categoria e filtro per stato, applicati
  localmente agli annunci già caricati;
- riepilogo visuale degli stati con contatori che applicano direttamente il
  filtro della dashboard;
- creazione di un annuncio con titolo, descrizione, prezzo positivo in EUR,
  categoria, condizione e quantità; i vincoli sono verificati localmente prima
  dell'invio e restano validati nuovamente dall'API (massimo due decimali per
  il prezzo, categoria entro 200 caratteri e quantità intera positiva);
- modifica inline di titolo, descrizione e prezzo dell'annuncio centrale;
- eliminazione di un annuncio con conferma esplicita e annullamento;
- configurazione della categoria per il solo marketplace `mock`;
- avvio della pubblicazione mock;
- visualizzazione dell’esito e degli errori strutturati;
- caricamento dello storico indipendente delle pubblicazioni.
- deep link opzionale `?announcementId=<id>` usato dall'estensione Chrome per
  mettere in evidenza un annuncio già caricato dalla REST API.
- azione esplicita “Usa nell'estensione”, che prepara lo stesso parametro nella
  scheda attiva affinché il popup possa preselezionare l'annuncio.

## Confini

Non sono presenti upload di file, marketplace reali, inbox, AI o automazione browser. Il frontend usa esclusivamente i contratti esportati da `@marketplace-hub/contracts` e gli endpoint REST documentati. L'autenticazione non introduce isolamento dei dati per utente: tutti gli account condividono lo stesso spazio di annunci.

## Struttura della pagina

`AppComponent` orchestra caricamento, filtri e chiamate REST. Ogni annuncio è
renderizzato da `AnnouncementCardComponent`, che riceve stato e risultati come
input ed emette azioni esplicite per modifica, eliminazione, configurazione,
validazione e pubblicazione. La scheda non accede direttamente ai servizi HTTP.

## Sviluppo locale

Avviare PostgreSQL e API, quindi:

```bash
pnpm --filter @marketplace-hub/web start
```

Il proxy Angular inoltra `/api` al backend su `http://localhost:3000`.
