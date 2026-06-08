# 🏆 Status do Projeto - Bolão Copa do Mundo 2026

Este documento registra o estado atual do desenvolvimento, arquitetura, configurações de ambiente, usuários cadastrados, correções recentes e um índice de toda a documentação do projeto. Ele serve como o **harness** oficial para restaurar o contexto completo do projeto ao abrir novas sessões de agentes IA.

---

## 📅 Última Atualização
* **Data:** 8 de Junho de 2026
* **Status Geral:** MVP Completo & Segurança Reforçada.

---

## 📚 Guia de Documentação (Harness)
Sempre que uma nova sessão for iniciada, leia os documentos abaixo para obter o contexto funcional e técnico completo:

### Documentos Principais do Projeto:
*   [README.md](file:///Users/luisabrantes/Documents/Code/familyWorldCup/README.md) - Instruções de execução local, comandos disponíveis e visão do projeto.
*   [PRD.md](file:///Users/luisabrantes/Documents/Code/familyWorldCup/PRD.md) - Requisitos de produto, contexto do bolão de família e regras de negócio.
*   [spec-features.md](file:///Users/luisabrantes/Documents/Code/familyWorldCup/spec-features.md) - Critérios de aceitação detalhados (Dado/Quando/Então) e plano de testes.
*   [spec-architecture.md](file:///Users/luisabrantes/Documents/Code/familyWorldCup/spec-architecture.md) - Detalhes do banco de dados, motor de pontuação, lógica de sincronização automática e proteção de spoilers.

### Funcionalidades Específicas e Infraestrutura:
*   [docs/ROADMAP.md](file:///Users/luisabrantes/Documents/Code/familyWorldCup/docs/ROADMAP.md) - Roadmap de features (concluídas e futuras) e mapeamento da estrutura do código.
*   [docs/INFRAESTRUTURA_GRATUITA.md](file:///Users/luisabrantes/Documents/Code/familyWorldCup/docs/INFRAESTRUTURA_GRATUITA.md) - Configuração do Supabase, Vercel, e estratégias de caching para manter custo zero.
*   [docs/feature-social-palpites.md](file:///Users/luisabrantes/Documents/Code/familyWorldCup/docs/feature-social-palpites.md) - Implementação da visualização de palpites da família após o usuário realizar o próprio palpite.
*   [docs/feature-admin-participantes-stats.md](file:///Users/luisabrantes/Documents/Code/familyWorldCup/docs/feature-admin-participantes-stats.md) - Painel do administrador para monitoramento de estatísticas e exclusão segura de participantes.
*   [docs/admin-email-feature.md](file:///Users/luisabrantes/Documents/Code/familyWorldCup/docs/admin-email-feature.md) - Log de migração de login do Clerk para Supabase Auth.

---

## 🧱 O Alicerce Técnico (100% Gratuito e Funcional)

*   **Frontend & APIs (Vercel):** Hospedado no plano Hobby. Tráfego leve e rotas serverless sob demanda.
*   **Banco de Dados (Supabase PostgreSQL):** Hospedado no plano gratuito. Configurado em `src/db/index.ts` com `{ max: 1, prepare: false }` para compatibilidade com o pooler Supavisor.
*   **Autenticação (Supabase Auth):** Login por email/senha via `@supabase/supabase-js`. Token JWT enviado no header `Authorization: Bearer <token>`.
*   **Segurança (RLS Ativo):** As tabelas `matches`, `predictions` e `users` possuem **Row Level Security (RLS) habilitado**, impedindo acessos REST não autorizados com a *anon key* pública. A API de rotas do Next.js acessa o banco ignorando o RLS por usar a conexão de proprietário (`postgres`).
*   **API de Resultados (Football-Data.org):** Integrado com cache de banco de dados (TTL de 60 segundos) no sincronizador `src/lib/syncService.ts` para respeitar o limite gratuito de 10 chamadas/minuto.

---

## 🛠️ O que já foi Implementado e Testado

1.  **Modelagem de Dados & Banco**: Tabelas `users`, `matches` e `predictions` criadas via Drizzle ORM no banco de dados Supabase de produção.
2.  **Autenticação & Controle de Sessão**: Supabase Auth integrado. Todas as API routes validam o token via `getOrCreateLocalUser(req)` em `src/lib/auth.ts`.
3.  **Motor de Pontuação (`computePoints`)**: Cobertura total de regras (10 pontos por placar exato, 7 por resultado + saldo, 5 por resultado, 0 por erro).
4.  **Palpites com Spoiler Protection**: Um participante só visualiza o palpite dos outros em jogos futuros caso ele mesmo já tenha palpitado no jogo específico.
5.  **Leaderboard & Perfis de Usuários**: Ranking em tempo real com nomes clicáveis que abrem modal com o histórico de palpites do usuário.
6.  **Painel do Administrador**:
    *   Forçar sincronização manual da API de futebol.
    *   Gerenciar participantes com remoção segura e cascade deletes.
    *   Dashboard completo com estatísticas de engajamento, jogos mais palpitados e distribuição de pontos.
7.  **Compilação e Testes (Sucesso)**:
    *   **26/26 testes unitários e de integração passando** (`npm run test`).
    *   **Build de produção completando com sucesso** (`npm run build`).

---

## 👥 Usuários Cadastrados no Banco (auth.users)
*   **`luis.hsa@gmail.com`** (Nome: *Luís ✋😜* - Admin)
*   **`amandamassarioli3@gmail.com`** (Nome: *Amanda Massarioli*)
*   **`bruna.fma@gmail.com`** (Nome: *Bruna*)

---

## 🔧 Correções e Melhorias Recentes

### Correção no Salvamento de Palpites Iniciais
*   **Problema:** Usuários novos (com 0 palpites gravados) não conseguiam salvar palpites iniciais de `0 x 0` (o placar padrão do formulário) porque a página no front-end verificava `predictedScores[matchId]` que começava como `undefined` e abortava a requisição.
*   **Solução:** Ajustado em [page.tsx](file:///Users/luisabrantes/Documents/Code/familyWorldCup/src/app/page.tsx#L366-L373) para aplicar o valor padrão `{ home: 0, away: 0 }` caso o palpite ainda não tenha sido modificado.

### Ativação de Row Level Security (RLS)
*   **Problema:** As tabelas do banco de dados estavam expostas sem segurança de linha, permitindo acessos diretos indesejados via API REST pública do Supabase.
*   **Solução:** Habilitado o RLS nas tabelas `public.matches`, `public.predictions` e `public.users`. Testado e confirmado que não afeta a conexão do back-end.

### Visibilidade de Senha & Recuperação de Senha (Supabase Auth)
*   **Problema:** Usuários confundiam ou esqueciam suas senhas ao digitar no login/cadastro e não tinham como recuperá-las ou visualizá-las.
*   **Solução:** 
    1.  Adicionado o toggle de visualização (olho/olho riscado) com os ícones `Eye` e `EyeOff` nos campos de entrada de senha em todas as telas de autenticação.
    2.  Implementado o fluxo de "Esqueci minha senha" usando `supabase.auth.resetPasswordForEmail()` para enviar e-mails de recuperação.
    3.  Implementado o listener de recuperação `onAuthStateChange` com evento `"PASSWORD_RECOVERY"` para detectar o retorno do e-mail e renderizar o componente `ResetPasswordForm`, atualizando a senha do usuário com `supabase.auth.updateUser()`.

---

## 🔑 Variáveis de Ambiente (Vercel & Local)

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key do Supabase |
| `DATABASE_URL` | Connection string do PostgreSQL (com `sslmode=require`) |
| `FOOTBALL_DATA_API_KEY` | Chave da API football-data.org |
| `ADMIN_USER_IDS` | UUID(s) Supabase do(s) administrador(es), separados por vírgula |
