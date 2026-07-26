# Reconciliação financeira por pedido

A v0.4.3 do Commerce Radar transforma relatórios financeiros de marketplaces e lojas em pedidos consolidados e auditorias por produto.

## Objetivo

Evitar erros comuns quando um mesmo pedido ocupa várias linhas do CSV:

- somar o total do pedido repetidamente;
- duplicar frete, desconto, imposto ou repasse;
- perder taxas cobradas por item;
- atribuir todo o custo do pedido a apenas um produto;
- comparar repasse sem considerar todos os descontos financeiros.

## Plataformas reconhecidas

- Mercado Livre;
- Shopee;
- Shopify;
- WooCommerce;
- CSV financeiro genérico.

A detecção é baseada nos cabeçalhos e pode ser substituída manualmente.

## Regras de consolidação

### Receita de itens

Quando o arquivo possui subtotal ou valor da linha, o sistema soma esses valores.

Quando existe apenas preço unitário e quantidade:

```text
receita do item = preço unitário × quantidade
```

### Valores repetidos no pedido

Campos de pedido como frete, desconto, reembolso, imposto e repasse podem aparecer repetidos em todas as linhas.

Quando todos os valores não nulos são iguais, o Commerce Radar conta uma única vez.

Quando os valores diferem, eles são somados.

### Taxas por item

Nos presets de Mercado Livre e Shopee, comissão e tarifa de venda são tratadas como valores por item e somadas.

Essa regra evita perder taxas iguais cobradas sobre produtos distintos do mesmo pedido.

### Rateio entre produtos

Custos do pedido são distribuídos proporcionalmente à receita de cada item:

```text
participação do produto = receita do item ÷ receita dos itens do pedido
custo atribuído = custo do pedido × participação do produto
```

Quando o arquivo não possui receita por item, a quantidade é utilizada como peso de rateio.

### Repasse esperado

```text
repasse esperado =
  receita bruta
  - descontos
  - reembolsos
  - taxas do canal
  - taxas de pagamento
  - frete pago
  + subsídio de frete
  - impostos
  - outros ajustes
```

Publicidade, embalagem e custo do produto não são descontados do repasse esperado porque normalmente não fazem parte da liquidação do marketplace. Eles continuam entrando no cálculo de lucro líquido da auditoria financeira.

### Diferença de repasse

```text
diferença = repasse informado - repasse esperado
```

Diferenças podem indicar:

- tarifa não mapeada;
- subsídio não identificado;
- retenção ou ajuste de período;
- estorno;
- campo repetido ou ausente no relatório;
- regra específica da plataforma.

## Saídas

O módulo produz:

- prévia de pedidos reconciliados;
- receita e custos por pedido;
- repasse esperado e informado;
- diferença de repasse;
- exportação CSV dos pedidos;
- histórico local de até 50 lotes;
- auditorias financeiras por produto e canal;
- inclusão no backup e na sincronização opcional.

## Privacidade

- O arquivo é processado no navegador.
- O CSV bruto não é armazenado.
- O histórico guarda apenas resumos de pedidos e produtos.
- Nenhuma credencial de marketplace é solicitada.

## Limitações

- Cabeçalhos podem variar entre contas, países e versões do painel.
- Relatórios de liquidação podem conter ajustes de outros períodos.
- Um valor idêntico cobrado legitimamente em várias linhas pode exigir revisão manual.
- A ferramenta não substitui conciliação contábil, fiscal ou bancária.

## Assinatura

Tehkné Solutions