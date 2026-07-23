# Frontend V1

La dashboard Angular implementa il flusso utente essenziale della V1 in una singola pagina responsive.

## Funzionalità

- verifica sintetica della raggiungibilità del backend;
- elenco degli annunci centrali;
- creazione di un annuncio con titolo, descrizione, prezzo EUR e URL immagine opzionale;
- modifica inline di titolo, descrizione e prezzo dell'annuncio centrale;
- eliminazione di un annuncio;
- configurazione della categoria per il solo marketplace `mock`;
- avvio della pubblicazione mock;
- visualizzazione dell’esito e degli errori strutturati;
- caricamento dello storico indipendente delle pubblicazioni.
- deep link opzionale `?announcementId=<id>` usato dall'estensione Chrome per
  mettere in evidenza un annuncio già caricato dalla REST API.
- azione esplicita “Usa nell'estensione”, che prepara lo stesso parametro nella
  scheda attiva affinché il popup possa preselezionare l'annuncio.

## Confini

Non sono presenti autenticazione, upload di file, marketplace reali, inbox, AI o automazione browser. Il frontend usa esclusivamente i contratti esportati da `@marketplace-hub/contracts` e gli endpoint REST documentati.

## Sviluppo locale

Avviare PostgreSQL e API, quindi:

```bash
pnpm --filter @marketplace-hub/web start
```

Il proxy Angular inoltra `/api` al backend su `http://localhost:3000`.
