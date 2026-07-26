# Importação CSV — Commerce Radar v0.4

A importação transforma dados exportados de planilhas, lojas e marketplaces em objetos já utilizados pelo Commerce Radar.

## O que pode ser importado

- catálogo de produtos e estoque;
- custo e preço de venda;
- vendas, pedidos, unidades e receita;
- visualizações, cliques e investimento em mídia;
- arquivos consolidados contendo várias dessas dimensões.

O processamento acontece no navegador. O arquivo bruto não é enviado para um servidor.

## Formatos aceitos

- `.csv`;
- `.txt` delimitado;
- `.tsv`.

Separadores detectados automaticamente:

- ponto e vírgula;
- vírgula;
- tabulação;
- barra vertical.

Valores monetários brasileiros como `R$ 1.234,56` e `90,00` são normalizados para cálculo.

## Limites

- arquivo de até 8 MB;
- até 20.000 linhas processadas por lote;
- histórico dos 50 lotes mais recentes;
- até 100 produtos resumidos dentro de cada registro de lote.

O histórico armazena somente metadados, mapeamento e resumo agregado. As linhas brutas não são preservadas.

## Mapeamento

O sistema tenta reconhecer automaticamente cabeçalhos como:

- `produto`, `nome`, `title`;
- `sku`, `codigo`, `id`;
- `custo`, `preco custo`;
- `preco`, `preco venda`;
- `pedidos`, `vendas`, `orders`;
- `receita`, `faturamento`, `gmv`;
- `visualizacoes`, `impressoes`, `views`;
- `cliques`, `visitas`, `clicks`;
- `investimento`, `ad spend`, `ads`.

Antes de importar, o usuário pode alterar qualquer correspondência. Somente a identificação do produto é obrigatória.

## Saídas

### Produtos e custos

Podem gerar:

- oportunidades próprias no radar;
- análises econômicas comparáveis;
- score inicial baseado em margem e sinais disponíveis.

### Vendas e métricas

Podem gerar ou atualizar testes reais com:

- canal;
- pedidos;
- receita;
- visualizações;
- cliques;
- investimento;
- etapa recomendada do funil.

## Atualização de testes

Há duas estratégias:

- **Somar como novo período:** adiciona as métricas ao teste existente.
- **Substituir métricas:** mantém a identidade do teste e troca os totais pelo novo lote.

O sistema alerta quando o mesmo arquivo, identificado pelo fingerprint, já foi importado.

## Diagnóstico sem aplicar

A ação **Salvar somente o diagnóstico** registra o lote e seus indicadores, mas não altera oportunidades, análises ou testes.

## Modelos

A própria tela oferece três modelos para download:

- produtos;
- vendas;
- métricas.

Os modelos usam ponto e vírgula e valores no padrão pt-BR.

## Backup

A partir da v0.4, o backup completo inclui `importBatches` junto com:

- análises;
- testes;
- oportunidades próprias;
- planos de lançamento.

Backups antigos continuam válidos. Quando não existe `importBatches`, o histórico de importações permanece vazio.

## Privacidade

- nenhum CSV é enviado automaticamente;
- o histórico fica no LocalStorage;
- dados convertidos em oportunidades, análises e testes participam da sincronização normal do workspace;
- chaves do Supabase não são incluídas em exportações;
- a assinatura exibida e exportada é exclusivamente **Tehkné Solutions**.
