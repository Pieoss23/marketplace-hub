# Perimetro V1

## Dentro la V1

- un singolo annuncio centrale salvato in modo centralizzato;
- selezione dei marketplace;
- validazione generale e specifica del connettore con errori strutturati;
- trasformazione in payload specifici;
- pubblicazione esclusivamente attraverso un `MockConnector`;
- salvataggio indipendente dello stato di ogni pubblicazione.

## Fuori dalla V1

- inbox e sincronizzazione dei messaggi;
- funzionalità AI interne al prodotto;
- statistiche;
- scraping;
- automazione browser;
- integrazioni o API di marketplace reali;
- sincronizzazione automatica degli annunci venduti.

Il frontend V1 include dashboard, creazione ed eliminazione degli annunci, configurazione del marketplace mock, pubblicazione e lettura degli stati indipendenti. Autenticazione e upload di file restano fuori dal perimetro.

In parallelo alla V1 applicativa è ammesso un esperimento separato di estensione
Chrome per validare il riutilizzo assistito dell'annuncio. Il suo perimetro e i
criteri di successo sono definiti in
[`extension-validation.md`](./extension-validation.md). L'esperimento non
equivale a un'integrazione con marketplace reali e non pubblica annunci.
