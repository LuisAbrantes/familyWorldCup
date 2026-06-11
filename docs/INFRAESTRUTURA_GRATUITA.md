# Pilares da Infraestrutura 100% Gratuita e Funcional

Este documento serve como a especificação de arquitetura e alicerce do projeto do Bolão da Família Copa 2026. O objetivo principal do design técnico é garantir que o sistema opere em produção de forma **totalmente gratuita**, sem abrir mão de segurança, velocidade e integridade de dados.

---

## 🏗️ A Arquitetura do Projeto

O Bolão foi estruturado usando serviços modernos (Modern Web Stack) que oferecem limites generosos em suas camadas gratuitas (Free Tiers), ideais para projetos familiares e pequenos grupos.

```mermaid
graph TD
    User[Navegador do Familiar] -->|Autenticação| SupabaseAuth[Supabase Auth <br> (Free: 50.000 usuários)]
    User -->|Acesso HTTPS| Vercel[Vercel Frontend & Serverless<br>(Free Hobby Tier)]
    Vercel -->|Drizzle ORM / Conexão Pooled| Supabase[Supabase Postgres DB<br>(Free Tier: 500MB / 60 conexões)]
    Vercel -->|Lazy Sync / 10 req/min limit| FootballData[Football-Data.org API<br>(Free Tier: 10 req/min)]
```

---

## 📊 Análise das Camadas Gratuitas (Free Tiers) e Limites

Abaixo estão detalhados os limites de cada serviço parceiro da nossa infraestrutura e por que o Bolão **nunca** excederá a faixa gratuita:

### 1. Frontend & API Routes (Vercel Hobby Tier)
O Next.js é hospedado na Vercel no plano **Hobby** (Gratuito).
* **Limites Gratuitos:**
  * **Bandwidth (Tráfego):** 100 GB/mês.
  * **Serverless Execution:** 100 GB-horas por mês.
  * **Serverless Timeout:** 10 segundos por chamada de API (nossos endpoints respondem em média em menos de 200ms).
* **Por que é seguro para a nossa família:** O tráfego de dados do Bolão é puramente textual (placar e nomes). Mesmo com 20 familiares acessando diariamente durante a Copa, o tráfego estimado não passará de **1 GB/mês** (menos de 1% do limite).

### 2. Banco de Dados & Autenticação (Supabase Free Tier)
Utilizamos o banco de dados relacional PostgreSQL e o serviço de autenticação integrados na Supabase.
* **Limites Gratuitos:**
  * **Armazenamento de Banco (Database Storage):** 500 MB.
  * **Usuários Ativos Mensais (Supabase Auth MAU):** Até 50.000 usuários gratuitos.
  * **Conexões Simultâneas (Direct Connections):** 60 conexões.
* **Por que é seguro para a nossa família:**
  * **Volume de dados:** O banco de dados do Bolão é extremamente leve. Há 104 jogos fixos. Cada palpite ocupa cerca de 80 bytes. Mesmo que 30 pessoas deem palpites em todos os 104 jogos, o banco terá cerca de 3.000 linhas de palpites, o que consome menos de **2 MB** no disco do Supabase (menos de 0.5% do limite de 500MB).
  * **Autenticação:** O Supabase Auth gerencia de forma segura todos os logins, senhas, tokens JWT e recuperação de senha. Com 50.000 usuários gratuitos de limite, estamos muito além do necessário para um bolão familiar ou corporativo.
  * **Otimização de Conexão:** Em ambientes Serverless (como a Vercel), instâncias são criadas e destruídas rapidamente, o que poderia esgotar o limite de 60 conexões simultâneas da Supabase. Para blindar o projeto contra isso, configuramos o cliente Postgres do Drizzle (`src/db/index.ts`) para limitar o pool a no máximo **1 conexão ativa** por servidor (`{ max: 1 }`). Isso garante que a Supabase nunca chegue perto do limite de conexões.

### 3. API de Resultados de Futebol (Football-Data.org)
API externa que fornece os placares atualizados e os horários das partidas em tempo real.
* **Limites Gratuitos:**
  * **Requisições (Rate Limit):** Máximo de 10 requisições por minuto.
* **Por que é seguro para a nossa família:**
  * **Algoritmo de Lazy Sync:** Para não esgotar as 10 chamadas por minuto ao carregar a página principal, implementamos um sistema de cache no banco de dados (`src/lib/syncService.ts`). Quando qualquer usuário abre o site, o servidor lê a última sincronização. O banco de dados serve como cache por 60 segundos. O sistema só consome 1 chamada de API externa se a última sincronização tiver mais de 1 minuto de idade.
  * **Controle de Spam:** Mesmo se 20 pessoas atualizarrem o site no mesmo segundo, apenas **uma única chamada** será feita para a API externa (o primeiro usuário aciona a atualização e os outros 19 são servidos instantaneamente pelo banco local atualizado).

---

## 🛠️ Boas Práticas Mantidas no Código para Garantia do Custo Zero

1. **Evitar Scripts de Polling Continuo:** Não utilizamos chamadas cíclicas infinitas (`setInterval`) para atualizar dados na tela no frontend. As atualizações acontecem sob demanda (quando o usuário recarrega a página ou executa uma ação de salvar/classificar).
2. **Consultas com JOIN Otimizados:** Todas as rotas sociais de palpites e o painel administrativo puxam informações agregadas em consultas simples no Drizzle ORM, evitando sobrecarga na CPU da Supabase.
3. **Imagens Externas via URLs Leves:** As bandeiras dos times (*crests*) são links leves fornecidos pela própria API e hospedados em CDNs externos, poupando a largura de banda de upload da Vercel.

---

## 🚀 Como Fazer o Deploy sem Custo em 3 Passos

1. **Supabase (Banco & Auth):** Crie um projeto gratuito na Supabase, copie a URI de conexão (Transaction ou Direct Connection) e cole no seu `.env.production` sob a variável `DATABASE_URL`. Obtenha também a URL do projeto e a chave anônima para a autenticação.
2. **Vercel (Frontend & API):** Conecte seu repositório do GitHub na Vercel. A plataforma detecta automaticamente as rotas Next.js e compila o projeto. Insira as variáveis de ambiente em **Project Settings -> Environment Variables**.
3. **Configuração de Redirecionamento:** No console do Supabase (Authentication -> URL Configuration), configure a URL do seu deploy da Vercel como URL permitida para redirecionamento.
utomaticamente as rotas Next.js e compila o projeto. Insira as variáveis de ambiente em **Project Settings -> Environment Variables**.
