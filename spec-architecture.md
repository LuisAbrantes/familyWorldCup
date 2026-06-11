# Spec: Arquitetura

Documento técnico que acompanha o PRD. Cobre stack, modelo de dados, integração com a football-data.org, motor de pontuação, estratégia de sincronização e deploy.

## 1. Visão geral

App único em Next.js (App Router). O front (React, shadcn/ui) consome apenas as API routes do próprio app. As API routes falam com o Postgres (Neon, via Drizzle) e com a football-data.org. A chave da API e a connection string do banco ficam só no servidor, nunca no cliente.

Regra inviolável: o navegador nunca chama a football-data.org diretamente. Toda chamada externa passa pelo backend, porque a chave não pode vazar e a API não permite chamada direta do browser.

## 2. Variáveis de ambiente

Servidor:
- `DATABASE_URL`: connection string do Postgres do Neon.
- `FOOTBALL_DATA_API_KEY`: chave da football-data.org.
- `ADMIN_USER_IDS`: lista separada por vírgula de UUIDs de usuário do Supabase com permissão de admin.

Cliente (expostas, prefixo público):
- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto do Supabase.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Chave anônima/publicável do Supabase.

## 3. Modelo de dados (Drizzle, Postgres)

Identificadores em camelCase no TypeScript. Três tabelas.

### users
Perfil local espelhando o usuário do Supabase Auth. O Supabase é a fonte de verdade da identidade; aqui guardamos só o necessário para o bolão.
- `id`: serial, primary key.
- `clerkUserId`: text, unique, not null. Guarda o UUID do usuário no Supabase Auth (mantendo o nome físico da coluna para compatibilidade com o banco).
- `displayName`: text, not null. Nome exibido no ranking.
- `createdAt`: timestamp, default now.

### matches
Espelho local dos jogos da Copa, sincronizado da API. Guardar localmente garante que a pontuação não dependa da API estar no ar no momento do cálculo.
- `id`: integer, primary key. É o id do jogo na football-data.org (não gerar id próprio).
- `stage`: text. Ex: GROUP_STAGE, LAST_16, QUARTER_FINALS, SEMI_FINALS, FINAL.
- `groupName`: text, nullable. Ex: "Group A". Nulo em jogos de mata-mata.
- `homeTeamName`: text.
- `awayTeamName`: text.
- `homeTeamCrest`: text, nullable. URL do escudo.
- `awayTeamCrest`: text, nullable.
- `utcDate`: timestamp. Data e hora do jogo em UTC (campo `utcDate` da API).
- `status`: text. Valor do campo `status` da API: SCHEDULED, TIMED, IN_PLAY, PAUSED, FINISHED, POSTPONED, SUSPENDED, CANCELLED.
- `homeScore`: integer, nullable. De `score.fullTime.home`.
- `awayScore`: integer, nullable. De `score.fullTime.away`.
- `lastSyncedAt`: timestamp. Quando este registro foi atualizado pela última vez a partir da API.

### predictions
Palpite de um usuário para um jogo.
- `id`: serial, primary key.
- `userId`: integer, fk para users.id, not null.
- `matchId`: integer, fk para matches.id, not null.
- `predictedHome`: integer, not null. Gols previstos do mandante.
- `predictedAway`: integer, not null. Gols previstos do visitante.
- `pointsAwarded`: integer, nullable. Nulo enquanto o jogo não terminou. Preenchido pelo motor de pontuação.
- `createdAt`: timestamp, default now.
- `updatedAt`: timestamp.
- Restrição: unique em (`userId`, `matchId`). Um palpite por pessoa por jogo.

## 4. Integração com a football-data.org

- Base URL: `https://api.football-data.org/v4`
- Autenticação: header `X-Auth-Token` com o valor de `FOOTBALL_DATA_API_KEY`.
- Endpoint de jogos: `GET /competitions/WC/matches`. Retorna todos os jogos com `id`, `utcDate`, `status`, `stage`, `group`, times e `score.fullTime`.
- Endpoint de classificação (pós-MVP): `GET /competitions/WC/standings`.
- A API por padrão retorna a temporada corrente. Se necessário, forçar com `?season=2026`.
- Atribuição obrigatória (termos de uso): exibir em local visível (rodapé serve) o texto exato: "Football data provided by the Football-Data.org API".

### Rate limit e throttling

O plano grátis permite 10 chamadas por minuto. O mantenedor pede explicitamente que o cliente leia os headers de resposta para se autorregular. Após cada requisição:
- Ler `X-Requests-Available-Minute`: quantas chamadas ainda restam no minuto corrente.
- Ler `X-RequestCounter-Reset`: segundos até o contador resetar.
- Se `X-Requests-Available-Minute` chegar a zero ou ficar muito baixo, aguardar até o reset antes de nova chamada.
- Em resposta com status 429, aplicar backoff respeitando o `X-RequestCounter-Reset`.
- Logar esses dois valores a cada chamada para monitoramento.

## 5. Estratégia de sincronização (sync lazy na leitura)

Não usar cron de alta frequência (a Vercel Hobby limita cron). Em vez disso, revalidar na leitura com TTL.

