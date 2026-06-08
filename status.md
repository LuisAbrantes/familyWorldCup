# 🏆 Status do Projeto - Bolão Copa do Mundo 2026

Este documento registra o estado atual do desenvolvimento, arquitetura, configurações de ambiente e passos pendentes para o deploy do Bolão da Família. Ele serve para restaurar o contexto completo do projeto ao abrir novas sessões.

---

## 📅 Última Atualização
* **Data:** 7 de Junho de 2026
* **Status Geral:** MVP completo. Deploy na Vercel em andamento.

---

## 🧱 O Alicerce Técnico (100% Gratuito e Funcional)

Toda a arquitetura do projeto foi desenhada para se encaixar estritamente nas faixas de gratuidade permanente dos provedores, garantindo custo zero de ponta a ponta:

* **Frontend & APIs (Vercel):** Hospedado no plano Hobby. Tráfego leve e rotas serverless sob demanda.
* **Banco de Dados (Supabase PostgreSQL):** Hospedado no plano gratuito. Configurado em `src/db/index.ts` com `{ max: 1, prepare: false }` para compatibilidade com o pooler Supavisor e para não estourar o limite de 60 conexões simultâneas.
* **Autenticação (Supabase Auth):** Login por email/senha via `@supabase/supabase-js`. Token JWT enviado no header `Authorization: Bearer <token>`.
* **API de Resultados (Football-Data.org):** Integrado com cache de banco de dados (TTL de 60 segundos) no sincronizador `src/lib/syncService.ts` para respeitar o limite gratuito de 10 chamadas/minuto.

---

## 🛠️ O que já foi Implementado e Testado

1. **Modelagem de Dados & Banco**: Tabelas `users`, `matches` e `predictions` criadas via Drizzle ORM no banco de dados Supabase de produção.
2. **Autenticação & Controle de Sessão**: Supabase Auth integrado. Todas as API routes validam o token via `getOrCreateLocalUser(req)` em `src/lib/auth.ts`.
3. **Motor de Pontuação (`computePoints`)**: Cobertura total de regras (10 pontos por placar exato, 7 por resultado + saldo, 5 por resultado, 0 por erro).
4. **Palpites com Spoiler Protection**: Um participante só visualiza o palpite dos outros em jogos futuros caso ele mesmo já tenha palpitado no jogo específico.
5. **Leaderboard & Perfis de Usuários**: Ranking em tempo real com nomes clicáveis que abrem modal com o histórico de palpites do usuário.
6. **Painel do Administrador**:
   - Forçar sincronização manual da API de futebol.
   - Gerenciar participantes com remoção segura e cascade deletes.
   - Dashboard completo com estatísticas de engajamento, jogos mais palpitados e distribuição de pontos.
7. **Compilação e Testes (Sucesso)**:
   - **26/26 testes unitários e de integração passando** (`npm run test`).
   - **Build de produção completando em ~1.6 segundos** (`npm run build`).

---

## 🔑 Variáveis de Ambiente

Estas variáveis precisam estar configuradas na Vercel (Settings → Environment Variables):

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key do Supabase |
| `DATABASE_URL` | Connection string do PostgreSQL (porta 5432, com `sslmode=require`) |
| `FOOTBALL_DATA_API_KEY` | Chave da API football-data.org |
| `ADMIN_USER_IDS` | UUID(s) Supabase do(s) administrador(es), separados por vírgula |

---

## 🚀 Status do Deploy

* **Commit mais recente:** `1711276` - fix: add prepare:false for Supabase pooler
* **GitHub:** Sincronizado com `origin/main`
* **Vercel:** Deploy automático acionado. Aguardando conclusão.

### Checklist para o deploy funcionar:
- [x] Código sem referências ao `@clerk/nextjs`
- [x] Build local passando
- [x] 26/26 testes passando
- [x] `db/index.ts` com `prepare: false` para pooler Supabase
- [x] ID do admin atualizado para UUID Supabase no `.env.local`
- [x] Registro `clerk_user_id` no banco atualizado para UUID Supabase
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Deploy concluído com sucesso na Vercel
