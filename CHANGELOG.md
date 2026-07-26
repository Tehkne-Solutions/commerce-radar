# Changelog — Commerce Radar

## 0.4.3 — Reconciliação por Pedido

### Adicionado

- Área de reconciliação financeira por pedido.
- Detecção de relatórios de Mercado Livre, Shopee, Shopify, WooCommerce e CSV genérico.
- Agrupamento de várias linhas pelo identificador do pedido.
- Deduplicação de frete, descontos, reembolsos, impostos e repasses repetidos.
- Soma de tarifas e comissões realmente cobradas por item em Mercado Livre e Shopee.
- Rateio proporcional dos custos do pedido pela receita de cada produto.
- Uso da quantidade como peso quando não existe receita por item.
- Cálculo de repasse esperado e diferença para o repasse informado.
- Exportação CSV dos pedidos reconciliados.
- Histórico local dos 50 lotes mais recentes.
- Criação de auditorias financeiras por produto e canal.
- Inclusão dos lotes de reconciliação no backup e no workspace sincronizado.
- Documentação em `docs/ORDER_RECONCILIATION.md`.
- Workflow específico com cenários multi-item e taxas repetidas.

### Privacidade e segurança

- Processamento integral no navegador.
- CSV bruto não armazenado no histórico.
- Nenhuma credencial de marketplace solicitada.
- Valores calculados permanecem revisáveis antes da criação das auditorias.
- A ferramenta não substitui conciliação contábil, fiscal ou bancária.

### Compatibilidade

- Não exige nova migration do Supabase.
- Backups antigos continuam válidos.
- Auditoria financeira, importação, histórico e conflitos permanecem disponíveis.
- O PWA inclui os novos assets no cache offline.

## 0.4.2 — Margem Líquida e Auditoria Financeira

### Adicionado

- Área de auditoria financeira por produto e canal.
- Cálculo de receita líquida, frete líquido, custos totais e lucro líquido.
- Margem líquida, contribuição antes da mídia e lucro por pedido.
- CPA, ROAS e ROAS de equilíbrio.
- Indicadores de taxa, frete, imposto, publicidade, reembolso e custo do produto.
- Quatro níveis de qualidade: real, parcial, estimado e incompleto.
- Perfis financeiros editáveis por canal.
- Reconciliação entre valores observados e custos planejados.
- Alertas de prejuízo, custo ausente, taxas elevadas, frete pesado, reembolso e mídia abaixo do equilíbrio.
- Criação de auditoria a partir de testes e lotes importados.
- Exportação consolidada em CSV e relatório individual em Markdown.
- Inclusão de auditorias, perfis e lotes de importação no backup.
- Inclusão dinâmica desses dados na sincronização do workspace.
- Documentação detalhada em `docs/FINANCIAL_AUDIT.md`.
- Workflow específico para validar fórmulas e integração.

### Regra de segurança financeira

- Nenhuma tarifa fixa de marketplace é presumida.
- Valores esperados só são preenchidos a partir de perfis criados pelo usuário.
- Custos estimados permanecem identificados como estimativa.
- O sistema não substitui contabilidade ou apuração fiscal.

### Compatibilidade

- Auditorias funcionam em modo local ou sincronizado.
- Não há nova migration do Supabase.
- Backups antigos continuam válidos.
- Importações, adaptadores, histórico e conflitos permanecem disponíveis.
- O PWA inclui o módulo no cache offline.

## 0.4.1 — Adaptadores de Marketplaces

### Adicionado

- Detecção automática de arquivos de Mercado Livre, Shopee, WooCommerce e Shopify.
- Preset manual para substituir a detecção automática.
- Adaptadores separados para produtos e pedidos quando a plataforma possui formatos distintos.
- Normalização de itens de linha do Shopify sem repetir o total completo do pedido.
- Reconhecimento do Product CSV Import Schema do WooCommerce.
- Suporte a exportações por item de pedidos e Analytics do WooCommerce.
- Reconhecimento de campos comuns das vendas do Mercado Livre e equivalentes da API de orders.
- Reconhecimento de campos comuns dos pedidos da Shopee em português e inglês.
- Separação entre receita, custo, investimento em mídia e taxas identificadas.
- Filtragem de pedidos cancelados, inválidos, anulados, falhos ou totalmente reembolsados.
- Indicador de adaptador, confiança da detecção e quantidade de linhas normalizadas.
- Documentação detalhada em `docs/MARKETPLACE_ADAPTERS.md`.
- Workflow específico com amostras das quatro plataformas.

### Privacidade e segurança

