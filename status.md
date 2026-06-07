# Status do Projeto - Bolão Copa do Mundo 2026

Este arquivo descreve o estágio atual do desenvolvimento do sistema de Bolão para a Copa do Mundo de 2026.

## 🚀 Estágio Atual
O desenvolvimento das funcionalidades do MVP foi **concluído** e o projeto está compilando, testado e com as tabelas criadas no banco de dados.

---

## 🛠️ O que foi implementado
1. **Banco de Dados (Supabase + Drizzle ORM)**:
   - Configuração de conexão direta com o banco de dados em `src/db/index.ts`.
   - Schemas definidos em `src/db/schema.ts` para as tabelas `users`, `matches` e `predictions`.
   - As tabelas e chaves estrangeiras foram aplicadas com sucesso no Supabase.
2. **Motor de Pontuação (`src/lib/scoreEngine.ts`)**:
   - Função pura `computePoints` para calcular as pontuações de palpites baseada em regras:
     - Placar exato: **10 pontos**
     - Resultado e Saldo corretos: **7 pontos**
     - Apenas o vencedor correto: **5 pontos**
     - Erro de resultado: **0 pontos**
3. **API do Football-Data (`src/lib/footballApi.ts`)**:
   - Conexão e tratamento de limites de requisição (erro 429 com contagem de reset).
4. **Sincronizador local (`src/lib/syncService.ts`)**:
   - Atualiza dados a cada 60s (lazy caching) e processa os pontos dos palpites dos usuários após cada finalização.
5. **Autenticação (Clerk)**:
   - Middleware configurado em `src/proxy.ts` (Next.js 16).
   - Helper de sincronização local de usuários em `src/lib/auth.ts`.
6. **Rotas de API**:
   - `/api/auth/sync` (sincronizar perfil do Clerk com o banco).
   - `/api/matches` (buscar jogos e palpites do usuário com lazy sync).
   - `/api/predictions` (salvar ou atualizar palpites com trava por início de jogo).
   - `/api/leaderboard` (ranking somado de pontuação de usuários).
   - `/api/sync` (forçar sincronização - exclusivo para administradores).
7. **Interface Gráfica (`src/app/page.tsx`)**:
   - Dashboard completo contendo quatro abas:
     - **Visão Geral**: Regras de pontuação, status do usuário e próximos jogos.
     - **Jogos**: Grid de partidas com inputs de placar (+ e -), feedback de salvamento/bloqueio e a seção **Palpites da Família** colapsável abaixo de cada partida.
     - **Classificação**: Tabela de ranking com medalhas para o top 3 e destaque para o usuário logado.
     - **Painel Admin**: Sub-navegação com três abas:
       - **Sincronização**: Forçar a sincronização de dados diretamente do football-data.org.
       - **Participantes**: Tabela com total de palpites e pontos de cada usuário, com ação de remoção segura (bloqueado para si mesmo).
       - **Estatísticas**: Métricas globais de palpites, cobertura/média de cada participante, distribuição de pontuações (Exato/Saldo/Resultado/Erros) e jogos mais/menos palpitados.
8. **Palpites Sociais com Spoiler Protection**:
   - Lógica de visibilidade implementada no backend (`GET /api/matches`) e consumida no frontend para ocultar palpites de familiares em jogos futuros até que o usuário registre o seu próprio palpite para aquela partida.
9. **Configuração de Testes (`vitest.config.ts`)**:
   - Suporte ao path alias `@/` em arquivos de testes unitários.

---

## 🔑 Configurações do arquivo `.env.local`
O arquivo local `.env.local` está configurado com as chaves funcionais:
- **Supabase**: URL e chave pública do novo projeto `hymhillagghuadjyfzkk`.
- **DATABASE_URL**: String de conexão direta usando a porta `5432` com sucesso.
- **Clerk**: Chaves de desenvolvimento configuradas.
- **Football-Data**: Token de API configurado.

---

## 🧪 Status de Testes e Builds
- **Testes Unitários**: 24 testes passando com sucesso (`npm test`).
- **Build de Produção**: Next.js compila e gera o bundle final sem nenhum erro (`npm run build`).

---

## 🔮 Próximos Passos
1. **Configuração de IDs de Administradores**:
   - Assim que o administrador se registrar no Clerk, adicionar o ID dele na variável `ADMIN_USER_IDS` no `.env.local`.
2. **Hospedar em Produção**:
   - O projeto está pronto para ser hospedado (ex: Vercel). Basta configurar as mesmas variáveis de ambiente de `.env.local` na plataforma de hospedagem.
3. **Monitoramento e Auditoria**:
   - Acompanhar os logs de sincronização durante as rodadas para auditar o motor de pontuação em tempo real.

---

## 🐛 Correções de Bugs Recentes
- **Nomes de times vazios em fases eliminatórias**: Resolvida a falha de constraint `NOT NULL` de banco de dados na inserção e atualização de partidas de fases eliminatórias (onde os times não estão definidos e vêm como `null` da API do `football-data.org`). Implementado fallback para `"A definir"` no arquivo `src/lib/syncService.ts`.
- **Highlighter Turbopack Panic**: Substituídos os divisores de comentários unicode `═` por ASCII padrão `-` para contornar um bug de caractere multi-byte no compilador de Next.js Turbopack.
