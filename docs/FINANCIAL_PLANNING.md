# Metas, orçamento e projeção de caixa

A versão 0.4.5 usa auditorias financeiras e controles de repasse já registrados para transformar histórico em planejamento. Todo o processamento acontece no navegador.

## Base observada

O período-base fornece:

- receita líquida mensalizada;
- pedidos mensais;
- custo variável por canal;
- custo do produto;
- publicidade;
- margem de contribuição;
- confiança dos dados.

Quando não existem auditorias, o sistema continua utilizável, mas sinaliza que as projeções dependem integralmente das premissas digitadas.

## Ponto de equilíbrio

```text
margem de contribuição =
  (receita líquida - custos variáveis) ÷ receita líquida

receita de equilíbrio =
  custos fixos mensais ÷ margem de contribuição
```

Custos variáveis incluem produto, taxas, frete líquido, impostos, publicidade, embalagem e outros custos proporcionais presentes nas auditorias.

## Capital de giro

O capital recomendado é separado em quatro componentes:

```text
estoque = custo mensal do produto ÷ 30 × dias de cobertura

intervalo de repasse =
  custos variáveis sem produto ÷ 30 × prazo de repasse

reserva fixa = custos fixos mensais × meses de reserva

segurança = receita mensal projetada × percentual de segurança
```

O maior valor entre essa composição e o déficit máximo encontrado no fluxo de caixa é apresentado como capital inicial recomendado.

## Cenários

- **Conservador:** receita reduzida e custos variáveis pressionados.
- **Provável:** meta informada ou média mensal observada.
- **Otimista:** receita ampliada e pequena eficiência de custos.

Os percentuais de receita conservadora e otimista são editáveis. O crescimento mensal também pode ser positivo ou negativo.

## Prazo de repasse

As vendas não entram automaticamente no caixa no mesmo mês. O recebimento é distribuído entre meses conforme os dias de repasse.

Exemplo com 15 dias:

- 50% da receita entra no mês da venda;
- 50% entra no mês seguinte.

Isso permite distinguir uma operação lucrativa de uma operação que ainda exige capital de giro.

## Fluxo mensal

A projeção apresenta:

- caixa inicial;
- vendas geradas;
- recebimentos previstos;
- custos variáveis;
- custos fixos;
- fluxo líquido;
- caixa final.

## Planos salvos

Cada plano conserva um snapshot com os três cenários, premissas, capital recomendado, ponto de equilíbrio e fluxo mensal. O relatório pode ser exportado em Markdown.

## Backup e nuvem

A versão 0.4.5 adiciona `financialPlans` ao backup e ao workspace sincronizado. Não é necessária nova migration no Supabase porque os dados continuam dentro do JSON versionado.

## Limitações

- Projeções não garantem vendas ou lucro.
- Custos fixos devem ser informados pelo usuário.
- A precisão depende da qualidade das auditorias.
- O cálculo não substitui orçamento contábil, planejamento tributário ou análise de crédito.
- Prazos reais de repasse podem variar por pedido, antecipação e contestação.

## Assinatura

Tehkné Solutions
