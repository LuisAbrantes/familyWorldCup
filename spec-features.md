# Spec: Features

User stories e critérios de aceite no formato Dado / Quando / Então. Cada critério deve virar um teste (Vitest para lógica, Playwright para fluxo de tela).

## F1. Login

**User story**: como participante, quero entrar com minha conta para que meus palpites fiquem ligados a mim.

Critérios de aceite:
- Dado que não estou logado, quando acesso qualquer rota protegida (jogos, palpites, ranking), então sou redirecionado para o login do Clerk.
- Dado que faço login pela primeira vez, quando entro no app, então um registro em `users` é criado (ou recuperado) a partir do meu `clerkUserId`, com `displayName` vindo do meu perfil do Clerk.
- Dado que já tenho perfil, quando faço login de novo, então nenhum registro duplicado é criado.

## F2. Listagem de jogos

**User story**: como participante, quero ver todos os jogos da Copa organizados, para saber em quais posso palpitar.

Critérios de aceite:
- Dado que estou logado, quando abro a tela de jogos, então vejo todos os jogos da Copa vindos de `/api/matches`.
- Os jogos são agrupados de forma legível por fase, e na fase de grupos também por grupo.
- Cada jogo mostra os dois times (nome e escudo quando disponível), a data e hora em horário de Brasília, e o status.
- Para jogos FINISHED, o placar real é exibido.
- Para jogos em que já dei palpite, meu palpite aparece junto do jogo.
- Dado que a API está fora do ar, quando abro a tela, então ainda vejo os últimos dados salvos no banco, sem erro de tela.

## F3. Registrar e editar palpite

**User story**: como participante, quero registrar e mudar meu palpite de placar até o jogo começar, para tentar acertar o resultado.

Critérios de aceite:
- Dado um jogo com status SCHEDULED ou TIMED cujo horário ainda não chegou, quando informo gols do mandante e do visitante e salvo, então o palpite é gravado e fica visível para mim.
- Dado que já tenho palpite naquele jogo, quando edito e salvo, então o palpite é atualizado (não cria um segundo), e `updatedAt` muda.
- Os campos de gols só aceitam inteiros maiores ou iguais a zero.
- Dado um jogo já iniciado (horário passou, ou status IN_PLAY/PAUSED/FINISHED), quando tento criar ou editar palpite, então a operação é recusada pelo servidor com mensagem clara, mesmo que o cliente tente forçar.
- Um usuário nunca vê nem edita o palpite de outro usuário antes do jogo começar.

## F4. Motor de pontuação

**User story**: como participante, quero que meus pontos sejam calculados sozinhos quando o jogo acaba, para não ter conferência manual.

Critérios de aceite (detalhe e tabela-verdade no spec de arquitetura, seção 6):
- Dado um jogo que passou a FINISHED com placar real, quando ocorre a sincronização, então todo palpite daquele jogo recebe `pointsAwarded` conforme as regras.
- A função de pontuação é pura e tem teste unitário cobrindo as oito linhas da tabela-verdade.
- Recalcular um jogo já pontuado não altera o resultado (idempotência): rodar a sincronização duas vezes seguidas para o mesmo jogo FINISHED produz os mesmos pontos.

## F5. Ranking

**User story**: como participante, quero ver o ranking da família, para saber quem está ganhando.

Critérios de aceite:
- Dado que estou logado, quando abro o ranking, então vejo todos os participantes ordenados pela soma de `pointsAwarded`, do maior para o menor.
- O ranking mostra nome e total de pontos de cada um.
- Empate em pontos é exibido de forma estável (mesma ordem entre recarregamentos, por exemplo desempatando por nome).
- Meu próprio nome é destacado no ranking.

## F6. Sincronização automática de dados

**User story**: como organizador, quero que jogos e resultados atualizem sozinhos, para não mexer em nada durante a Copa.

Critérios de aceite:
- A sincronização acontece de forma lazy na leitura de `/api/matches`, com TTL de 60 segundos (ver spec de arquitetura, seção 5).
- O app nunca faz mais que cerca de uma chamada por minuto à API externa, independente do número de acessos simultâneos.
- O cliente respeita os headers de rate limit e faz backoff em 429.
- A atribuição "Football data provided by the Football-Data.org API" aparece no rodapé.

## F7. Admin (pós-MVP)

**User story**: como organizador, quero forçar uma atualização e um recálculo quando precisar, para corrigir algo manualmente.

Critérios de aceite:
- Dado que meu ID está em `ADMIN_USER_IDS`, quando chamo `POST /api/sync`, então a sincronização e o recálculo rodam ignorando o TTL.
- Dado que não sou admin, quando chamo `POST /api/sync`, então recebo 403.

## Plano de testes

Vitest (unidade):
- Motor de pontuação: as oito linhas da tabela-verdade, mais idempotência.
- Trava de palpite: a checagem de janela (status e horário) aceita o que deve e recusa o que deve.
- Upsert de jogos: um jogo novo é inserido, um jogo existente é atualizado sem duplicar.

Playwright (ponta a ponta), nos fluxos críticos:
- Login redireciona e cria o perfil.
- Participante dá palpite num jogo futuro e vê o palpite salvo após recarregar.
- Tentar palpitar num jogo já iniciado é bloqueado.
- Após um jogo terminar (cenário com dados de jogo FINISHED mockados na API), os pontos aparecem no ranking.
- A tela de jogos renderiza a partir do banco mesmo com a API externa simulada como fora do ar.

## Casos de borda a tratar

- Jogo POSTPONED, SUSPENDED ou CANCELLED: não pontua; palpites permanecem até eventual remarcação.
- Participante que entra no meio do torneio: só consegue palpitar em jogos ainda não iniciados.
- Jogo de mata-mata decidido na prorrogação ou pênaltis: pontuar por `score.fullTime` da API (ver spec de arquitetura, seção 7), com a regra documentada na interface.
- Placar nulo antes do fim do jogo: `homeScore` e `awayScore` ficam nulos até FINISHED; a tela não deve quebrar com nulos.
