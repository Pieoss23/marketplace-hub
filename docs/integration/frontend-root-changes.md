# Modifiche root richieste per il frontend

> **Stato**: richieste del 10 luglio 2026, risolte durante l'integrazione.
> `pnpm-workspace.yaml`, gli script root e `tsconfig.base.json` includono già
> quanto richiesto qui sotto, e l'`engines.node` root è stato allineato al
> requisito di Angular 20. Contenuto mantenuto come riferimento storico.

Questo agente non ha modificato file root. Durante l'integrazione devono essere verificati o aggiunti i seguenti elementi.

I file root comparsi durante il lavoro includono già entrambi i glob workspace. Lo script root usa il nome `typecheck`; per compatibilità, i package frontend e condivisi espongono sia `type-check` sia l'alias `typecheck`.

## `pnpm-workspace.yaml`

I workspace devono includere almeno:

```yaml
packages:
  - apps/*
  - packages/*
```

## `package.json`

Gli script root dovrebbero delegare ai workspace senza assumere che tutti espongano gli stessi script. Una configurazione possibile è:

```json
{
  "scripts": {
    "build:web": "pnpm --filter @marketplace-hub/contracts build && pnpm --filter @marketplace-hub/web build",
    "lint:web": "pnpm --filter @marketplace-hub/web lint",
    "test:web": "pnpm --filter @marketplace-hub/web test",
    "type-check:web": "pnpm --filter @marketplace-hub/contracts type-check && pnpm --filter @marketplace-hub/domain type-check && pnpm --filter @marketplace-hub/connector-sdk type-check && pnpm --filter @marketplace-hub/web type-check"
  }
}
```

## `tsconfig.base.json`

Non è necessario un alias sorgente se pnpm collega `@marketplace-hub/contracts` e il package viene compilato prima del frontend. Se l'integrazione sceglie path alias per lo sviluppo, deve mapparli unicamente agli entry point pubblici e mantenere coerenti build e test.

## Versioni

`apps/web/package.json` usa una linea coerente Angular/Angular ESLint 20, TypeScript 5.8 e Zone.js 0.15. Il lockfile root dovrà essere generato durante l'installazione e le versioni dovranno essere allineate con eventuali scelte root dell'agente backend.

Angular 20 richiede una versione Node supportata dalla relativa toolchain; la dichiarazione root `node >=18` apparsa durante il lavoro è troppo permissiva e deve essere allineata almeno alla versione minima indicata da Angular 20 prima del merge.
