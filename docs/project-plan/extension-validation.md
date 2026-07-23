# Validazione dell'estensione Chrome

## Ipotesi da validare

Chi pubblica lo stesso oggetto su più marketplace risparmia tempo e riduce gli
errori se può recuperare un annuncio centrale e copiarne rapidamente i campi
dal browser.

Prima di costruire adattatori per siti reali, l'esperimento deve verificare:

- che il problema sia frequente per gli utenti target;
- che il flusso estensione → selezione annuncio → copia campo sia comprensibile;
- che il risparmio percepito giustifichi l'installazione di un'estensione;
- quali campi richiedano comunque adattamento per ogni marketplace.

## MVP da testare

L'MVP è una Chrome extension in `apps/extension` che usa l'API esistente e
consente di:

1. visualizzare gli annunci centrali;
2. selezionare un annuncio;
3. copiare separatamente titolo, descrizione e prezzo;
4. copiare un riepilogo completo;
5. compilare, dopo un comando esplicito, una pagina form demo inclusa nel
   progetto.

Non sono inclusi login ai marketplace, memorizzazione delle loro credenziali,
adattatori per siti reali, click automatici o pubblicazione automatica.

## Metodo di validazione

### 1. Interviste sul problema

Intervistare almeno 5 persone che pubblicano regolarmente su due o più
marketplace. Chiedere di mostrare il processo attuale e misurare, senza
suggerire la soluzione:

- marketplace usati e frequenza di pubblicazione;
- tempo necessario per duplicare un annuncio;
- dati copiati e dati riscritti;
- errori o abbandoni più frequenti;
- strumenti già utilizzati per ridurre il lavoro.

### 2. Test del prototipo

Far completare a ogni partecipante lo stesso annuncio su una pagina demo:

- una volta con il metodo abituale;
- una volta con l'estensione;
- senza guidare l'utente durante il secondo tentativo.

Registrare solo eventi e tempi necessari alla ricerca; non acquisire password,
contenuti privati o dati inseriti su marketplace reali.

### 3. Metriche

Metriche primarie:

- tempo mediano di completamento;
- numero di operazioni manuali di copia e incolla;
- percentuale di utenti che completa il flusso senza aiuto;
- intenzione dichiarata di riutilizzare l'estensione nel processo reale.

Metriche diagnostiche:

- errori per campo;
- campi modificati dopo la copia;
- punti di abbandono;
- richieste di compilazione automatica per sito.

## Criteri di decisione

Passare a un singolo adattatore pilota per un marketplace reale solo se:

- almeno 4 partecipanti su 5 descrivono la duplicazione come problema
  ricorrente;
- il tempo mediano si riduce almeno del 30%;
- almeno 4 partecipanti su 5 completano il test senza assistenza;
- non emergono rischi incompatibili con i termini del sito pilota.

Se i criteri non vengono raggiunti, analizzare le registrazioni e modificare il
flusso di copia prima di aggiungere automazione o nuovi marketplace.

## Verifica tecnica locale

L'esperimento sarà considerato verificabile quando saranno disponibili:

- build riproducibile dell'estensione unpacked;
- configurazione locale dell'URL API;
- login Marketplace Hub senza persistenza della password e pulizia della
  sessione su logout o token non valido;
- richiesta esplicita del permesso host quando viene configurata un'origine API
  non locale;
- pagina form demo con campi noti;
- test unitari per mapping e formattazione dei dati;
- test del messaggio tra popup e pagina demo;
- checklist manuale per caricamento in Chrome e prova end-to-end.

Qualsiasi adattatore futuro deve restare separato dal modello centrale e non può
introdurre nel dominio selettori DOM o payload specifici del sito.

## Stato al 23 luglio 2026

La verifica tecnica locale è stata completata con esito positivo:

- build unpacked e smoke check superati;
- caricamento manuale in Chrome riuscito;
- autenticazione e lettura annunci via REST API riuscite;
- azioni di copia verificate;
- messaggio popup → content script e compilazione della pagina demo verificati;
- integrazione bidirezionale con la dashboard verificata;
- lint, type-check, build e suite automatiche del monorepo superati.

Restano da eseguire le interviste e i test osservati con almeno 5 partecipanti.
Di conseguenza non è ancora possibile applicare i criteri quantitativi di
decisione né autorizzare un adattatore per un marketplace reale.
