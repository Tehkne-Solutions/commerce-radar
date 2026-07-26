# Auditoria financeira — Commerce Radar

A versão 0.4.2 adiciona uma camada de margem líquida para separar faturamento de lucro real.

A ferramenta organiza informações operacionais. Ela não substitui contabilidade, apuração fiscal ou aconselhamento tributário.

## Princípio

O Commerce Radar não presume uma tarifa fixa para Mercado Livre, Shopee, Shopify, WooCommerce ou outro canal.

Taxas, frete, impostos e custos variam conforme categoria, contrato, logística, forma de pagamento, campanha, regime tributário e período. Por isso, cada auditoria utiliza:

- valores reais informados pelo usuário;
- dados parciais importados;
- ou um perfil de premissas criado pelo próprio usuário.

## Fluxo

1. Abra **Auditoria financeira**.
2. Crie uma auditoria manual ou use um teste/lote importado como ponto de partida.
3. Informe receita, pedidos e custos do período.
4. Se necessário, aplique um perfil de premissas.
5. Revise os alertas e marque a qualidade dos dados.
6. Salve, compare e exporte o relatório.

## Campos

### Receita

- **Receita bruta:** receita dos produtos antes das deduções listadas na auditoria.
- **Descontos fora da receita:** descontos que ainda não estão refletidos no valor de receita informado.
- **Reembolsos:** valores devolvidos ou estornados.

Evite registrar o mesmo desconto ou reembolso duas vezes.

### Custos

- custo dos produtos vendidos;
- taxas do canal;
- taxas de pagamento;
- frete pago;
- subsídio de frete;
- impostos;
- publicidade;
- embalagens;
- outros custos variáveis.

Custos fixos da empresa podem ser registrados em **Outros custos** quando a intenção for atribuí-los ao período ou produto. A regra de rateio deve ser consistente.

## Fórmulas

### Receita líquida

```text
receita líquida = receita bruta - descontos - reembolsos
```

### Frete líquido

```text
frete líquido = máximo(0, frete pago - subsídio de frete)
```

### Custos não publicitários

```text
custos não publicitários =
  custo dos produtos
  + taxas do canal
  + taxas de pagamento
  + frete líquido
  + impostos
  + embalagens
  + outros custos
```

### Contribuição antes da mídia

```text
contribuição antes da mídia = receita líquida - custos não publicitários
```

### Lucro líquido operacional

```text
lucro líquido = contribuição antes da mídia - publicidade
```

### Margem líquida

```text
margem líquida = lucro líquido / receita líquida
```

### CPA

```text
CPA = publicidade / pedidos
```

### ROAS

```text
ROAS = receita bruta / publicidade
```

### ROAS de equilíbrio

```text
ROAS de equilíbrio = receita líquida / contribuição antes da mídia
```

O ROAS de equilíbrio só é calculado quando a contribuição antes da mídia é positiva.

## Exemplo

Considere um período com:

- receita bruta: R$ 1.000,00;
- descontos: R$ 20,00;
- reembolsos: R$ 50,00;
- custo dos produtos: R$ 400,00;
- taxas do canal: R$ 100,00;
- taxas de pagamento: R$ 20,00;
- frete pago: R$ 80,00;
- subsídio de frete: R$ 20,00;
- impostos: R$ 60,00;
- publicidade: R$ 100,00;
- embalagens: R$ 30,00;
- outros custos: R$ 10,00.

Resultado:

- receita líquida: R$ 930,00;
- frete líquido: R$ 60,00;
- custos totais: R$ 780,00;
- lucro líquido: R$ 150,00;
- margem líquida: 16,1%;
- contribuição antes da mídia: R$ 250,00;
- ROAS de equilíbrio: 3,72.

## Perfis financeiros

Um perfil guarda premissas por canal:

- taxa do canal em percentual;
- taxa de pagamento em percentual;
- imposto em percentual;
- frete por pedido;
- embalagem por pedido;
- outros custos por pedido.

Ao aplicar um perfil, o sistema preenche valores esperados. Eles continuam editáveis antes de salvar.

A reconciliação compara o valor observado com o esperado. Uma variação é destacada quando ultrapassa o maior entre:

- R$ 5,00;
- 10% do valor esperado.

## Qualidade dos dados

### Dados reais

Valores obtidos de relatórios financeiros, documentos fiscais, extratos ou controles confiáveis.

### Dados parciais

Parte dos custos é real, mas ainda faltam componentes como imposto, frete ou taxa de pagamento.

### Estimado

Valores calculados a partir de perfis ou premissas.

### Incompleto

Faltam receita, custo do produto, pedidos ou outros campos essenciais.

## Alertas automáticos

O sistema sinaliza:

- receita ausente;
- custo de produto ausente;
- pedidos ausentes;
- prejuízo;
- taxas acima de 25% da receita bruta;
- frete líquido acima de 20%;
- reembolsos acima de 8%;
- ROAS abaixo do equilíbrio;
- variações relevantes contra o perfil planejado.

Os limites são alertas operacionais, não regras universais.

## Integração com dados existentes

Uma auditoria pode começar a partir de:

- um teste real;
- um produto presente no histórico de importações;
- preenchimento manual.

Quando criada a partir de um lote antigo, o custo dos produtos pode ser estimado usando a margem bruta registrada. Taxas, frete, impostos e reembolsos devem ser revisados.

## Backup e nuvem

A versão 0.4.2 inclui no backup:

- `financialAudits`;
- `financialProfiles`;
- `importBatches`.

O módulo também amplia dinamicamente os dados sincronizados pelo workspace Supabase. Não é necessária nova tabela ou migration.

## Privacidade

- Todos os cálculos são executados no navegador.
- Perfis e auditorias ficam no LocalStorage enquanto o modo local estiver ativo.
- A nuvem continua opcional.
- Nenhuma credencial de marketplace é solicitada.
- Relatórios exportados não incluem tokens ou segredos.

## Assinatura

Tehkné Solutions
