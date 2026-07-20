# Regole di dipendenza

Le dipendenze ammesse sono:

```text
domain        -> nessuna dipendenza da framework
contracts     -> nessuna dipendenza da frontend o backend
connector-sdk -> può dipendere da domain e contracts
web           -> può dipendere da contracts e domain
api           -> può dipendere da contracts, domain e connector-sdk
```

Inoltre:

- `domain` non importa NestJS, Angular, Prisma, librerie HTTP o SDK marketplace.
- `contracts` contiene tipi di trasporto privi di decoratori e logica specifica di framework.
- `web` non importa codice da `apps/api` e non accede al database.
- i connettori non accedono direttamente alla persistenza;
- i payload esterni non vengono riutilizzati come modello centrale;
- non sono consentiti cicli tra package.
