# Desempenho dos playbooks — Commerce Radar v0.7.5

A área **Desempenho dos playbooks** compara cada ciclo criado a partir de um playbook com o ciclo que originou o modelo.

O objetivo é identificar:

- playbooks que continuam reproduzindo resultados úteis;
- modelos com sinais mistos;
- playbooks que perderam eficácia;
- modelos sem amostra suficiente;
- playbooks antigos que precisam de nova validação.

A comparação é observacional. Ela não comprova que o playbook foi a única causa do resultado.

## Unidade de comparação

Cada aplicação possui:

```text
playbook
+ ciclo de origem
+ novo ciclo criado
```

O novo ciclo só entra na amostra conclusiva quando possui decisão ou classificação final.

Ciclos ainda ativos permanecem como pendentes e não reduzem artificialmente a taxa de reprodução.

## Resultado de cada aplicação

### Reproduzido

O novo ciclo:

- foi classificado como validado;
- registrou pelo menos um pedido;
- apresentou lucro preliminar positivo.

### Parcial

O ciclo apresentou algum sinal comercial ou decisão de ajuste, mas não reproduziu completamente o resultado validado da origem.

### Falha

O ciclo:

- foi descartado;
- terminou com prejuízo preliminar; ou
- recebeu decisão de abandono.

### Pendente

O novo ciclo ainda não possui resultado comparável.

## Métricas comparadas

O painel calcula diferenças entre o novo ciclo e sua origem para:

- score do ciclo;
- pedidos;
- receita;
- lucro preliminar;
- margem preliminar;
- CTR;
- conversão.

Também apresenta:

```text
taxa de reprodução =
aplicações reproduzidas
÷
aplicações concluídas
```

```text
taxa de ciclos lucrativos =
ciclos com lucro preliminar positivo
÷
aplicações concluídas
```

Valores monetários são exibidos em reais, como `R$ 1.250,50`.

## Classificação do playbook

### Eficaz

O padrão exige:

- amostra mínima cumprida;
- taxa de reprodução de pelo menos 70%;
- taxa de ciclos lucrativos de pelo menos 70%;
- queda média de score inferior a 10 pontos.

### Revisar

Aplicado quando os resultados são mistos e não existe evidência suficiente para manter ou suspender o modelo sem ajustes.

### Degradado

Aplicado quando:

- a taxa de reprodução fica abaixo de 40%;
- a queda média de score chega a 20 pontos; ou
- as duas aplicações mais recentes falharam.

### Desatualizado

Aplicado quando o playbook não recebe nova aplicação por mais de 120 dias.

### Amostra insuficiente

O padrão exige duas aplicações concluídas.

### Nunca aplicado

O playbook foi publicado, mas ainda não gerou um novo ciclo.

## Ordem das regras

A idade da última aplicação é verificada antes da classificação estatística. Assim, um playbook que teve bom resultado no passado, mas não foi validado recentemente, aparece como desatualizado.

## Decisões humanas

O usuário pode registrar:

- **Manter**;
- **Revisar**;
- **Testar novamente**;
- **Arquivar**.

A decisão exige justificativa com pelo menos 20 caracteres.

A classificação automática não altera o playbook.

## Arquivamento protegido

Arquivar exige duas ações separadas:

1. registrar a decisão **Arquivar** com justificativa;
2. digitar `ARQUIVAR` e confirmar a execução.

O sistema nunca arquiva automaticamente um playbook degradado ou desatualizado.

## Snapshots

O botão **Capturar desempenho** registra diariamente:

- classificação;
- aplicações totais;
- aplicações concluídas;
- taxa de reprodução;
- variação média de score;
- variação média de lucro.

São mantidos até 365 snapshots por padrão.

## Relatório

A exportação Markdown inclui:

- resumo da biblioteca;
- situação de cada playbook;
- taxa de reprodução;
- taxa de ciclos lucrativos;
- variação média de score;
- variação média de lucro;
- próxima ação sugerida;
- última decisão humana;
- limitações metodológicas;
- assinatura da **Tehkné Solutions**.

## Backup e sincronização

A versão adiciona:

```text
playbookPerformanceSettings
playbookPerformanceSnapshots
playbookPerformanceReviews
```

Esses dados entram no backup JSON, restauração e workspace sincronizado.

Não é necessária uma nova migration no Supabase, pois os dados continuam armazenados no JSON versionado do workspace.

## Limitações

- Produtos diferentes podem possuir preços, públicos e margens não comparáveis.
- Mudanças de canal, sazonalidade, frete ou concorrência podem alterar o resultado.
- Lucro e margem permanecem preliminares até auditoria financeira.
- Uma taxa alta em amostra pequena não garante repetibilidade.
- A associação entre uso do playbook e resultado não comprova causalidade.
- O sistema não modifica campanhas, orçamento ou publicação automaticamente.

## Assinatura

Tehkné Solutions
