# Changelog — Commerce Radar

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
