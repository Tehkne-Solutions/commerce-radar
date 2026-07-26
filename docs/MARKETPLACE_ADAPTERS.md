# Adaptadores de marketplaces — Commerce Radar v0.4.1

Os adaptadores convertem arquivos exportados por plataformas de e-commerce para o formato normalizado do Commerce Radar antes do mapeamento da v0.4.

## Plataformas suportadas

- Mercado Livre — vendas/pedidos.
- Shopee — pedidos.
- WooCommerce — catálogo de produtos.
- WooCommerce — pedidos e relatórios analíticos em formato por item.
- Shopify — catálogo de produtos.
- Shopify — pedidos com itens de linha.

## Fluxo

1. O usuário seleciona ou arrasta um CSV, TXT ou TSV.
2. O Commerce Radar lê apenas os cabeçalhos e uma amostra localmente.
3. O adaptador é detectado por assinatura de colunas.
4. O usuário pode substituir a detecção por um preset manual.
5. O arquivo é convertido em memória para o formato normalizado.
6. A tela de mapeamento da v0.4 continua disponível para revisão.
7. Nada é gravado até o usuário confirmar a importação.

## Formato normalizado

```text
data
produto
sku
categoria
canal
custo
preco
unidades
pedidos
receita
visualizacoes
cliques
investimento
estoque
taxas
pedido
status
```

Taxas identificadas nos arquivos de marketplaces permanecem separadas de investimento em mídia. A versão v0.4.1 não desconta automaticamente essas taxas da margem porque os conceitos variam entre relatórios, campanhas, subsídios e modelos logísticos.

## Regras por plataforma

### Shopify — pedidos

O CSV oficial pode representar itens adicionais do mesmo pedido em linhas separadas e deixar alguns campos do pedido em branco nas linhas seguintes. O adaptador:

- mantém o número do pedido anterior quando necessário;
- usa `Lineitem name`, `Lineitem sku`, `Lineitem quantity` e `Lineitem price`;
- calcula receita por item, evitando repetir o campo `Total` do pedido;
- ignora pedidos totalmente reembolsados, anulados ou cancelados;
- conta uma ocorrência por pedido, produto e SKU.

Fonte oficial: https://help.shopify.com/pt-BR/manual/fulfillment/managing-orders/exporting-orders

### Shopify — produtos

O adaptador reconhece o catálogo pelo conjunto `Handle`, `Variant SKU` e `Variant Price` e usa, quando disponíveis:

- `Title`;
- `Product Category` ou `Type`;
- `Cost per item`;
- `Variant Inventory Qty`;
- `Status`.

### WooCommerce — produtos

O exportador nativo segue o Product CSV Import Schema. O adaptador reconhece:

- `Type`;
- `SKU`;
- `Name`;
- `Regular price`;
- `Sale price`;
- `Stock`;
- `Categories`;
- colunas opcionais de custo, quando adicionadas por extensões ou metadados.

Fonte oficial: https://woocommerce.com/document/product-csv-importer-exporter/

### WooCommerce — pedidos e Analytics

O WooCommerce Core não possui um único CSV universal de pedidos equivalente ao exportador de produtos. Relatórios e extensões podem alterar os cabeçalhos. O preset aceita formatos por item com combinações como:

- `Order Number` ou `Order ID`;
- `Order Date`;
- `Product Name` ou `Item Name`;
- `SKU`;
- `Quantity`;
- `Line Total`, `Net Sales` ou `Gross Sales`;
- `Item Cost` ou `COGS`, quando disponível.

Quando o arquivo não contém itens por produto, o usuário deve revisar o mapeamento ou converter o relatório antes da importação.

### Mercado Livre — vendas

O adaptador reconhece campos comuns em exportações brasileiras e nomes equivalentes da API de pedidos:

- número ou ID da venda;
- data da venda;
- título da publicação;
- SKU do vendedor;
- quantidade;
- preço unitário;
- receita por produtos, `gross_price`, subtotal ou total recebido;
- tarifa de venda e custo de envio;
- status.

A API oficial de orders documenta `id`, `date_created`, `status`, `order_items.quantity`, `order_items.unit_price`, `order_items.gross_price`, `order_items.sale_fee` e `total_amount`.

Fonte oficial: https://developers.mercadolivre.com.br/pt_br/imovel-consulta-de-usuarios/gerenciamento-de-vendas

Os nomes do CSV do painel podem variar. Por isso, o preset sempre mantém a etapa de revisão.

### Shopee — pedidos

O preset reconhece combinações comuns em exportações do Seller Centre brasileiro:

- número do pedido;
- data de criação;
- nome do produto;
- número de referência SKU;
- quantidade;
- preço acordado ou preço original;
- subtotal do produto;
- taxas de comissão e serviço;
- status do pedido.

A Shopee pode alterar nomes e composição dos relatórios. Use o preset manual e revise o mapeamento quando a confiança automática for baixa.

## Privacidade

- O arquivo bruto é processado no navegador.
- Nenhum arquivo é enviado para o Supabase durante a detecção.
- A nuvem recebe somente o workspace confirmado pelo usuário.
- O adaptador não lê senhas, tokens ou cookies das plataformas.
- Dados de cliente que não são necessários não entram no formato normalizado.

## Limitações

- Relatórios agregados sem produto ou SKU não podem gerar oportunidades por item.
- Reembolsos parciais exigem revisão, pois podem aparecer de formas diferentes por plataforma.
- Taxas são preservadas para auditoria, mas ainda não entram automaticamente na margem líquida.
- Custos de produto não existem na maioria dos relatórios de marketplaces e precisam ser complementados.
- A detecção automática é um auxílio; a confirmação do mapeamento continua obrigatória.

## Assinatura

Tehkné Solutions
