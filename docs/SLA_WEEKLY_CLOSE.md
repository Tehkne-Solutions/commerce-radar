# SLA e fechamento semanal — Commerce Radar v0.5.4

A área **SLA e fechamento** transforma os snapshots operacionais da v0.5.3 em uma rotina semanal de governança.

## Objetivos

O módulo responde:

1. A equipe cumpriu as metas operacionais da semana?
2. O resultado melhorou ou piorou em relação à semana anterior?
3. Quais responsáveis apresentam desvios recorrentes?
4. Quais decisões e ações devem ser preservadas no fechamento?

## Fonte dos indicadores

Os indicadores semanais usam os snapshots de cumprimento já armazenados em:

```text
trendComplianceSnapshots
```

Cada semana considera de segunda-feira a domingo.

Quando existem vários snapshots na semana:

- cumprimento: média dos snapshots disponíveis;
- concluídas: maior indicador registrado na semana;
- atrasos: valor do snapshot mais recente;
- sobrecarga: média de utilização por responsável;
- resultado individual: valores do snapshot mais recente, com utilização média.

Ausência de snapshot não é convertida em dado estimado. Sem dados, a semana aparece como **Sem dados**.

## Metas de SLA

Metas configuráveis:

- cumprimento mínimo da equipe;
- máximo de atrasos da equipe;
- utilização máxima;
- cumprimento mínimo individual;
- máximo de atrasos individual;
- número de semanas analisadas para recorrência.

A configuração inicial é:

```text
Cumprimento da equipe: 85%
Atrasos da equipe: até 2
Utilização máxima: 100%
Cumprimento individual: 80%
Atrasos individuais: até 1
Recorrência: 4 semanas
```

## Classificação

A equipe recebe:

- **Dentro do SLA:** todas as verificações passam;
- **Atenção:** uma verificação falha;
- **Fora do SLA:** duas ou mais verificações falham;
- **Sem dados:** nenhum snapshot existe para a semana.

Cada responsável recebe a mesma classificação com base em:

- cumprimento individual;
- atrasos individuais;
- utilização.

## Comparação semanal

A semana atual é comparada com a anterior em:

- cumprimento, em pontos percentuais;
- revisões concluídas;
- atrasos abertos;
- responsáveis sobrecarregados.

Redução de atrasos e sobrecarga é tratada como melhora.

## Desvios recorrentes

O sistema percorre as semanas do horizonte configurado e conta falhas por responsável em:

- cumprimento;
- atraso;
- utilização.

Um responsável aparece em **Desvios repetidos** quando possui ao menos dois desvios no horizonte. Isso é um sinal operacional para investigação, não uma avaliação de desempenho individual.

## Fechamento semanal

Cada semana pode ter um fechamento com:

- estado rascunho ou fechado;
- resumo congelado dos indicadores;
- comparação com a semana anterior;
- avaliação de SLA;
- desvios recorrentes;
- decisões registradas;
- ações com responsável, prazo e estado;
- data de criação, atualização e fechamento;
- assinatura da Tehkné Solutions.

Fechar uma semana não altera snapshots anteriores. Um fechamento salvo mantém seu resumo mesmo que os dados operacionais sejam alterados depois.

## Exportação

O relatório Markdown inclui:

- período;
- estado do fechamento;
- SLA;
- cumprimento;
- atrasos;
- sobrecarga;
- variação semanal;
- decisões;
- checklist de ações;
- desvios recorrentes;
- assinatura da Tehkné Solutions.

## Backup e sincronização

A versão adiciona:

```text
trendSlaSettings
trendWeeklyClosings
```

Os campos entram no backup JSON, restauração, sincronização e histórico de versões do workspace.

Não é necessária uma nova migration no Supabase porque os dados continuam dentro do JSON versionado.

## Limitações

- SLA mede execução operacional, não a qualidade ou veracidade da evidência.
- Snapshots incompletos produzem uma visão parcial da semana.
- A média semanal não substitui uma auditoria detalhada de cada revisão.
- Utilização é baseada na capacidade informada pela equipe.
- Desvio recorrente não deve ser usado isoladamente para avaliação de pessoas.
- Fechamentos não substituem atas formais, governança corporativa ou gestão de desempenho.

## Assinatura

Tehkné Solutions
