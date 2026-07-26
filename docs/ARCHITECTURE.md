# Arquitetura — Commerce Radar 0.2

## Componentes

- `index.html`: estrutura das telas e formulários.
- `styles.css`: sistema visual e responsividade.
- `data.js`: catálogo inicial e taxonomias.
- `app.js`: score, filtros, persistência, exportações e experimentos.
- `sw.js`: cache e suporte offline.
- `manifest.webmanifest`: instalação como PWA.

## Persistência

A versão 0.2 usa LocalStorage:

- análises: `tehkne-commerce-radar-v2-analyses`;
- experimentos: `tehkne-commerce-radar-v2-tests`.

A aplicação migra análises encontradas em `tehkne-commerce-radar-v1`.

## Princípios

- zero dependências de runtime;
- zero build;
- publicação estática;
- funcionamento progressivo offline;
- dados privados no dispositivo;
- integrações futuras somente por APIs oficiais.

## Evolução prevista

Quando a necessidade de colaboração for validada, a camada local poderá ser substituída ou sincronizada com Supabase sem alterar o modelo central de análise e experimentos.

## Assinatura

Tehkné Solutions