Fluxo do endpoint `GET /api/matches`:
1. Ler o `lastSyncedAt` mais recente da tabela matches.
2. Se a sincronização mais recente tiver menos de 60 segundos, responder direto do banco (sem tocar na API).
3. Se passou de 60 segundos, chamar `GET /competitions/WC/matches`, fazer upsert de todos os jogos na tabela matches, rodar o motor de pontuação para todo jogo que esteja FINISHED e ainda tenha palpites sem `pointsAwarded`, e então responder do banco.
4. Tratar erro: se a API falhar ou estourar o rate limit, responder com os últimos dados bons do banco (degradação graciosa). Nunca quebrar a tela por causa da API.

Com TTL de 60 segundos, o app chama a API no máximo cerca de uma vez por minuto, independente de quantas pessoas acessem ao mesmo tempo. Fica bem abaixo do limite de 10 por minuto.

Endpoint opcional de admin `POST /api/sync`: força a sincronização e o recálculo, ignorando o TTL. Protegido por checagem de `ADMIN_USER_IDS`.

## 6. Motor de pontuação

Função pura, isolada e coberta por testes unitários (Vitest). Recebe palpite e resultado, devolve pontos. Não acessa banco nem rede.

Assinatura sugerida:
`computePoints(predictedHome, predictedAway, actualHome, actualAway): number`

Regras, avaliadas de cima para baixo (a primeira que casar vence):

1. **Placar exato**: `predictedHome === actualHome && predictedAway === actualAway` → 10 pontos.
2. **Resultado e saldo de gols certos** (mas placar não exato): o resultado (vitória do mandante, empate ou vitória do visitante) bate E o saldo de gols (`predictedHome - predictedAway === actualHome - actualAway`) bate → 7 pontos.
3. **Só o resultado certo**: o resultado bate, mas o saldo não → 5 pontos.
4. **Errou o resultado** → 0 pontos.

Onde "resultado" é o sinal de `home - away`: positivo (mandante vence), zero (empate) ou negativo (visitante vence).

Os valores 10, 7, 5 e 0 devem ficar numa constante de configuração no topo do módulo, fáceis de ajustar caso a família queira outra pontuação.

*Regra Especial do Brasil*: Se o jogo envolver a seleção brasileira (o time mandante ou visitante for `"Brazil"`), a pontuação resultante calculada pelo motor é multiplicada por 2 (o dobro de pontos: Placar Exato = 20 pts, Resultado+Saldo = 14 pts, Resultado Simples = 10 pts, Erro = 0 pts). Isso é processado de forma automática no fluxo de sincronização antes de persistir a pontuação.

### Tabela-verdade (casos de teste do Vitest)

| Previsto | Real | Regra que casa | Pontos |
|----------|------|----------------|--------|
| 2 x 1 | 2 x 1 | placar exato | 10 |
| 1 x 0 | 2 x 1 | resultado + saldo (+1, mandante) | 7 |
| 3 x 2 | 2 x 1 | resultado + saldo (+1, mandante) | 7 |
| 2 x 0 | 2 x 1 | só resultado (mandante, saldo difere) | 5 |
| 0 x 0 | 1 x 1 | resultado + saldo (empate, saldo 0) | 7 |
| 1 x 1 | 1 x 1 | placar exato | 10 |
| 0 x 1 | 2 x 1 | errou resultado (visitante x mandante) | 0 |
| 1 x 2 | 0 x 0 | errou resultado (visitante x empate) | 0 |

Nota conhecida e aceitável: qualquer palpite de empate contra um empate real ganha no mínimo 7 (o saldo de empate é sempre 0). O placar exato de empate ganha 10.

## 7. Regra de mata-mata (decisão a confirmar com a família)

Jogos eliminatórios podem ir para prorrogação ou pênaltis. Decisão padrão do MVP: pontuar usando `score.fullTime` exatamente como a API retorna para o jogo, e tratar isso como resultado oficial. Pênaltis não entram no placar previsto. Documentar esse comportamento na interface para a família combinar. Tratar resultado por tempo regulamentar de 90 minutos não está no MVP.

## 8. Trava de palpite

Regra aplicada no servidor (nunca confiar só no cliente): um palpite só pode ser criado ou editado enquanto o jogo correspondente estiver com `status` SCHEDULED ou TIMED E o horário atual for anterior ao `utcDate`. A partir do início do jogo (ou status IN_PLAY/PAUSED/FINISHED), o palpite fica travado. Toda escrita em `/api/predictions` revalida essa condição antes de gravar.

## 9. Fuso horário

Armazenar e comparar tudo em UTC (`utcDate`). Exibir para o usuário em horário de Brasília (America/Sao_Paulo).

## 10. Deploy (grátis)

1. Código num repositório no GitHub.
2. Banco: criar um projeto grátis no Neon, copiar a `DATABASE_URL`. Rodar as migrations do Drizzle contra ele.
3. Importar o repositório na Vercel (plano Hobby). Definir todas as variáveis de ambiente da seção 2 no painel da Vercel.
4. No painel do Supabase, adicionar o domínio da Vercel nas configurações de Allowed Redirect URIs.
5. Conferir a atribuição da football-data.org no rodapé antes de publicar.

Notas: a Vercel Hobby não dorme e não expira. O Postgres do Neon no plano grátis não expira como o do Render. Evitar Render (Postgres grátis expira em 30 dias inativo e o serviço dorme) e Railway/Fly (viraram trial pago).
