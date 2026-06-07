# Feature: Palpites Sociais (Visibilidade entre Participantes)

## Visão Geral

Transformar o bolão em uma experiência social: os familiares podem ver os palpites uns dos outros, mas com uma regra de spoiler — você só vê o palpite de outra pessoa depois de já ter registrado o seu próprio para aquele jogo.

---

## Regras de Negócio

### Antes do jogo começar (status: SCHEDULED / TIMED)

| Situação | O que o usuário vê dos outros |
|---|---|
| Usuário **ainda não palpitou** para o jogo X | Vê quem **já palpitou** (nome), mas **não vê o placar** |
| Usuário **já palpitou** para o jogo X | Vê o nome **e o placar** do palpite de cada familiar |

### Depois do jogo começar (status: IN_PLAY / PAUSED / FINISHED)

| Situação | O que o usuário vê |
|---|---|
| Jogo em andamento ou encerrado | Todos os palpites ficam **públicos automaticamente**, independente de ter palpitado ou não |

### Resumo da lógica de visibilidade

```
canSeePrediction(viewer, match, targetPrediction):
  if match.status in [IN_PLAY, PAUSED, FINISHED]:
    return true  // jogo já começou, tudo público
  if viewer.hasPredictedFor(match):
    return true  // viewer já deu palpite, pode ver os outros
  return false   // ainda não palpitou, spoiler protegido
```

---

## Impacto no Banco de Dados

Nenhuma alteração de schema necessária. A lógica de visibilidade é inteiramente calculada no backend na hora de montar a resposta da API.

---

## Mudanças na API

### `GET /api/matches`

A resposta atual retorna apenas as previsões do próprio usuário. Deve ser expandida para incluir as previsões de todos os participantes, com a regra de visibilidade aplicada.

**Nova estrutura de resposta:**

```typescript
{
  matches: Match[],
  myPredictions: Record<matchId, Prediction>,  // palpites do usuário logado (sem mudança)
  socialPredictions: {
    [matchId]: SocialMatchPredictions
  }
}

interface SocialMatchPredictions {
  participants: {
    userId: number;
    displayName: string;
    hasPredicted: boolean;       // sempre visível
    prediction: {                // null se canSeePrediction === false
      predictedHome: number | null;
      predictedAway: number | null;
      pointsAwarded: number | null;
    } | null;
  }[]
}
```

**Lógica de montagem no servidor (`GET /api/matches`):**

```typescript
// Para cada match:
// 1. Buscar TODOS os palpites daquele jogo (todas as users)
// 2. Para cada palpite, verificar se o viewer pode ver os scores
//    - se match.status não é SCHEDULED/TIMED → mostrar tudo
//    - se viewer já palpitou aquele jogo → mostrar tudo
//    - senão → mostrar só hasPredicted = true, sem scores

const viewerHasPredicted = (matchId: number) =>
  userPredictions.some(p => p.matchId === matchId);

const isMatchOpen = (status: string) =>
  ['SCHEDULED', 'TIMED'].includes(status);
```

---

## Mudanças na UI

### Aba "Jogos" — Card de cada jogo

Adicionar uma seção **"Palpites da Família"** embaixo de cada match card:

```
┌─────────────────────────────────────────────────────┐
│  FASE DE GRUPOS  •  GROUP A        ⏰ 11 JUN, 16:00 │
│                                                      │
│   🇲🇽 Mexico        VS        South Africa 🇿🇦       │
│                                                      │
├─ Palpites da Família ──────────────────────────────  │
│  👤 Luis Abrantes    ✅ Palpitou   [2 x 1]           │
│  👤 Ana              ✅ Palpitou   [?] aguardando seu │ ← se viewer não palpitou
│  👤 Pedro            ❌ Não palpitou                  │
└─────────────────────────────────────────────────────┘
```

**Estados visuais:**

| Estado | Ícone | Texto exibido |
|---|---|---|
| Familiar palpitou, viewer também | `✅` | `2 x 1` (placar visível) |
| Familiar palpitou, viewer não palpitou | `🔒` | `Palpite oculto` |
| Familiar não palpitou | `—` | `Ainda não palpitou` |
| Jogo já começou | `✅` | `2 x 1` (sempre visível) |

### Aba "Palpites" — Seção social por jogo

Na aba de palpites do usuário, após o formulário de cada jogo, exibir um mini-resumo colapsável:

```
▼ Ver palpites da família (após dar o seu palpite)
  Ana: 1 x 0  |  Pedro: não palpitou  |  João: 2 x 2
```

---

## Fluxo de UX Completo

```
Usuário abre "Jogos"
  └── Para cada jogo:
        ├── Ainda não palpitou?
        │     └── Vê nomes + ícone de cadeado nos palpites dos outros
        │     └── CTA: "Dê seu palpite para ver os palpites da família"
        └── Já palpitou?
              └── Vê todos os palpites com placares
              └── Micro-animação de "revelação" ao salvar o palpite
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---|---|
| `src/app/api/matches/route.ts` | Buscar social predictions + aplicar regra de visibilidade |
| `src/app/page.tsx` | Renderizar seção "Palpites da Família" nos cards |
| `src/db/schema.ts` | Nenhuma mudança necessária |

---

## Estimativa de Implementação

- **Backend**: ~1h (nova query + lógica de visibilidade na API)
- **Frontend**: ~2-3h (componente de social predictions + animações)
- **Testes**: ~1h (novos testes unitários para a lógica de visibilidade)

---

## Critérios de Aceitação

- [ ] Usuário sem palpite para o jogo X vê apenas quem palpitou, sem ver os placares
- [ ] Usuário com palpite para o jogo X vê todos os placares dos familiares
- [ ] Após salvar um palpite, a seção social é revelada com animação
- [ ] Jogos em andamento ou finalizados exibem todos os palpites sem restrição
- [ ] A própria previsão do usuário logado sempre aparece para ele, independente do estado
