# Feature: Painel Admin — Gerenciamento de Participantes & Dashboard de Estatísticas

## Visão Geral

Duas funcionalidades exclusivas para o administrador do bolão:
1. **Gerenciamento de Participantes** — ver, inativar e remover familiares cadastrados
2. **Dashboard de Estatísticas** — métricas globais do bolão para acompanhar a saúde da competição

---

## Feature 4 — Gerenciamento de Participantes

### Objetivo

O admin precisa ter visibilidade total sobre quem está participando e controle para lidar com situações como:
- Familiar que se cadastrou com nome errado
- Familiar que não deveria estar participando
- Dúvidas sobre qual conta pertence a quem (ID do Supabase vs. nome exibido)

### Tela proposta

```
┌─────────────────────────────────────────────────────────────────────┐
│  👥 Participantes                              [Atualizar lista]     │
├────────┬──────────────────────┬───────────┬───────────┬─────────────┤
│  #     │  Nome                │  Palpites │  Pontos   │  Ações      │
├────────┼──────────────────────┼───────────┼───────────┼─────────────┤
│  1     │  Luis Abrantes 👑    │  72/104   │  320 pts  │  —          │
│  2     │  Ana Abrantes        │  50/104   │  210 pts  │  [Remover]  │
│  3     │  Pedro Abrantes      │  12/104   │  55 pts   │  [Remover]  │
└────────┴──────────────────────┴───────────┴───────────┴─────────────┘
```

> ⚠️ O admin (você) não aparece com botão de [Remover] para evitar auto-exclusão.

### Regras de negócio

- **Remover participante**: apaga o usuário da tabela `users` e, em cascata (via `ON DELETE CASCADE`), todos os seus palpites são removidos automaticamente — o schema já suporta isso.
- **O admin não pode se remover** da lista (proteção no backend).
- Ao remover, o ranking é recalculado automaticamente (já que é calculado em tempo real via query).

### Nova API necessária

#### `GET /api/admin/users`
Retorna todos os participantes com suas estatísticas.

```typescript
// Resposta
{
  users: {
    id: number;
    clerkUserId: string;
    displayName: string;
    createdAt: string;
    totalPredictions: number;   // COUNT de palpites salvos
    totalPoints: number;        // SUM de pointsAwarded
  }[]
}

// Query Drizzle (JOIN users → predictions)
db.select({
  id: users.id,
  clerkUserId: users.clerkUserId,
  displayName: users.displayName,
  createdAt: users.createdAt,
  totalPredictions: count(predictions.id),
  totalPoints: sum(predictions.pointsAwarded),
})
.from(users)
.leftJoin(predictions, eq(predictions.userId, users.id))
.groupBy(users.id)
.orderBy(desc(sum(predictions.pointsAwarded)));
```

#### `DELETE /api/admin/users/[id]`
Remove um participante.

```typescript
// Validações:
// 1. Caller deve ser admin (verificar via isAdmin())
// 2. userId a remover não pode ser o próprio caller
// 3. Se o usuário não existe, retornar 404

// Execução:
await db.delete(users).where(eq(users.id, targetId));
// predictions são removidas automaticamente via CASCADE
```

### Arquivos a criar/modificar

| Arquivo | Mudança |
|---|---|
| `src/app/api/admin/users/route.ts` | Novo: GET (listar) |
| `src/app/api/admin/users/[id]/route.ts` | Novo: DELETE (remover) |
| `src/app/page.tsx` | Novo sub-painel "Participantes" dentro da aba Admin |

---

## Feature 5 — Dashboard de Estatísticas do Bolão

### Objetivo

Dar ao admin uma visão completa do estado do bolão: quantos palpites foram feitos, quais jogos têm mais engajamento, quem está mais ativo.

### Métricas propostas

