# Documentação: Exibição de Nome e E-mail no Painel Administrativo

Este documento registra as modificações realizadas no sistema de bolão para permitir que o administrador consiga identificar cada participante tanto pelo seu **Apelido (Nick do ranking)** quanto pelo seu **E-mail / Nome de Cadastro**.

---

## 📋 Contexto e Necessidade
Anteriormente, o painel administrativo exibia apenas o `displayName` (o nome de exibição escolhido no ranking). Isso dificultava a identificação exata dos participantes no banco de dados e no controle do bolão. Agora, o sistema armazena o e-mail oficial de cadastro do Supabase Auth e o exibe no painel do administrador.

---

## 🛠️ Alterações Realizadas

### 1. Banco de Dados & Schema (`src/db/schema.ts`)
- Adicionada a coluna `email: text("email")` à tabela `users` do banco de dados (via migração/query direta e atualizada no schema Drizzle).
- [Link para o arquivo](file:///Users/luisabrantes/Documents/Code/familyWorldCup/src/db/schema.ts#L7)

### 2. Sincronização e Login (`src/lib/auth.ts`)
- O e-mail retornado pelo Supabase Auth é automaticamente salvo e mantido atualizado na tabela local de usuários.
- Sempre que o usuário loga ou carrega a sessão, o e-mail local é atualizado caso tenha sido alterado.
- [Link para o arquivo](file:///Users/luisabrantes/Documents/Code/familyWorldCup/src/lib/auth.ts#L86)

### 3. APIs Administrativas
- **Listagem de Usuários (`src/app/api/admin/users/route.ts`):** O campo `email` foi adicionado à projeção da query Drizzle e é retornado no array de usuários.
- **Estatísticas de Engajamento (`src/app/api/admin/stats/route.ts`):** A listagem de engajamento por participante agora inclui e retorna o e-mail de cada usuário.
- **Testes Unitários:** Todos os testes das rotas foram atualizados para validar o correto envio do campo `email` e continuam passando com sucesso.

### 4. Interface Administrativa (`src/app/page.tsx`)
- **Aba de Gerenciamento de Participantes (`activeAdminTab === "users"`):**
  - Adicionada a coluna **E-mail** na tabela de participantes.
  - O cabeçalho da primeira coluna foi alterado de "Nome" para **Nome (Nick)**.
- **Aba de Estatísticas (`activeAdminTab === "stats"`):**
  - Na tabela "Engajamento por Participante", o **Nome (Nick)** e o **E-mail** foram empilhados de forma elegante e otimizada para dispositivos móveis.
- [Link para o arquivo](file:///Users/luisabrantes/Documents/Code/familyWorldCup/src/app/page.tsx#L1448-L1491)

---

## 🔍 Como Visualizar no Painel Admin

1. Acesse a aba **Admin** no menu superior.
2. Na sub-aba **Participantes**, você verá a tabela estruturada com:
   - **Nome (Nick):** Nome escolhido para exibição no ranking.
   - **E-mail:** E-mail de cadastro da conta.
   - **Palpites / Pontuação / Ações.**
3. Na sub-aba **Estatísticas**, a tabela de engajamento exibirá o e-mail do usuário logo abaixo do nome em letras menores, permitindo fácil auditoria sem esticar a tabela horizontalmente.
