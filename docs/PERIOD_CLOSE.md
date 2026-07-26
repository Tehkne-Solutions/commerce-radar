# Fechamento financeiro por período

A versão 0.4.4 adiciona uma visão consolidada para transformar auditorias e lotes reconciliados em um fechamento operacional por período.

## Fontes

O painel utiliza:

- auditorias financeiras por produto e canal;
- lotes de reconciliação por pedido;
- controles de repasse;
- snapshots de fechamentos salvos.

Nenhuma tarifa é presumida. O resultado depende dos dados informados ou importados.

## Resultado consolidado

Para cada intervalo, o sistema calcula:

- receita bruta;
- receita líquida;
- custos totais;
- lucro líquido;
- margem líquida;
- pedidos;
- ticket médio;
- repasse esperado;
- repasse informado;
- repasse recebido;
- valor pendente;
- divergência;
- repasses atrasados ou contestados.

```text
receita líquida = receita bruta - descontos - reembolsos
frete líquido = máximo(0, frete pago - subsídio)
lucro líquido = receita líquida - todos os custos operacionais
```

## Comparação entre canais

A tabela agrupa auditorias e repasses por canal. Ela apresenta receita líquida, lucro, margem, pedidos e valores pendentes.

## Evolução da margem

A evolução é agrupada pelo mês de término da auditoria. Quando não existe data final, o sistema utiliza a data inicial ou a data de criação.

## Controle de repasses

Cada controle pode registrar referência, canal, período, valor esperado, valor informado pela plataforma, valor recebido, vencimento, status e observações.

Status disponíveis:

- Pendente;
- Recebido parcialmente;
- Recebido;
- Em contestação.

```text
valor pendente = valor informado ou esperado - valor recebido
divergência = valor informado - valor esperado
```

Quando o vencimento passou e ainda existe saldo, o repasse é marcado como atrasado.

## Importação dos lotes reconciliados

O botão **Importar repasses dos lotes** procura lotes da v0.4.3 que ainda não possuem controle. A importação cria controles revisáveis e não marca automaticamente um repasse como recebido.

## Fechamentos salvos

Um fechamento salvo contém nome, período, canal, status, observações e um snapshot dos indicadores.

Status:

- Em aberto;
- Em revisão;
- Fechado.

Um fechamento já fechado conserva seu snapshot enquanto permanecer fechado.

## Qualidade dos dados

O painel mostra a proporção de auditorias marcadas como **Dados reais** e sinaliza baixa cobertura, lotes ainda não convertidos, repasse abaixo do esperado e valores em atraso ou contestação.

## Backup e sincronização

O backup 0.4.4 inclui:

```text
payoutControls
periodClosings
```

Esses campos também entram no workspace sincronizado. Não é necessária uma migration adicional no Supabase.

## Exportação

O relatório Markdown contém resultado consolidado, comparação entre canais, controles de repasse, atrasos, divergências e observações.

## Limites

- O painel não substitui contabilidade, apuração fiscal ou conciliação bancária.
- Datas e valores precisam ser revisados antes de marcar um período como fechado.
- Um lote pode conter ajustes de períodos anteriores.
- O valor informado pelo marketplace não significa que o dinheiro foi efetivamente recebido.
- O sistema não acessa extratos bancários.

## Assinatura

Tehkné Solutions
