# Roadmap de Features — Bolão da Família Copa 2026

## Estado Atual (MVP Completo ✅)

O MVP está funcional com:
- Autenticação via Clerk (login/logout)
- Banco de dados Supabase + Drizzle ORM
- Sincronização automática de 104 jogos (football-data.org)
- Motor de pontuação (10/7/5/0 pts)
- API de palpites com trava por horário de início
- Ranking em tempo real
- Painel admin: forçar sincronização
- UI verde-escuro/dourado responsiva

---

## Próximas Features Planejadas

### 🟡 Prioridade Alta

| # | Feature | Documento | Status |
|---|---|---|---|
| 1 | **Palpites Sociais** — ver palpites dos outros após dar o seu | [feature-social-palpites.md](./feature-social-palpites.md) | 📝 Documentado |
| 2 | **Admin: Gerenciar Participantes** — ver, remover participantes | [feature-admin-participantes-stats.md](./feature-admin-participantes-stats.md) | 📝 Documentado |
| 3 | **Admin: Dashboard de Estatísticas** — métricas do bolão | [feature-admin-participantes-stats.md](./feature-admin-participantes-stats.md) | 📝 Documentado |

### 🔵 Prioridade Média (Ideias Futuras)

| # | Feature | Descrição |
|---|---|---|
| 4 | **Notificações** | Push notification antes de cada jogo para lembrar de palpitar |
| 5 | **Histórico de Palpites** | Linha do tempo dos palpites do usuário com pontuação acumulada |
| 6 | **Grupos/Subfases** | Visão por grupo (Grupo A, B, C...) com classificação dentro do grupo |
| 7 | **Reações** | Familiares podem reagir aos palpites dos outros (👍🔥😂) |
| 8 | **Minijogo de Campeão** | Cada participante escolhe o campeão antes da Copa começar (+50 pts bônus) |

---

## Arquitetura Técnica — Referência Rápida

```
src/
├── app/
│   ├── api/
│   │   ├── auth/sync/         ← Sync Clerk → DB local
│   │   ├── matches/           ← GET: jogos + lazy sync
│   │   ├── predictions/       ← POST: salvar/atualizar palpite
│   │   ├── leaderboard/       ← GET: ranking
│   │   ├── sync/              ← POST: forçar sync (admin)
│   │   └── admin/             ← [A CRIAR]
│   │       ├── users/         ← GET (listar) + DELETE (remover)
│   │       └── stats/         ← GET (métricas do bolão)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx               ← UI principal (SPA com tabs)
├── db/
│   ├── index.ts               ← Conexão Drizzle + Supabase
│   └── schema.ts              ← Tables: users, matches, predictions
└── lib/
    ├── auth.ts                ← getOrCreateLocalUser, isAdmin
    ├── footballApi.ts         ← Cliente football-data.org
    ├── scoreEngine.ts         ← computePoints (puro, testado)
    └── syncService.ts         ← Lazy sync + cálculo de pontos
```

---

## Variáveis de Ambiente Necessárias

```bash
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Database (conexão direta Postgres)
DATABASE_URL=postgresql://postgres:[SENHA]@db.[PROJECT].supabase.co:5432/postgres

# Football Data API
FOOTBALL_DATA_API_KEY=...

# Admin (IDs Clerk dos admins, separados por vírgula)
ADMIN_USER_IDS=user_xxxxxxxxxxxxxxxx
```

---

## Deploy para Produção (Vercel)

1. Criar projeto no [vercel.com](https://vercel.com) apontando para o repositório GitHub
2. Configurar as mesmas variáveis de ambiente acima no painel da Vercel
3. O Next.js detecta automaticamente — zero config adicional necessária
4. Configurar domínio personalizado (opcional)

> ⚠️ Lembrar de adicionar o domínio da Vercel nas configurações de "Allowed Origins" do Clerk
