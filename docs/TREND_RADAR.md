# Radar de Tendências — Commerce Radar

O Radar de tendências registra sinais de mercado com origem, data, validade e confiança. Ele não promete descobrir produtos vencedores automaticamente e não trata interesse como venda confirmada.

## Objetivo

Ajudar a decidir quais hipóteses merecem pesquisa ou teste antes de investir em estoque, mídia ou desenvolvimento de uma marca.

## Estrutura de um sinal

Cada sinal contém:

- produto ou tema;
- categoria;
- tipo e nome da fonte;
- URL opcional da evidência;
- geografia;
- período analisado;
- data de observação;
- validade em dias;
- crescimento;
- demanda;
- concorrência;
- margem potencial;
- risco;
- confiança;
- evidência textual e observações.

As dimensões são registradas de 1 a 5. Valores são avaliações assistidas pelo usuário, não medições universais.

## Tipos de fonte

- busca e interesse;
- marketplace;
- rede social ou conteúdo;
- fornecedor ou catálogo;
- dados internos;
- concorrência;
- pesquisa ou relatório;
- comunidade ou atendimento;
- outra fonte.

Dados internos recebem maior peso de origem. Comunidades e observações informais recebem menor peso. Essa ponderação não substitui a revisão da evidência.

## Validade temporal

```text
vencimento = data observada + validade em dias
```

O fator de frescor cai conforme a data se aproxima do vencimento. Sinais vencidos:

- deixam de aparecer por padrão;
- perdem peso no agrupamento;
- permanecem disponíveis para auditoria;
- precisam ser revisados antes de orientar uma decisão atual.

## Score do sinal

O score utiliza:

```text
20% crescimento
18% demanda
18% margem potencial
14% concorrência invertida
12% risco invertido
8% confiança
6% frescor
4% qualidade do tipo de fonte
```

O resultado vai de 0 a 100.

## Agrupamento de evidências

Sinais com o mesmo tema normalizado são agrupados. O radar calcula médias ponderadas por:

- confiança;
- qualidade da fonte;
- frescor.

Fontes de tipos diferentes geram um bônus limitado de diversidade. Diferenças grandes entre avaliações de crescimento ou demanda geram uma penalidade e o aviso **Sinais contraditórios**.

## Estados

- **Em alta:** score alto e confirmação por mais de uma fonte.
- **Promissor:** combinação positiva que merece teste.
- **Monitorar:** hipótese ainda sem força suficiente.
- **Fraco:** sinais desfavoráveis ou insuficientes.
- **Vencido:** todas as evidências expiraram.

## Transformação em operação

Uma tendência agrupada pode gerar:

- uma oportunidade própria no radar principal;
- um teste no estágio de pesquisa.

A transformação conserva metadados do score, quantidade de sinais, número de fontes e data da evidência mais recente.

## Importação e exportação

O módulo aceita CSV com ponto e vírgula, vírgula ou tabulação. O modelo possui:

```text
topico
categoria
tipo_fonte
fonte
url
geografia
periodo
observado_em
validade_dias
crescimento
demanda
concorrencia
margem
risco
confianca
evidencia
observacoes
```

A exportação gera um CSV revisável. O backup completo inclui `trendSignals` e `trendSettings`.

## Nuvem e privacidade

- o processamento acontece no navegador;
- nenhuma fonte é consultada automaticamente nesta versão;
- URLs e evidências só são salvas quando o usuário as informa;
- sinais podem ser sincronizados no workspace Supabase opcional;
- não é necessária nova migration, pois o workspace é JSON versionado.

## Limitações

- popularidade não comprova intenção de compra;
- crescimento pode ser sazonal ou provocado por campanha temporária;
- concorrência e margem precisam de dados comerciais reais;
- sinais de redes sociais podem ser manipulados ou efêmeros;
- duas fontes podem repetir a mesma origem primária;
- o score serve para priorização, não como garantia de venda ou lucro.

## Assinatura

Tehkné Solutions
