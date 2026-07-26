# Operação de revisões — Commerce Radar v0.5.3

A área **Operação de revisões** transforma a fila e o calendário em indicadores de execução para a equipe.

## Objetivo

O módulo responde quatro perguntas:

1. A equipe está revisando as fontes no ritmo necessário?
2. Quantas fontes continuam atrasadas?
3. A carga está distribuída de acordo com a capacidade declarada?
4. Quais ações precisam ser executadas hoje?

Os indicadores são operacionais. Eles não avaliam a qualidade comercial de uma tendência nem substituem a revisão humana da evidência.

## Indicador de cumprimento

O cumprimento é calculado por período de 7, 14 ou 30 dias:

```text
cumprimento =
revisões concluídas no período
÷
(revisões concluídas no período + revisões atrasadas abertas)
```

As ações `source_reviewed` e `batch_review` contam como conclusão. Mais de uma atualização do mesmo sinal no mesmo dia conta uma única vez.

Quando não existem conclusões nem atrasos, o cumprimento é apresentado como 100%, pois não há pendência mensurável.

## Carga de trabalho

A demanda semanal de cada responsável é:

```text
carga = fontes atrasadas + revisões dos próximos 7 dias
```

A utilização é:

```text
utilização = carga ÷ capacidade semanal declarada
```

Estados:

- **Saudável:** abaixo de 80%.
- **Atenção:** de 80% a 100%.
- **Sobrecarregado:** acima de 100%.
- **Sem dono:** fonte próxima ou atrasada sem responsável.

A capacidade é uma premissa operacional informada pela equipe. Ela não mede horas, complexidade ou produtividade individual.

## Rotina diária

A rotina é gerada a partir do estado atual dos dados e inclui:

- tratar fontes atrasadas;
- concluir revisões previstas para hoje;
- atribuir fontes sem responsável;
- revisar contradições próximas;
- rebalancear responsáveis sobrecarregados;
- cumprir a meta diária configurada.

Os itens podem ser marcados como concluídos. O progresso fica salvo por data no dispositivo e no workspace sincronizado.

## Snapshots de cumprimento

Um snapshot registra:

- data;
- cumprimento do período;
- revisões concluídas;
- atrasos abertos;
- revisões previstas para hoje;
- carga de cada responsável;
- capacidade e utilização.

O aplicativo captura um snapshot diário automaticamente ao abrir o módulo. O botão **Capturar snapshot** substitui o snapshot do dia pelos números atuais.

São mantidos até 180 snapshots. A série histórica começa na adoção da v0.5.3; o sistema não inventa medições anteriores.

## Relatório operacional

A exportação Markdown inclui:

- indicador de cumprimento;
- concluídas, atrasadas e previstas para hoje;
- carga e capacidade por responsável;
- estado de sobrecarga;
- checklist da rotina diária;
- assinatura da Tehkné Solutions.

## Backup e sincronização

A versão adiciona:

```text
trendOperationalSettings
trendComplianceSnapshots
trendRoutineRuns
```

Esses campos entram no backup JSON, restauração e workspace sincronizado. Não é necessária uma nova migration no Supabase, pois continuam dentro do JSON versionado.

## Limitações

- O cumprimento mede execução registrada, não qualidade da revisão.
- Uma revisão marcada como concluída pode ainda conter uma evidência incorreta.
- Capacidade semanal não representa automaticamente horas disponíveis.
- Atrasos anteriores à implantação podem afetar o primeiro indicador.
- Snapshots só representam o estado do momento da captura.
- A ferramenta não substitui gestão de pessoas, planejamento de capacidade ou auditoria independente.

## Assinatura

Tehkné Solutions
