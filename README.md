# 🏆 Bolão da Família - Copa do Mundo 2026

Um sistema de bolão moderno, responsivo e seguro para palpites de placar da Copa do Mundo de 2026, projetado especialmente para uso familiar e pequenos grupos.

---

## 🧱 O Alicerce do Projeto: 100% Gratuito e Funcional

A regra mais crucial e fundacional deste projeto é que **o deploy em produção deve ser totalmente gratuito e funcional**, sem qualquer custo ou necessidade de planos pagos. Para cumprir essa premissa máxima de arquitetura, o sistema foi desenhado de forma a se manter estritamente dentro dos limites das camadas gratuitas (Free Tiers) dos seguintes serviços:

* **Frontend & Serverless API (Vercel - Hobby Tier):** Hospedagem gratuita com limite generoso de tráfego de dados (100 GB/mês) e horas de processamento de funções serverless.
* **Banco de Dados Relacional & Autenticação (Supabase - Free Tier):** PostgreSQL gerenciado com 500 MB de armazenamento em disco e sistema completo de autenticação de usuários (Supabase Auth) para login seguro.
* **Resultados de Futebol (Football-Data.org - Free Tier):** API de esportes gratuita que fornece os placares oficiais em tempo real (limite de 10 chamadas/min).

Para mais detalhes técnicos e estratégias implementadas para evitar custos (como limite do pool de conexões do banco de dados e algoritmo de caching/lazy sync da API de futebol), leia o arquivo de documentação [docs/INFRAESTRUTURA_GRATUITA.md](file:///Users/luisabrantes/Documents/Code/familyWorldCup/docs/INFRAESTRUTURA_GRATUITA.md).

---

## 🛠️ Tecnologias Utilizadas

* **Framework:** [Next.js 16](https://nextjs.org/) (App Router, Serverless Functions)
* **Banco de Dados, ORM & Auth:** PostgreSQL, Supabase Auth ([Supabase](https://supabase.com/)) & [Drizzle ORM](https://orm.drizzle.team/)
* **Estilização:** Vanilla CSS customizado + [Tailwind CSS v4](https://tailwindcss.com/)
* **API de Resultados:** [Football-Data.org API v4](https://www.football-data.org/)
* **Testes:** [Vitest](https://vitest.dev/)

---

## 🚀 Como Executar Localmente

### 1. Clonar e Instalar Dependências
```bash
git clone https://github.com/luisabrantes/familyWorldCup.git
cd familyWorldCup
npm install
```

### 2. Configurar Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto com o seguinte conteúdo (veja `.env.example` para referência):

```bash
# Supabase Credentials & Auth
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_pub_...

# Database Connection (Direct Connection String)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres

# Football Data API Key
FOOTBALL_DATA_API_KEY=your_football_data_token

# Admin User IDs (Supabase UUIDs separated by comma)
ADMIN_USER_IDS=uuid_123,uuid_456
```

### 3. Executar Migrações do Banco de Dados
Sincronize o schema local do Drizzle com o seu banco de dados Supabase:
```bash
npm run db:push
```

### 4. Rodar o Servidor de Desenvolvimento
```bash
npm run dev
```
Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

### 5. Rodar Testes Unitários e Integração
```bash
npm run test
```

---

## 📦 Deploy em Produção (Vercel)

1. Conecte seu repositório do GitHub no painel do [vercel.com](https://vercel.com).
2. Adicione as mesmas variáveis de ambiente configuradas no seu `.env.local` nas configurações do projeto na Vercel (**Project Settings -> Environment Variables**).
3. Faça o deploy. O Next.js será compilado automaticamente.
4. **Importante:** Configure as URLs de redirecionamento corretas no dashboard do Supabase (Authentication -> URL Configuration) para permitir que o fluxo de login e verificação funcione adequadamente em produção.
