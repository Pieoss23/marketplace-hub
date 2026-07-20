# MockConnector

`MockConnector` è l’unica implementazione di connettore prevista nella V1. È registrato nel backend tramite `ConnectorsModule` e non effettua chiamate esterne né accede al database.

## Configurazione

La configurazione mock contiene soltanto `category`, una stringa obbligatoria e non vuota. Questa regola serve a esercitare la validazione specifica del connettore senza rappresentare il comportamento di un marketplace reale.

## Validazione specifica

Il connettore restituisce errori strutturati quando:

- `configuration.category` è vuota;
- il titolo supera 80 caratteri.

La validazione generale dell’annuncio resta separata nel package `domain` e deve essere eseguita dal futuro caso d’uso prima della validazione specifica.

## Trasformazione e pubblicazione

La trasformazione crea un `MockConnectorPayload` dedicato con categoria, contenuto dell’annuncio, prezzo e URL delle immagini ordinati. Il payload non viene riutilizzato come modello centrale.

La pubblicazione non effettua operazioni di rete. Restituisce un identificativo locale con prefisso `mock-` e il timestamp di pubblicazione. Generatore dell’identificativo e clock sono sostituibili nei test per mantenere risultati deterministici.
