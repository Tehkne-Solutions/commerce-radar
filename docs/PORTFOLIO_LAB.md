# Laboratório de portfólio — v0.8.6

O módulo distribui um orçamento virtual entre simulações existentes e compara composições conservadora, balanceada e agressiva.

## Métricas

- retorno esperado em R$;
- pior caso estimado em R$;
- risco ponderado;
- concentração pelo índice de Herfindahl;
- diversificação em escala de 0 a 100;
- valor ajustado ao risco;
- alertas por concentração em recomendação, canal ou produto.

## API

```js
const portfolio = CommerceRadarPortfolioLab.allocate(10000, 'balanceado');
CommerceRadarPortfolioLab.compare();
CommerceRadarPortfolioLab.recordDecision(portfolio.id, 'approved', 'Aprovado apenas como referência');
CommerceRadarPortfolioLab.exportMarkdown();
```

## Segurança funcional

As alocações são exclusivamente virtuais. O módulo não altera orçamento, campanhas, produtos, canais, playbooks ou experimentos reais.

Tehkné Solutions