# AGENTS.md — Marketplace Hub

## Contesto del progetto

Marketplace Hub è un’applicazione che permette di creare un singolo annuncio di vendita e prepararlo per la pubblicazione su più marketplace.

La V1 deve concentrarsi esclusivamente su:

1. salvataggio centralizzato dell’annuncio;
2. selezione dei marketplace;
3. validazione generale e specifica per connettore;
4. trasformazione dell’annuncio in un payload specifico;
5. pubblicazione attraverso un connettore mock;
6. salvataggio indipendente dello stato di ogni pubblicazione.

Non implementare ancora:

* inbox unificata;
* messaggi provenienti dai marketplace;
* suggerimenti AI;
* sincronizzazione degli annunci venduti;
* scraping;
* browser automation;
* integrazioni non documentate;
* API reali di eBay, Subito, Vinted, Facebook o Wallapop.

## Stack

* TypeScript strict
* Angular per il frontend
* NestJS per il backend
* PostgreSQL
* Prisma ORM
* pnpm workspace
* REST API
* OpenAPI
* class-validator
* Docker Compose
* test unitari e di integrazione

## Architettura

Usare un monorepo con questa struttura:

* `apps/api`: backend NestJS
* `apps/web`: frontend Angular
* `packages/domain`: dominio puro
* `packages/contracts`: contratti API condivisi
* `packages/connector-sdk`: interfacce e tipi dei connettori
* `docs`: documentazione e decision record

Il dominio non deve dipendere da:

* NestJS;
* Angular;
* Prisma;
* librerie HTTP;
* SDK di marketplace.

## Principi di progettazione

1. Esiste un solo annuncio centrale.
2. Ogni marketplace possiede una configurazione specifica separata.
3. Ogni pubblicazione possiede uno stato indipendente.
4. I connettori devono implementare un contratto comune.
5. Il controller HTTP non deve contenere logica di dominio.
6. Il connettore non deve accedere direttamente al database.
7. La validazione deve restituire errori strutturati.
8. I payload esterni non devono diventare il modello centrale.
9. Non inventare API o comportamenti dei marketplace.
10. La prima implementazione deve utilizzare esclusivamente un MockConnector.

## Regole operative per l’agente

Prima di modificare codice:

1. leggere `AGENTS.md`;
2. leggere i documenti rilevanti in `docs`;
3. ispezionare l’implementazione esistente;
4. proporre un piano sintetico;
5. indicare eventuali assunzioni.

Durante l’implementazione:

* procedere con modifiche piccole;
* evitare refactoring non richiesti;
* non aggiungere dipendenze senza motivazione;
* non cambiare contratti pubblici senza segnalarlo;
* mantenere TypeScript strict;
* aggiungere test per ogni comportamento introdotto;
* utilizzare nomi espliciti;
* non utilizzare `any`;
* aggiornare la documentazione quando viene presa una decisione architetturale;
* non lasciare TODO generici.

Al termine:

1. eseguire lint;
2. eseguire type-check;
3. eseguire test;
4. riepilogare i file modificati;
5. segnalare test falliti o aspetti non completati;
6. aggiornare la documentazione se è stata presa una decisione architetturale.

## Definition of Done

Una task è conclusa soltanto quando:

* il codice compila;
* i test sono presenti e superati;
* non ci sono errori di lint;
* gli endpoint modificati sono documentati;
* gli errori sono gestiti;
* non sono state introdotte integrazioni fittizie;
* il comportamento può essere verificato localmente.
