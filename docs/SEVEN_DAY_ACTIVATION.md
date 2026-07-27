# Plano de ativação de sete dias — Commerce Radar v0.7.1

A área **Plano de 7 dias** transforma uma recomendação em um ciclo curto de execução, medição e decisão.

## Objetivo

O ciclo responde:

1. Qual hipótese será testada?
2. Qual oferta será publicada?
3. Quais métricas precisam ser registradas?
4. Qual é o limite de investimento?
5. Existe sinal suficiente para continuar?
6. A oferta precisa ser ajustada?
7. A hipótese deve ser abandonada?

O sistema não cria vendas, pedidos, receita ou margem fictícia.

## Criação do plano

O plano pode usar:

- a primeira recomendação do onboarding;
- outro produto disponível no ranking;
- um produto informado manualmente.

São definidos:

- produto;
- canal;
- data inicial;
- orçamento para sete dias;
- visualizações mínimas;
- cliques mínimos;
- pedidos mínimos;
- margem líquida mínima.

As metas são premissas editáveis, não previsões garantidas.

## Roteiro diário

### Dia 1 — Hipótese e oferta

Definir público, problema, promessa, preço, custo estimado e limite de investimento.

### Dia 2 — Página ou anúncio

Preparar a apresentação comercial adequada ao canal, incluindo rastreamento.

### Dia 3 — Lançamento controlado

Publicar a oferta e iniciar uma distribuição limitada.

### Dia 4 — Primeira leitura

Registrar visualizações, cliques, dúvidas e objeções.

### Dia 5 — Otimização

Alterar apenas uma hipótese de oferta, comunicação, preço ou apresentação.

### Dia 6 — Economia unitária

Registrar receita, mídia, custo do produto, taxas e frete.

### Dia 7 — Decisão

Comparar resultados e critérios e registrar uma decisão humana.

## Métricas

O plano registra:

```text
visualizações
cliques
pedidos
receita
investimento em mídia
custo dos produtos
taxas
frete
```

Deriva:

```text
CTR = cliques ÷ visualizações
conversão = pedidos ÷ cliques
CPA = mídia ÷ pedidos
ROAS = receita ÷ mídia
lucro líquido preliminar = receita - custos
margem líquida preliminar = lucro ÷ receita
```

Os resultados são preliminares enquanto houver custos ausentes.

## Sugestões do sistema

### Continuar

Pode ser sugerido quando a meta de pedidos é atingida e a margem líquida atende ao limite definido.

### Ajustar

Pode ser sugerido quando existe interesse ou pedido, mas a conversão ou a economia unitária ainda não atende aos critérios.

### Abandonar

Pode ser sugerido quando o ciclo ou o limite de investimento termina sem evidência comercial mínima.

### Coletar dados

É utilizado enquanto o ciclo ainda não possui evidência suficiente.

A sugestão não encerra o plano automaticamente.

## Decisão humana

A conclusão exige selecionar:

- continuar;
- ajustar;
- abandonar.

Também exige uma justificativa com fatos observados. A decisão preserva a sugestão do sistema para comparação e auditoria.

## Integração com testes

Criar um plano não cria um teste.

Ao selecionar **Ativar plano**, o Commerce Radar cria um teste com:

```text
views = 0
clicks = 0
orders = 0
revenue = 0
investment = 0
```

As métricas do plano são copiadas para esse teste somente depois de serem informadas.

## Relatório

A exportação Markdown contém:

- produto e canal;
- período;
- critérios;
- métricas;
- lucro e margem preliminares;
- sugestão do sistema;
- tarefas diárias;
- decisão humana;
- assinatura da Tehkné Solutions.

## Backup e sincronização

A versão adiciona:

```text
activationPlans
activationEvents
activationSettings
```

Esses campos entram no backup JSON, restauração e workspace sincronizado. Não é necessária nova migration no Supabase.

## Limitações

- Sete dias podem ser insuficientes para produtos de ciclo de compra longo.
- Visualizações e cliques não comprovam demanda pagante.
- Um pedido isolado não comprova repetibilidade.
- Margem preliminar não substitui auditoria financeira completa.
- O sistema não cria anúncios, contas em marketplaces ou fornecedores.
- Resultados dependem da qualidade da execução e dos dados informados.
- A ferramenta não garante venda, lucro ou escala.

## Assinatura

Tehkné Solutions
