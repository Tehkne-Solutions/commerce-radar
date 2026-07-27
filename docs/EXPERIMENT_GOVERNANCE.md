# Governança dos experimentos — Commerce Radar v0.6.6

A área **Governança dos experimentos** adiciona controles formais ao modo champion–challenger.

Ela não altera scores, pesos, resultados ou evidências. Sua função é controlar:

- quem responde pelo experimento;
- quanto tempo mínimo ele deve permanecer em sombra;
- quando uma revisão antecipada é necessária;
- quem aprova a decisão;
- como a promoção ou manutenção do champion é executada e registrada.

## Fluxo obrigatório

```text
Configurar governança
→ executar experimento em sombra
→ cumprir duração e amostra
→ solicitar decisão formal
→ receber 1ª aprovação
→ receber 2ª aprovação independente
→ executar manualmente
→ registrar decisão formal
```

Nenhuma aprovação ou promoção acontece automaticamente.

## Responsável

Cada experimento deve ter uma pessoa responsável pela condução operacional.

O responsável deve:

- acompanhar capturas em modo sombra;
- verificar critérios de parada;
- manter a hipótese e os dados atualizados;
- justificar formalmente a decisão solicitada;
- garantir que a amostra utilizada pertence ao experimento correto.

O nome é informativo e fica salvo no workspace. A versão não envia e-mails nem valida identidade externa.

## Aprovação em duas etapas

A governança exige dois aprovadores:

1. **Primeira aprovação:** revisão operacional dos dados, da amostra e da hipótese.
2. **Segunda aprovação:** autorização final para executar a decisão.

Por padrão, as duas etapas devem ser realizadas por pessoas diferentes.

A segunda aprovação só fica disponível depois da primeira.

Uma rejeição encerra a solicitação atual, mas não apaga:

- o experimento;
- as capturas;
- as métricas;
- as aprovações anteriores;
- o motivo registrado.

Uma nova solicitação pode ser aberta posteriormente.

## Duração mínima

O padrão é de 14 dias.

A promoção do challenger fica bloqueada enquanto:

```text
dias desde o início < duração mínima
```

A duração mínima não substitui os requisitos estatísticos do modo champion–challenger.

Para promover, ainda é necessário:

- challenger classificado como superior;
- amostra mínima atingida;
- sucessos e falhas mínimos;
- baseline champion preservado;
- duas aprovações válidas.

Manter o champion pode ser solicitado antes da duração mínima quando existe risco, baseline alterado ou justificativa operacional.

## Duração máxima

O padrão é de 60 dias.

Quando a duração máxima é atingida, o sistema cria um critério de parada para revisão humana.

O experimento não é encerrado automaticamente. A equipe deve decidir entre:

- manter o champion;
- reiniciar o teste com nova hipótese;
- ampliar formalmente o prazo;
- rejeitar o challenger;
- revisar a qualidade da amostra.

## Inatividade

O padrão é de 14 dias sem nova captura em modo sombra.

Quando esse limite é atingido, o painel sinaliza:

```text
Sem nova captura há N dias
```

Isso evita que experimentos abandonados permaneçam indefinidamente como “em execução”.

## Critérios de parada

A versão possui quatro sinais principais:

### Baseline alterado

O champion ativo deixou de ser igual ao champion congelado no início.

A promoção fica bloqueada.

### Champion superior

O champion demonstrou desempenho superior com amostra elegível.

A recomendação é revisar e formalizar a manutenção do champion.

### Duração máxima

O experimento atingiu o limite configurado.

### Inatividade

Nenhuma captura nova foi registrada dentro do período permitido.

Os critérios produzem alertas. Eles não encerram ou promovem automaticamente.

## Solicitação de decisão

As decisões possíveis são:

- **Promover challenger**;
- **Manter champion**.

Toda solicitação registra:

- decisão pretendida;
- justificativa;
- responsável;
- aprovadores definidos;
- data e hora;
- regras vigentes;
- estado das aprovações.

## Bloqueios da promoção

A promoção não pode ser executada quando:

- a duração mínima não foi cumprida;
- o challenger não é superior;
- o baseline mudou;
- faltam responsável ou aprovadores;
- os aprovadores são iguais quando a independência está ativa;
- falta uma das duas aprovações;
- a decisão aprovada era manter o champion.

## Decisão formal

Depois da execução, o Commerce Radar registra:

- experimento;
- decisão;
- responsável;
- primeiro e segundo aprovadores;
- aprovações completas;
- resultado estatístico;
- tamanho da amostra;
- diferença de acurácia;
- diferença de Brier;
- observação final;
- data da execução;
- assinatura da Tehkné Solutions.

## Experimentos existentes

Experimentos criados antes da v0.6.6 continuam disponíveis.

Ao abrir a governança, eles recebem valores padrão para:

- duração mínima;
- duração máxima;
- limite de inatividade;
- critérios de parada.

Responsável e aprovadores precisam ser informados antes de uma nova decisão final.

## Backup e sincronização

A versão adiciona:

```text
experimentGovernanceRecords
experimentFormalDecisions
experimentGovernanceSettings
```

Esses campos entram no backup JSON, restauração por mesclagem, restauração por substituição e workspace sincronizado.

Não é necessária uma nova migration no Supabase porque os dados continuam dentro do JSON versionado do workspace.

## Segurança e limitações

- A ferramenta registra nomes, mas não autentica funções organizacionais.
- Duas aprovações no mesmo dispositivo não provam independência real fora do sistema.
- A duração mínima não garante qualidade estatística.
- Critérios de parada não substituem análise humana.
- A governança não substitui compliance, auditoria, conselho ou política corporativa.
- A promoção continua sendo uma ação explícita e reversível pelo controle de perfis.

## Assinatura

Tehkné Solutions
