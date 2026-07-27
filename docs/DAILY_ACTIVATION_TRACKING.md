# Acompanhamento diário — Commerce Radar v0.7.2

A área **Acompanhamento diário** complementa o Plano de 7 dias com registros por data, metas acumuladas, alertas e histórico de otimizações.

## Objetivo

O módulo responde diariamente:

1. O que foi realizado hoje?
2. Quais métricas reais foram obtidas?
3. O plano está no ritmo necessário?
4. O que mudou na oferta?
5. A mudança melhorou ou piorou o resultado observado?

Nenhuma métrica é criada automaticamente. O usuário precisa registrar cada resultado.

## Check-in diário

Cada check-in contém:

- data;
- visualizações;
- cliques;
- pedidos;
- receita;
- investimento em mídia;
- custo dos produtos;
- taxas;
- frete;
- evidência objetiva;
- bloqueios ou contexto;
- confiança do registro de 1 a 5;
- snapshot textual da oferta atual.

Os valores monetários usam o padrão pt-BR, como `R$ 1.250,50`.

## Incrementos e acumulado

Cada check-in representa o resultado daquele dia, e não o total do ciclo.

```text
acumulado do plano = soma dos check-ins diários
```

Ao salvar ou corrigir um check-in, o Commerce Radar recompõe o acumulado e atualiza o teste vinculado ao plano.

Isso evita que o histórico diário seja perdido quando o total muda.

## Meta acumulada

Por padrão, as metas do plano são distribuídas linearmente pelos sete dias.

```text
meta acumulada do dia = meta total × dia ÷ 7
```

Exemplo:

```text
Meta total: 140 visualizações
Meta acumulada do dia 3: 60 visualizações
```

A distribuição linear é apenas uma referência operacional. Alguns canais possuem tráfego e conversão irregulares.

## Alertas

O sistema identifica:

- tarefa diária atrasada;
- check-in diário ausente;
- visualizações abaixo de 60% da meta acumulada;
- cliques abaixo de 60% da meta acumulada;
- investimento acima do ritmo planejado sem pedidos proporcionais.

Os alertas não pausam campanhas nem mudam decisões automaticamente.

## Mudanças na oferta

É possível preservar mudanças em:

- título ou gancho;
- preço;
- imagem ou criativo;
- público;
- oferta;
- descrição;
- frete ou prazo;
- canal ou posicionamento;
- outro elemento.

Cada alteração exige:

- estado anterior;
- estado posterior;
- hipótese da mudança;
- data e hora.

O histórico anterior não é apagado.

## Comparação antes e depois

Quando existem check-ins antes e depois da mudança, o sistema compara:

- visualizações;
- cliques;
- pedidos;
- receita;
- investimento;
- CTR;
- conversão;
- lucro preliminar;
- margem preliminar.

A comparação mostra associação temporal, não causalidade. Outros fatores podem ter mudado no mesmo período.

## Série diária

A tabela diária apresenta:

- data;
- visualizações;
- cliques;
- pedidos;
- receita;
- investimento;
- lucro preliminar.

O relatório Markdown inclui acumulado, metas, check-ins, alertas, mudanças e assinatura da **Tehkné Solutions**.

## Backup e sincronização

A v0.7.2 adiciona:

```text
activationCheckins
activationChanges
activationTrackingSettings
```

Os dados entram no backup JSON, restauração e workspace sincronizado. Não é necessária nova migration no Supabase.

## Limitações

- resultados dependem da precisão dos registros manuais;
- a soma diária não substitui a reconciliação por pedido;
- comparar dois dias não prova que uma alteração causou a diferença;
- sazonalidade, preço de concorrentes e distribuição do canal podem interferir;
- alertas de ritmo não devem forçar investimento adicional;
- lucro e margem são preliminares até a auditoria financeira;
- o sistema não acessa automaticamente painéis de anúncios ou marketplaces.

## Assinatura

Tehkné Solutions
