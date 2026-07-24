# Protocollo di validazione con partecipanti

Questo protocollo rende eseguibili le interviste e i test descritti in
[`extension-validation.md`](./extension-validation.md). Non autorizza test su
marketplace reali: tutte le prove dell'estensione avvengono sulla pagina demo
controllata dal progetto.

## Obiettivo e campione

Coinvolgere almeno 5 persone che pubblichino regolarmente lo stesso oggetto su
due o più marketplace. Ogni partecipante esegue una sessione individuale di
circa 30 minuti.

Assegnare a ogni partecipante un identificativo anonimo (`P01`–`P05`). Non
registrare nomi account, password, contenuti di annunci privati o altre
informazioni che permettano di identificare la persona.

## Preparazione

Prima di ogni sessione:

1. verificare che API, web app e pagina demo siano raggiungibili;
2. caricare in Chrome la build unpacked dell'estensione;
3. predisporre un account Marketplace Hub di test e almeno un annuncio
   sintetico, uguale per tutti i partecipanti;
4. azzerare il form demo e riportare il popup allo stato iniziale;
5. preparare un cronometro e una copia della
   [scheda sessione](./extension-study-session.md).

La persona che osserva può spiegare lo scopo dello studio e il compito, ma non
deve mostrare in anticipo il flusso dell'estensione.

## Apertura e intervista

Chiedere un consenso esplicito alla raccolta delle sole misure indicate nella
scheda. In caso di mancato consenso, interrompere la sessione e non conservare
dati.

Domande iniziali:

1. Su quanti marketplace pubblichi abitualmente lo stesso oggetto?
2. Con quale frequenza duplichi un annuncio?
3. Puoi descrivere o mostrare il tuo processo attuale senza usare dati
   personali?
4. Quali campi copi e quali riscrivi per ogni marketplace?
5. Dove perdi più tempo o commetti più errori?
6. Usi già strumenti per ridurre questo lavoro?

Annotare sintesi e frequenze, non trascrizioni contenenti dati personali.

## Test comparativo

Usare lo stesso annuncio sintetico e lo stesso form demo in entrambi i
tentativi. Per limitare l'effetto apprendimento, alternare l'ordine tra i
partecipanti: `P01`, `P03` e `P05` iniziano con il metodo abituale; `P02` e
`P04` iniziano con l'estensione.

Per ogni tentativo:

1. leggere la consegna: “Completa titolo, descrizione e prezzo nel form demo.
   Fermati quando ritieni che i dati siano corretti”;
2. avviare il cronometro quando il partecipante compie la prima azione;
3. non guidare il partecipante; se chiede aiuto, annotarlo e fornire soltanto
   l'indicazione minima necessaria per continuare;
4. fermare il cronometro quando il partecipante dichiara di avere terminato;
5. contare le operazioni manuali di copia/incolla, gli errori per campo e le
   modifiche successive alla prima compilazione;
6. ripristinare il form prima del tentativo successivo.

Un tentativo è completato senza assistenza se tutti e tre i campi sono corretti
e l'osservatore non ha fornito indicazioni operative.

## Domande conclusive

1. Quale passaggio è stato meno chiaro?
2. Quali campi avresti comunque adattato per un marketplace specifico?
3. Useresti questo flusso nel tuo processo reale? Perché?
4. L'installazione dell'estensione ti sembra giustificata dal tempo risparmiato?
5. Quale singolo cambiamento renderebbe il flusso più utile?

Registrare l'intenzione di riutilizzo come `sì`, `no` o `incerto`, conservando
una breve motivazione anonima.

## Calcolo dei risultati

Per ciascun partecipante calcolare:

```text
riduzione percentuale = (tempo abituale - tempo estensione) / tempo abituale × 100
```

Calcolare poi:

- mediana dei tempi per ciascun metodo;
- riduzione percentuale tra le due mediane;
- mediana delle operazioni manuali per ciascun metodo;
- numero di partecipanti che completano il flusso estensione senza assistenza;
- numero di partecipanti che dichiara di volerlo riutilizzare;
- numero di partecipanti che descrive la duplicazione come problema ricorrente.

Non calcolare la riduzione per una sessione con tempo abituale pari a zero.
Segnalare sessioni interrotte o problemi tecnici separatamente, senza
considerarle successi.

## Decisione

Applicare i criteri già approvati in
[`extension-validation.md`](./extension-validation.md):

- problema ricorrente per almeno 4 partecipanti su 5;
- riduzione del tempo mediano di almeno il 30%;
- completamento senza assistenza per almeno 4 partecipanti su 5;
- nessun rischio incompatibile con i termini del futuro sito pilota.

Se tutti i criteri sono soddisfatti, il risultato permette soltanto di
proporre il perimetro di un singolo adattatore pilota. La sua implementazione
richiede ancora verifica dei termini, documentazione e approvazione esplicita.
