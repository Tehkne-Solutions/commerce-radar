# Changelog — Commerce Radar

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
