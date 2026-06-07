# 🏆 Status do Projeto - Bolão Copa do Mundo 2026

Este documento registra o estado atual do desenvolvimento, arquitetura, configurações de ambiente e passos pendentes para o deploy do Bolão da Família. Ele serve para restaurar o contexto completo do projeto ao abrir novas sessões.

---

## 📅 Última Atualização
* **Data:** 7 de Junho de 2026
* **Status Geral:** MVP e Features Adicionais Concluídos. **Deploy em andamento na Vercel**.

---

## 🧱 O Alicerce Técnico (100% Gratuito e Funcional)

Toda a arquitetura do projeto foi desenhada para se encaixar estritamente nas faixas de gratuidade permanente dos provedores, garantindo custo zero de ponta a ponta:

* **Frontend & APIs (Vercel):** Hospedado no plano Hobby. Tráfego leve e rotas serverless sob demanda.
* **Banco de Dados (Supabase PostgreSQL):** Hospedado no plano gratuito. Configurado em `src/db/index.ts` com limite de pool de conexões `{ max: 1 }` para evitar estourar o limite de 60 conexões simultâneas da Supabase no ambiente serverless.
* **Autenticação (Clerk):** Gerencia sessões e login para até 10.000 usuários ativos mensais (MAU).
* **API de Resultados (Football-Data.org):** Integrado com cache de banco de dados (TTL de 60 segundos) no sincronizador `src/lib/syncService.ts` para respeitar o limite gratuito de 10 chamadas/minuto.

---

## 🛠️ O que já foi Implementado e Testado

1. **Modelagem de Dados & Banco**: Tabelas `users`, `matches` e `predictions` criadas via Drizzle ORM no banco de dados Supabase de produção.
2. **Autenticação & Controle de Sessão**: Clerk integrado e com middleware de proteção de rotas em `src/proxy.ts`.
3. **Motor de Pontuação (`computePoints`)**: Cobertura total de regras (10 pontos por placar exato, 7 por resultado + saldo, 5 por resultado, 0 por erro).
4. **Palpites com Spoiler Protection**: Um participante só visualiza o palpite dos outros em jogos futuros caso ele mesmo já tenha palpitado no jogo específico.
5. **Leaderboard & Perfis de Usuários**: Ranking em tempo real com nomes clicáveis que abrem modal com o histórico de palpites do usuário.
6. **Painel do Administrador**:
   - Forçar sincronização manual da API de futebol.
   - Gerenciar participantes com remoção segura e cascade deletes.
   - Dashboard completo com estatísticas de engajamento, jogos mais palpitados e distribuição de pontos.
7. **Compilação e Testes (Sucesso)**:
   - **26/26 testes unitários e de integração passando** (`npm run test`).
   - **Build de produção completando em 1.7 segundos** (`npm run build`).

---

## 🚀 Status do Deploy e Próximos Passos (Para a Próxima Sessão)

O código atual foi completamente versionado e enviado para a branch `main` no GitHub. O deploy na Vercel está em execução. Quando você retornar na próxima sessão, as tarefas pendentes serão:

### 1. Vincular o Domínio Personalizado na Vercel e Clerk
* O domínio está sendo configurado na Vercel.
* **Ação Necessária no Clerk:** A URL final de produção (seu domínio personalizado ou o subdomínio da Vercel) precisa ser cadastrada no painel do Clerk em **Configure -> Paths -> Allowed Redirect URIs / Allowed Origins** para que o fluxo de login funcione fora do localhost.

### 2. Ativar Ambiente de Produção no Clerk (Recomendado)
* No painel do Clerk, clique em **Deploy to Production** para criar o ambiente de produção real.
* Insira seu domínio personalizado lá.
* O Clerk gerará novas chaves de API de produção (`pk_live_...` e `sk_live_...`).
* **Ação Necessária na Vercel:** Substitua as chaves `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` e `CLERK_SECRET_KEY` de teste nas variáveis de ambiente da Vercel pelas chaves de produção geradas, e acione um novo build (Redeploy).

### 3. Configurar os IDs de Administradores
* Assim que você criar sua conta e entrar no sistema pela primeira vez via URL de produção, pegue seu ID de usuário gerado no Clerk.
* **Ação Necessária na Vercel:** Adicione esse ID na variável de ambiente `ADMIN_USER_IDS` no painel da Vercel. Isso ativará o painel administrativo (Sincronização, Participantes, Estatísticas) exclusivamente para você.
