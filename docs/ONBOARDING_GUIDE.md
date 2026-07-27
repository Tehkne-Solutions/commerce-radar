# Configuração guiada — Commerce Radar v0.7.0

A área **Configuração guiada** organiza a ativação inicial do workspace em uma jornada curta, auditável e sem dependência de API paga.

## Objetivo

O onboarding ajuda a concluir a estrutura mínima para usar o produto:

1. definir o workspace;
2. selecionar canais;
3. criar a equipe inicial;
4. escolher a origem dos dados;
5. registrar ou importar a primeira hipótese;
6. gerar a primeira recomendação explicável.

O fluxo não cria vendas, pedidos ou margem real artificialmente.

## Etapa 1 — Workspace

São registrados:

- nome do workspace;
- modelo inicial;
- objetivo principal;
- orçamento mensal disponível;
- prazo da primeira validação.

Modelos disponíveis:

- loja direta;
- dropshipping;
- revenda;
- afiliados;
- modelo misto.

O orçamento usa reais no padrão pt-BR, por exemplo `R$ 1.250,50`.

## Etapa 2 — Canais

O usuário pode selecionar um ou mais canais:

- Mercado Livre;
- Shopee;
- TikTok Shop;
- Instagram + WhatsApp;
- Loja própria;
- WooCommerce;
- Shopify;
- Afiliados.

A seleção representa interesse operacional. Ela não confirma que uma conta já esteja criada ou aprovada no canal.

## Etapa 3 — Equipe

Em um workspace novo, o onboarding cria o primeiro administrador local.

O PIN:

- possui entre 4 e 32 caracteres;
- recebe salt individual;
- é armazenado como hash;
- nunca entra no backup em texto aberto.

Quando já existe um administrador autenticado, integrantes adicionais podem ser cadastrados com os perfis disponíveis na área de identidade.

A sessão continua restrita ao navegador atual.

## Etapa 4 — Origem dos dados

Existem três caminhos.

### Usar dados existentes

O sistema verifica sinais, oportunidades, testes, análises, auditorias e lotes já cadastrados.

### Importar CSV

O onboarding abre a área **Importar dados**, que aceita produtos, vendas, tráfego e arquivos de marketplaces.

O fluxo somente avança quando algum dado importado ou operacional é detectado.

### Cadastrar primeira evidência

O usuário informa manualmente um produto, fonte, evidência, canal, custos e avaliações iniciais.

## Etapa 5 — Primeiro produto

O cadastro inicial pode incluir:

- produto ou tema;
- categoria;
- canal;
- tipo e nome da fonte;
- URL;
- evidência observada;
- preço estimado;
- custo estimado;
- capital inicial;
- crescimento;
- demanda;
- concorrência;
- margem potencial;
- risco;
- confiança.

O onboarding cria três registros rastreáveis:

```text
sinal de tendência
+
oportunidade própria
+
análise inicial
```

Nenhum teste ou pedido é criado automaticamente.

## Etapa 6 — Primeira recomendação

A recomendação usa o mesmo motor explicável da v0.6.

Ela apresenta:

- score;
- confiança;
- classificação;
- próxima ação;
- canais;
- margem disponível;
- pedidos registrados.

Dados ausentes recebem peso zero ou geram lacunas. Por isso, uma hipótese inicial normalmente será classificada como **Coletar dados**, **Monitorar** ou **Testar agora**.

## Critérios de conclusão

O onboarding somente pode ser concluído quando existem:

```text
workspace configurado
+ canal selecionado
+ usuário local
+ dados cadastrados ou importados
+ produto ou oportunidade
+ primeira recomendação
```

## Reaproveitamento de workspaces existentes

Quando o navegador já possui dados, o onboarding não cria duplicações automaticamente.

O usuário pode escolher **Usar dados existentes** e gerar a recomendação a partir do que já está salvo.

Workspaces antigos não são forçados para a tela guiada quando já possuem dados e o onboarding nunca foi iniciado.

## Abertura automática

A configuração guiada abre automaticamente somente quando:

- o workspace está vazio; ou
- o onboarding foi iniciado e ainda não foi concluído.

A abertura automática ocorre no máximo uma vez por sessão do navegador.

## Relatório

A exportação Markdown registra:

- workspace;
- modelo;
- objetivo;
- orçamento;
- canais;
- usuários;
- progresso;
- primeira recomendação;
- próxima ação;
- limitações;
- assinatura da Tehkné Solutions.

## Backup e sincronização

A versão adiciona:

```text
onboardingState
onboardingEvents
```

Esses dados entram no workspace sincronizado e no backup JSON.

A sessão e o PIN em texto aberto continuam fora do backup.

Não é necessária uma nova migration no Supabase.

## Limitações

- O onboarding organiza a ativação, mas não substitui pesquisa de mercado.
- Uma evidência manual pode estar incorreta ou incompleta.
- Preço, custo e capital estimados não equivalem a margem líquida real.
- A primeira recomendação não garante vendas ou lucro.
- A criação de conta em marketplaces continua sendo realizada fora do Commerce Radar.
- A importação depende dos arquivos fornecidos pelo usuário.
- A identidade permanece local e não substitui IAM, SSO ou MFA.

## Assinatura

Tehkné Solutions
