# Matriz de responsabilidades e auditoria — Commerce Radar v0.6.7

A área **Matriz e auditoria** complementa a governança dos experimentos com segregação de funções, exceções formais e um relatório consolidado.

## Objetivo

O módulo reduz conflitos declarados entre quem:

- opera o experimento;
- revisa a decisão;
- aprova a execução;
- executa a mudança;
- audita a trilha.

Ele não altera scores, métricas, resultados ou critérios estatísticos do champion–challenger.

## Matriz de responsabilidades

Cada experimento pode conter:

| Papel | Responsabilidade |
|---|---|
| Operador | Conduzir o experimento e registrar as capturas |
| Primeiro aprovador | Revisar hipótese, amostra e execução operacional |
| Segundo aprovador | Autorizar formalmente a decisão |
| Executor | Aplicar a decisão aprovada no ranking |
| Auditor | Verificar controles, exceções e trilha |
| Consultados | Apoiar a análise sem executar controles |
| Informados | Receber o resultado da decisão |

Operador e aprovadores são herdados da governança v0.6.6. Executor, auditor, consultados e informados são definidos na v0.6.7.

## Conflitos bloqueados

Por padrão, o sistema identifica:

- executor ausente;
- auditor ausente;
- operador também como primeiro aprovador;
- operador também como segundo aprovador;
- dois aprovadores iguais;
- executor também como operador;
- executor também como primeiro aprovador;
- executor também como segundo aprovador;
- auditor também como operador;
- auditor também como aprovador;
- auditor também como executor.

Enquanto existir conflito bloqueante, a decisão não pode ser executada.

## Execução controlada

Depois da v0.6.7, a execução deve ocorrer pela área **Matriz e auditoria**.

O fluxo é:

```text
Governança aprovada
→ matriz sem conflito bloqueante
→ executor confirma o próprio nome
→ decisão é executada
→ evento e snapshot são registrados
```

Os botões anteriores de promoção ou manutenção permanecem visíveis, mas são bloqueados pela nova camada e orientam o usuário a utilizar o executor designado.

## Confirmação do executor

A versão atual compara o nome informado na execução com o executor cadastrado.

Esse é um controle processual local. Não existe autenticação corporativa, assinatura digital, SSO ou verificação de identidade nesta versão.

## Exceções formais

Um conflito pode receber exceção quando:

- existe auditor definido;
- a aprovação é registrada pelo auditor designado;
- a justificativa possui pelo menos 20 caracteres;
- os conflitos dispensados ainda estão ativos;
- a exceção pode ter data de expiração.

O auditor não pode aprovar uma exceção para conflito que envolva o próprio papel.

Exceções não eliminam o conflito. Elas o exibem como dispensado e preservam a justificativa na trilha.

## Configurações

Os controles padrão podem ser ajustados no workspace:

```text
blockOperatorApproval
blockExecutorOperation
blockExecutorApproval
requireIndependentAuditor
requireExecutor
requireAuditor
```

Reduzir controles amplia o risco e deve ser tratado como decisão consciente da operação.

## Trilha de auditoria

Eventos registrados incluem:

- atualização da matriz;
- aprovação de exceção;
- revogação de exceção;
- execução de decisão formal;
- captura de snapshot consolidado.

Cada evento preserva data, experimento, ator declarado, detalhes e assinatura da Tehkné Solutions.

## Snapshot de auditoria

O snapshot diário registra:

- quantidade de experimentos;
- matrizes conformes;
- matrizes bloqueadas;
- conflitos dispensados;
- aprovações pendentes;
- decisões prontas para execução;
- decisões formais concluídas;
- matriz e conflitos por experimento.

São mantidos até 365 snapshots.

## Relatório consolidado

A exportação Markdown inclui:

- resumo da situação dos controles;
- papéis por experimento;
- conflitos identificados;
- exceções ativas;
- estado das aprovações;
- número de decisões formais;
- limitações do controle local;
- assinatura da Tehkné Solutions.

## Backup e sincronização

A versão adiciona:

```text
experimentRoleAssignments
experimentControlExceptions
experimentAuditEvents
experimentAuditSnapshots
experimentAuditSettings
```

Esses campos entram no backup JSON, restauração, workspace sincronizado e histórico versionado da nuvem.

Não é necessária nova migration no Supabase porque os dados permanecem dentro do workspace JSON.

## Compatibilidade

Experimentos antigos continuam disponíveis.

Para executar uma nova decisão após a atualização, será necessário:

1. definir executor;
2. definir auditor;
3. corrigir ou dispensar conflitos;
4. executar pela área de auditoria.

Decisões já concluídas não são reabertas.

## Limitações

- nomes não são autenticados;
- não existe controle de acesso por cargo;
- não existe assinatura digital;
- o dispositivo local pode ser acessado por outras pessoas;
- uma exceção formal não garante que o risco seja aceitável;
- o relatório depende da qualidade dos registros cadastrados;
- o módulo não substitui auditoria independente, compliance, IAM ou controles jurídicos.

## Assinatura

Tehkné Solutions
