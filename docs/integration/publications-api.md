# API pubblicazioni mock

## Avvio di una pubblicazione

```http
POST /api/listings/{listingId}/publications/mock
Content-Type: application/json
```

```json
{
  "category": "electronics"
}
```

La configurazione mock viene salvata separatamente dall’annuncio. L’API crea un nuovo tentativo indipendente, esegue validazione generale e specifica, trasforma il payload e invoca esclusivamente `MockConnector`.

La risposta `201 Created` contiene sempre il tentativo creato. `success` indica l’esito e `errors` contiene eventuali errori strutturati. Anche un tentativo fallito rimane consultabile.

```json
{
  "success": true,
  "publication": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "listingId": "8cc3ce57-7cc8-4609-96b1-3606c446f007",
    "marketplaceId": "mock",
    "status": "published",
    "externalId": "mock-87a17b92-c4bf-4b54-bb90-eb6fbcedbb9e",
    "createdAt": "2026-07-12T09:00:00.000Z",
    "updatedAt": "2026-07-12T09:00:01.000Z"
  },
  "errors": []
}
```

Se l’annuncio non esiste, l’API restituisce `404 Not Found`. Gli errori di forma della richiesta sono gestiti dalla validazione globale NestJS.

## Lettura degli stati

```http
GET /api/listings/{listingId}/publications
```

Restituisce tutti i tentativi dell’annuncio, dal più recente al meno recente. Ogni tentativo mantiene stato, identificativo esterno ed eventuale ultimo errore indipendenti.