#### Bloco 1 — Visão Geral
```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Total de Palpites│ Jogos com 100%   │ Participantes    │ Pontos Distribuídos│
│      847         │    12 / 104      │       8          │      3.420 pts    │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

#### Bloco 2 — Engajamento por Participante
Tabela ordenável com:
- Nome
- Nº de palpites feitos / total de jogos
- % de cobertura (ex: 69%)
- Pontos totais
- Palpites exatos (10 pts)
- Média de pontos por palpite

#### Bloco 3 — Jogos com Mais e Menos Palpites
```
🔥 Mais palpitados:
  Mexico vs South Africa  — 8/8 participantes (100%)
  Brazil vs Argentina     — 7/8 participantes (87%)

❄️ Menos palpitados:
  TBD vs TBD (LAST_32)    — 0/8 participantes (0%)
```

#### Bloco 4 — Distribuição de Pontuações
```
Quantos acertos exatos (10 pts)?   →  42 palpites (5%)
Quantos resultado + saldo (7 pts)? →  120 palpites (14%)
Quantos só o resultado (5 pts)?    →  280 palpites (33%)
Quantos erraram (0 pts)?           →  405 palpites (48%)
```

### Nova API necessária

#### `GET /api/admin/stats`

```typescript
// Resposta
{
  overview: {
    totalPredictions: number;
    totalParticipants: number;
    totalPointsDistributed: number;
    gamesWithFullParticipation: number;  // todos palpitaram
  };
  participantEngagement: {
    userId: number;
    displayName: string;
    predictionCount: number;
    coveragePercent: number;
    totalPoints: number;
    exactScores: number;
    avgPointsPerPrediction: number;
  }[];
  pointsDistribution: {
    exactScore: number;    // count de 10 pts
    resultAndGD: number;   // count de 7 pts
    resultOnly: number;    // count de 5 pts
    wrong: number;         // count de 0 pts
  };
  topAndBottomGames: {
    top: { matchId: number; homeTeam: string; awayTeam: string; count: number }[];
    bottom: { matchId: number; homeTeam: string; awayTeam: string; count: number }[];
  };
}
```

### Arquivos a criar/modificar

| Arquivo | Mudança |
|---|---|
| `src/app/api/admin/stats/route.ts` | Novo: GET (todas as métricas) |
| `src/app/page.tsx` | Novo sub-painel "Estatísticas" dentro da aba Admin |

---

## Navegação dentro do Painel Admin

A aba Admin deve ter dois sub-painéis acessíveis por tabs internas:

```
Admin
  ├── [Sincronização]     ← já existe
  ├── [Participantes]     ← Feature 4
  └── [Estatísticas]      ← Feature 5
```

---

## Proteção das rotas `/api/admin/*`

Todas as rotas sob `/api/admin/` devem:

```typescript
// Middleware de verificação (reutilizar em todas as rotas admin)
async function requireAdmin() {
  const { userId } = await auth();
  if (!await isAdmin(userId)) {
    throw new Error("Forbidden");
  }
  return userId;
}
```

Também assegurar a proteção das rotas admin no middleware de autenticação do Supabase:

```typescript
// src/middleware.ts
// Assegurar que requisições para /api/admin/* exijam um usuário autenticado no Supabase Auth e que o route handler verifique se o ID de usuário está em ADMIN_USER_IDS.
```

---

## Estimativa de Implementação

| Feature | Backend | Frontend | Testes |
|---|---|---|---|
| Gerenciamento de Participantes | ~1h | ~1.5h | ~30min |
| Dashboard de Estatísticas | ~1.5h | ~2h | ~30min |
| **Total** | **~2.5h** | **~3.5h** | **~1h** |

---

## Critérios de Aceitação

### Feature 4 — Participantes
- [ ] Admin vê todos os participantes com estatísticas em tempo real
- [ ] Admin consegue remover qualquer participante (exceto a si mesmo)
- [ ] Ao remover, todos os palpites do participante são removidos em cascata
- [ ] Rota protegida — não-admins recebem 403

### Feature 5 — Estatísticas
- [ ] Dashboard exibe métricas de overview atualizadas
- [ ] Tabela de engajamento por participante com % de cobertura
- [ ] Distribuição de pontuações (exato/resultado+saldo/resultado/erro)
- [ ] Lista dos jogos mais e menos palpitados
- [ ] Rota protegida — não-admins recebem 403
