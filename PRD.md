# PRD: Bolão da Copa do Mundo 2026 (família)

## 1. Resumo

A web app onde membros de uma família entram com login, registram palpites de placar para cada jogo da Copa do Mundo de 2026, e competem num ranking. Jogos e resultados são puxados automaticamente da API gratuita da football-data.org, sem atualização manual. A pontuação de cada palpite é calculada automaticamente quando o jogo termina.

Este é um projeto pessoal, sem fins comerciais, para uso de uma família (estimado entre 5 e 30 pessoas). O app precisa estar no ar e estável do início ao fim do torneio (11 de junho a 19 de julho de 2026).

## 2. Problema

Acompanhar um bolão na mão (atualizar placares, conferir acertos, somar pontos) é trabalhoso e propenso a erro. O objetivo é automatizar toda a parte de dados e pontuação, deixando para as pessoas só a parte divertida: palpitar e ver o ranking.

## 3. Objetivos

- Puxar e exibir todos os jogos da Copa 2026 (104 partidas, 48 seleções, 12 grupos) automaticamente.
- Permitir que cada pessoa registre e edite palpites de placar até o início de cada jogo.
- Calcular pontos automaticamente quando os jogos terminam, com base em regras de pontuação claras.
- Exibir um ranking sempre atualizado.
- Custo de hospedagem zero, do começo ao fim do torneio.

## 4. Não-objetivos (fora de escopo)

- App mobile nativo (é web responsivo).
- Apostas com dinheiro real ou qualquer transação financeira.
- Placares em tempo real ao segundo (o plano grátis da API entrega resultados com atraso, e isso é aceitável).
- Múltiplos bolões ou múltiplos torneios. O escopo é uma Copa, um bolão, uma família.

## 5. Usuários

- **Participante**: faz login, dá palpites, vê o ranking e seus próprios pontos.
- **Admin (o organizador)**: tudo do participante, mais a capacidade de forçar uma sincronização manual de dados e recalcular pontos se necessário. No MVP, o admin é identificado por uma lista de IDs de usuário em variável de ambiente.

## 6. Stack alvo

- Frontend e backend: Next.js (App Router) com TypeScript. Um app só, API routes como funções serverless.
- UI: shadcn/ui + Tailwind. Textos da interface em português do Brasil.
- Autenticação: Clerk (já em uso, plano grátis, independente de host).
- Banco de dados: PostgreSQL grátis no Neon (Supabase Postgres funciona de forma idêntica como alternativa). ORM: Drizzle.
- Dados de futebol: API da football-data.org, plano grátis (competição WC).
- Testes: Vitest (unidade, foco no motor de pontuação) e Playwright (ponta a ponta).
- Hospedagem: Vercel, plano Hobby (grátis, uso não-comercial permitido).

## 7. Critérios de sucesso

- Um participante consegue logar, dar palpite em qualquer jogo futuro, e ver o palpite salvo.
- Após um jogo terminar, os pontos de todos os palpites daquele jogo aparecem corretos no ranking em no máximo alguns minutos.
- O app não estoura o limite de 10 chamadas por minuto da API, independente de quantas pessoas acessem ao mesmo tempo.
- O app fica no ar de 11 de junho a 19 de julho sem custo e sem precisar de manutenção manual.
- A chave da API nunca aparece no código do front nem no navegador.

## 8. Escopo do MVP (obrigatório antes de 11 de junho)

1. Login via Clerk.
2. Listagem de todos os jogos da Copa, agrupados por fase e grupo, com data/hora em horário de Brasília, status e placar.
3. Registro e edição de palpite de placar por jogo, com trava no início do jogo.
4. Motor de pontuação que calcula pontos quando o jogo está FINISHED.
5. Ranking dos participantes.
6. Proxy de backend para a football-data.org com cache e respeito ao rate limit.
7. Deploy grátis na Vercel com Postgres grátis no Neon.

## 9. Pós-MVP (se sobrar tempo)

- Palpites bônus (campeão, artilheiro) com pontuação própria.
- Tela de classificação dos grupos (standings).
- Página de detalhe do jogo com histórico de palpites de todos (revelado só após o início).
- Botão de admin para forçar sincronização e recálculo.

## 10. Ordem de construção sugerida para o Claude Code

1. Scaffold do Next.js + Tailwind + shadcn/ui + Clerk + Drizzle + Neon. Migrations das tabelas.
2. Camada de integração com a football-data.org (cliente, cache, throttling) e o endpoint de sincronização lazy.
3. Motor de pontuação isolado e testável (Vitest), com a tabela-verdade do spec de arquitetura.
4. Telas: lista de jogos, formulário de palpite, ranking.
5. Trava de palpite no servidor.
6. Testes Playwright dos fluxos principais.
7. Deploy na Vercel e configuração das variáveis de ambiente.

## 11. Riscos e decisões em aberto

- **Regra de mata-mata**: jogos eliminatórios podem ser decididos na prorrogação ou pênaltis. A regra do bolão precisa ser combinada com a família (ver spec de pontuação). Decisão padrão proposta: pontuar pelo placar de `score.fullTime` retornado pela API.
- **Atraso de placar**: o plano grátis não entrega resultado ao vivo instantâneo. Aceitável para o caso de uso.
- **Limite de domínios do Clerk**: ao migrar de host, o novo domínio da Vercel precisa ser adicionado na lista de origens permitidas no painel do Clerk.