- Transformação realizada inteiramente no navegador.
- Nenhuma autenticação ou credencial das plataformas é solicitada.
- Dados pessoais não necessários são descartados no formato normalizado.
- O mapeamento continua revisável antes de qualquer gravação.
- A detecção automática não elimina a confirmação do usuário.

### Compatibilidade

- Arquivos genéricos continuam usando o importador v0.4 sem alteração.
- O modo local, o Supabase opcional, o histórico e os conflitos permanecem disponíveis.
- O PWA inclui os adaptadores no cache offline.

## 0.4.0 — Importação de Dados

### Adicionado

- Importação de arquivos CSV, TXT e TSV.
- Detecção automática de ponto e vírgula, vírgula, tabulação e barra vertical.
- Leitura de arquivos UTF-8 com fallback para Windows-1252.
- Normalização de valores monetários no padrão pt-BR.
- Reconhecimento automático de cabeçalhos em português e inglês.
- Mapeamento manual e revisável das colunas.
- Prévia do arquivo antes da gravação.
- Diagnóstico de linhas válidas, cobertura, produtos e totais.
- Agregação por SKU/produto e canal.
- Conversão de catálogo em oportunidades próprias e análises.
- Conversão de vendas e tráfego em testes reais.
- Estratégias para somar períodos ou substituir métricas.
- Detecção de reimportação do mesmo arquivo por fingerprint.
- Histórico local dos 50 lotes mais recentes.
- Exportação do lote e do CSV normalizado.
- Modelos para produtos, vendas e métricas.
- Backup v0.4 com histórico de importações.

### Privacidade e segurança

- Arquivos são processados localmente no navegador.
- O CSV bruto não é armazenado no histórico.
- Limite de 8 MB e 20.000 linhas por lote.
- Conteúdo exibido na interface é escapado.
- Nenhuma credencial é adicionada às exportações.

### Compatibilidade

- Oportunidades, análises e testes importados usam os mesmos formatos das versões anteriores.
- Backups antigos continuam válidos.
- O modo local, a nuvem, o histórico e a resolução de conflitos permanecem disponíveis.
- PWA atualizado para funcionamento offline do módulo de importação.

## 0.3.3 — Histórico e Conflitos

### Adicionado

- Revisão incremental para cada workspace sincronizado.
- Tabela `commerce_radar_workspace_versions` com histórico por usuário.
- RPC atômico `sync_commerce_radar_workspace`.
- Identificação persistente do dispositivo de origem.
- Motivo da sincronização em cada revisão.
- Painel com as 30 versões mais recentes.
- Exportação de versões individuais em JSON.
- Restauração de versão antiga como nova revisão.
- Detecção de conflito quando outro dispositivo publica primeiro.
- Resolução por versão remota, mesclagem ou preservação local.
- Suspensão da sincronização automática enquanto o conflito estiver pendente.

### Segurança

- Escrita direta na tabela atual revogada para usuários autenticados.
- Toda alteração passa pelo RPC com revisão esperada.
- Bloqueio de linha no PostgreSQL durante a sincronização.
- Limite de 5 MB por payload.
- Histórico protegido por RLS e `auth.uid()`.
- Restaurações e resoluções permanecem auditáveis.

### Compatibilidade

- Workspaces existentes começam na revisão 0 e passam para a revisão 1 no primeiro envio versionado.
- Dados, contas e backups das versões anteriores continuam válidos.
- O modo local continua funcionando sem Supabase.

## 0.3.2 — Diagnóstico Administrativo

- Painel de diagnóstico de navegador, configuração, Auth, Data API, RLS, sessão, workspace e PWA.
- Relatório copiável sem credenciais ou tokens.
- Workflow externo de verificação após o provisionamento.
- Teste dos assets publicados no GitHub Pages.

## 0.3.1 — Ativação Automatizada

- Workflow para criar ou conectar um projeto Supabase.
- Aplicação automática de migrations e RLS.
- Geração e publicação do `cloud-config.js`.
- Botão **Criar conta e ativar agora**.
- Primeiro envio automático do workspace.

## 0.3.0 — Conta e Sincronização

- Cadastro e login com Supabase Auth.
- Sessão persistente com renovação de token.
- Envio, download e mesclagem do workspace.
- Sincronização automática opcional.
- Workspace isolado por usuário com RLS.

## 0.2.1 — Operação e Lançamento

- Oportunidades próprias.
- Restauração de backup JSON.
- Planos de lançamento com metas, orçamento e checklist.
- Exportação de planos em Markdown e CSV.

## 0.2.0 — Radar de Oportunidades

- Catálogo inicial com 20 hipóteses.
- Filtros, comparação de nichos e diagnóstico.
- Funil de experimentos com métricas.
- Exportações CSV e backup JSON.

## Assinatura

Tehkné Solutions