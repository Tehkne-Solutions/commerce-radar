# Commerce Radar — Simulador de decisões v0.8.5

## Objetivo

Comparar recomendações adaptativas em cenários conservador, base e agressivo antes de qualquer ação real.

## Entradas

- receita atual;
- margem percentual;
- taxa de conversão;
- CAC;
- investimento adicional.

## Saídas

Cada cenário apresenta receita projetada, margem projetada, conversão, CAC, risco, pior caso e valor ajustado ao risco. Valores monetários são formatados em Real brasileiro (`pt-BR`).

## API

```js
const simulation = CommerceRadarDecisionSimulator.simulate('adaptive-exp-1', {
  revenue: 10000,
  marginRate: 0.35,
  conversionRate: 0.025,
  cac: 45,
  investment: 1500
});

CommerceRadarDecisionSimulator.compare();
CommerceRadarDecisionSimulator.recordDecision(simulation.id, 'approved');
CommerceRadarDecisionSimulator.exportMarkdown();
```

## Segurança funcional

A simulação é informativa. Nenhum orçamento, experimento, produto, canal, playbook ou recomendação é aplicado automaticamente.

Tehkné Solutions