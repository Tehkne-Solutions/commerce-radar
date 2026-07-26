# Changelog — Commerce Radar

## 0.3.0 — Conta e Sincronização

### Adicionado

- Configuração opcional de projeto Supabase por arquivo ou pelo navegador.
- Cadastro e login com e-mail e senha.
- Persistência e renovação de sessão.
- Envio do workspace local para a nuvem.
- Download com substituição protegida por confirmação.
- Mesclagem de análises, testes, oportunidades próprias e planos pelo identificador.
- Sincronização automática opcional após alterações locais.
- Indicadores de conta, última sincronização, estado e quantidade de itens locais.
- Migration SQL para a tabela `commerce_radar_workspaces`.
- Políticas RLS de leitura, criação, alteração e exclusão por usuário.

### Alterado

- Identificação da interface atualizada para MVP 0.3.
- Cache offline ampliado para o módulo de nuvem.
- Documentação de privacidade, segurança e configuração do Supabase.
- Modo local mantido como comportamento padrão.

### Segurança e compatibilidade

- Nenhuma service-role é utilizada no frontend.
- A configuração contém somente URL e chave pública.
- Dados das versões 0.1, 0.2 e 0.2.1 continuam válidos.
- A nuvem é opcional e não bloqueia o funcionamento offline.

## 0.2.1 — Operação e Lançamento

### Adicionado

- Cadastro, edição e exclusão de oportunidades próprias dentro do radar.
- Inclusão automática das oportunidades próprias nos filtros, nichos e diagnósticos.
- Restauração de backup JSON com opções de mesclar ou substituir os dados locais.
- Backup ampliado com análises, testes, oportunidades próprias e planos de lançamento.
- Geração de plano a partir de experimentos marcados como validados.
- Metas de pedidos e receita, orçamento, data de início, status e checklist operacional.
- Exportação individual de plano em Markdown e exportação consolidada em CSV.

### Alterado

- Cache offline ampliado para os módulos da versão 0.2.1.
- Validação automática ampliada para o novo JavaScript, folhas de estilo e estrutura de backup.
- Identificação da interface atualizada para MVP 0.2.1.

### Compatibilidade

- Análises e testes da versão 0.2 continuam válidos.
- Backups antigos sem oportunidades próprias ou planos podem ser restaurados normalmente.
- Nenhum backend, login ou serviço pago necessário.

## 0.2.0 — Radar de Oportunidades

### Adicionado

- Catálogo inicial com 20 hipóteses de produto e produto digital.
- Filtros por categoria, capital, modelo e ordenação.
- Comparação agregada entre nichos.
- Conversão de oportunidade em diagnóstico preenchido.
- Funil de experimentos em seis etapas.
- Registro de métricas de conteúdo e conversão.
- Registro de investimento, receita, próxima ação e aprendizados.
- Exportações CSV para análises e experimentos.
- Backup dos dados locais em JSON.
- Validação automática da aplicação estática no GitHub Actions.

### Alterado

- Interface reorganizada como workspace operacional.
- Aplicação modularizada em HTML, CSS, catálogo e JavaScript.
- Cache offline atualizado para os novos arquivos.
- Documentação e definição do produto ampliadas.

### Compatibilidade

- Migração automática das análises gravadas pela versão 0.1.
- Nenhum backend, login ou serviço pago necessário.

### Assinatura

Tehkné Solutions
