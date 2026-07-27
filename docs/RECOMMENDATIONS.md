# Recomendações explicáveis — Commerce Radar v0.6

A área **Recomendações** cruza os dados já registrados no Commerce Radar para responder:

> Qual produto merece o próximo teste, auditoria ou investimento — e por quê?

O resultado é um ranking operacional. Ele não é uma previsão de vendas e não substitui validação real.

## Fontes utilizadas

Cada produto pode receber dados de cinco domínios:

1. **Mercado:** sinais do Radar de tendências.
2. **Validação:** testes reais, etapas, cliques, pedidos, receita e investimento.
3. **Economia:** auditorias financeiras ou, na ausência delas, margem estimada de uma análise.
4. **Prontidão:** diagnóstico, oportunidade, risco e capital informado.
5. **Atualidade e evidência:** datas, validade, diversidade de fontes e cobertura dos domínios.

Produtos são agrupados por nome normalizado. Acentos, pontuação e diferenças entre maiúsculas e minúsculas são removidos, mas nomes semanticamente diferentes não são unidos automaticamente.

## Pesos padrão

```text
Mercado:    24%
Validação:  22%
Economia:   22%
Prontidão:  12%
Atualidade: 12%
Evidência:   8%
```

A soma é normalizada para 100%. Dados inexistentes recebem zero no componente correspondente; o sistema não cria estimativas favoráveis para completar lacunas.

## Validação por testes

O score de validação considera:

- etapa mais avançada do funil;
- pedidos;
- conversão entre cliques e pedidos;
- relação entre receita e investimento;
- idade do teste.

Etapas:

```text
Ideia:      10
Pesquisa:   28
Conteúdo:   45
Conversão:  68
Validado:  100
Descartado:  0
```

Um teste descartado limita a validação quando não existe outro teste validado.

## Economia

Quando existem auditorias financeiras, o sistema usa:

- margem líquida;
- lucro líquido;
- qualidade dos dados;
- data da auditoria;
- quantidade de períodos com prejuízo.

A qualidade tem pesos diferentes:

```text
Dados reais:       100%
Dados parciais:     72%
Estimado:           48%
Incompleto:         25%
```

Quando só existe uma análise, a margem bruta estimada pode orientar o ranking, mas a confiança permanece reduzida e a próxima ação recomenda uma auditoria real.

## Atualidade

O score temporal reduz progressivamente o peso dos dados:

- até 7 dias: máximo;
- de 8 a 30 dias: pequena redução;
- de 31 a 90 dias: redução moderada;
- de 91 a 180 dias: baixa relevância;
- de 181 a 365 dias: relevância residual;
- acima de 365 dias: zero.

A validade configurada no Radar de tendências também é respeitada. Quando todos os sinais estão vencidos, o produto recebe penalização adicional.

## Penalizações

São aplicadas penalizações transparentes para:

- fontes contraditórias;
- todos os sinais vencidos;
- teste descartado sem teste validado;
- auditorias com prejuízo.

As penalizações aparecem no card da recomendação.

## Confiança

A confiança considera:

- cobertura dos domínios;
- número e diversidade de fontes;
- qualidade das auditorias;
- atualidade dos dados.

Uma nota alta com confiança baixa não recebe o estado **Priorizar**.

## Estados

- **Priorizar:** score a partir de 80 e confiança a partir de 65%.
- **Testar agora:** score a partir de 64.
- **Monitorar:** score a partir de 48.
- **Revisar antes de avançar:** existe evidência negativa relevante, apesar de sinais positivos.
- **Pausar:** score baixo, prejuízo ou descarte relevante.
- **Coletar dados:** confiança abaixo de 30%.

## Ranking temporal

O botão **Capturar ranking** preserva diariamente:

- produto;
- score;
- confiança;
- recomendação;
- data da evidência mais recente.

O card mostra a variação em relação ao snapshot anterior. O ranking não tenta reconstruir dias anteriores à implantação da v0.6.

## Próxima ação

A próxima ação é escolhida pela primeira lacuna crítica:

1. atualizar sinais vencidos;
2. criar teste;
3. confirmar pedidos;
4. auditar margem real;
5. corrigir prejuízo;
6. preparar lançamento controlado.

## Decisões manuais

O usuário pode registrar:

- priorizar;
- monitorar;
- pausar;
- uma observação opcional.

A decisão humana não altera o score calculado. Ela permanece visível para comparação entre recomendação e escolha operacional.

## Backup e sincronização

A v0.6 adiciona:

```text
recommendationSettings
recommendationSnapshots
recommendationDecisions
```

Esses campos entram no backup JSON, restauração, sincronização e histórico de versões. Não é necessária nova migration no Supabase.

## Carregamento modular

A v0.6 adiciona `module-loader.js`, carregado após a base da aplicação. Ele inicializa os módulos avançados em ordem explícita:

```text
Nuvem
→ Importação
→ Finanças
→ Tendências
→ Recomendações
→ Calendário, operação e SLA
```

Isso garante que os módulos posteriores à v0.2 sejam realmente executados no navegador, não apenas armazenados no repositório ou no cache offline.

## Limitações

- Nomes diferentes para o mesmo produto podem gerar candidatos separados.
- Pedidos sem custos reais não comprovam lucro.
- Margem estimada não equivale a margem líquida.
- Interesse, busca ou visualização não comprovam demanda paga.
- Dados antigos perdem peso, mas não são apagados.
- A recomendação não garante venda, lucro, liquidez ou escala.
- O sistema não substitui pesquisa de mercado, contabilidade ou decisão humana.

## Assinatura

Tehkné Solutions
