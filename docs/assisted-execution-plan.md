# Plano operacional de execução assistida — v0.8.8

O módulo transforma uma otimização de orçamento válida em tarefas manuais organizadas em quatro fases: preparação, validação, lançamento e acompanhamento.

## Regras

- nenhuma tarefa começa concluída;
- tarefas dependentes só podem ser aprovadas após a conclusão das anteriores;
- uma tarefa precisa ser aprovada antes de ser concluída;
- orçamento, alocações e limites são herdados da otimização;
- planos com violações não são aceitos;
- toda mudança de status gera histórico local;
- snapshots e relatórios Markdown podem ser exportados;
- nenhum anúncio, compra, campanha, integração ou marketplace é alterado automaticamente.

## API

```js
const plan = CommerceRadarAssistedExecutionPlan.createPlan(runId);
CommerceRadarAssistedExecutionPlan.updateTask(plan.id, taskId, 'approved', 'Revisado', 'Responsável');
CommerceRadarAssistedExecutionPlan.updateTask(plan.id, taskId, 'completed');
CommerceRadarAssistedExecutionPlan.exportMarkdown(plan.id);
```

Tehkné Solutions
