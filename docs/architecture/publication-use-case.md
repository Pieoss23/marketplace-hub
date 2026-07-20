# Caso d’uso di pubblicazione

`PublishListingUseCase` orchestra una singola pubblicazione senza dipendere da NestJS o Prisma.

## Flusso

1. crea e salva la pubblicazione nello stato `draft`;
2. passa a `validating`;
3. esegue la validazione generale iniettata;
4. esegue la validazione specifica del connettore;
5. passa a `ready` e trasforma l’annuncio nel payload specifico;
6. passa a `publishing` e invoca il connettore;
7. salva `published` con l’identificativo esterno, oppure `failed` con un errore strutturato.

Ogni transizione viene salvata indipendentemente attraverso `PublicationStore`. L’implementazione `InMemoryPublicationStore` è destinata ai test e alla verifica locale del flusso.

## Confine di persistenza

`PublicationStore` è una porta applicativa asincrona. `PrismaPublicationStore` la implementa nel backend, mentre il caso d’uso e il connettore non importano Prisma né accedono direttamente al database.

L’adapter è esposto da `PublicationsModule` tramite il token `PUBLICATION_STORE`. La composizione del caso d’uso, gli endpoint REST e i relativi contratti restano separati e possono evolvere senza cambiare l’orchestrazione.

## Validazione generale

Il validatore generale è ricevuto come dipendenza `ListingValidator`. In composizione deve essere usato `validateListing` del package `domain`; nei test può essere sostituito per verificare l’ordine e l’arresto anticipato del flusso.
