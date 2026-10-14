# SunMaker Dashboard

Este é o projeto do dashboard **SunMaker**, focado em gestão de margem de lucro. O design é focado na cor preta com animações de caixa.

## Como subir para o GitHub e Vercel

1. **GitHub:**
   - Crie um repositório vazio no seu GitHub.
   - No terminal, dentro da pasta do projeto, rode:
     ```bash
     git init
     git add .
     git commit -m "Commit inicial SunMaker"
     git branch -M main
     git remote add origin URL_DO_SEU_REPOSITORIO
     git push -u origin main
     ```

2. **Vercel:**
   - Acesse [Vercel](https://vercel.com/) e faça login com seu GitHub.
   - Clique em "Add New..." > "Project".
   - Importe o repositório do SunMaker que você acabou de criar.
   - Adicione as variáveis de ambiente (Environment Variables) do Supabase antes de clicar em "Deploy".

3. **Supabase (Banco de Dados):**
   - Crie um projeto no [Supabase](https://supabase.com/).
   - Vá em Settings > API e pegue a sua `Project URL` e `anon public key`.
   - Crie um arquivo `.env.local` na raiz deste projeto com:
     ```
     NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
     NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
     ```
   - Vá no SQL Editor do Supabase e crie a tabela de produtos:
     ```sql
     CREATE TABLE products (
       id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
       name TEXT NOT NULL,
       cost numeric NOT NULL,
       margin numeric,
       is_new boolean DEFAULT true,
       created_at timestamp with time zone default timezone('utc'::text, now()) NOT NULL
     );
     ```

## Instalação Local

```bash
npm install
npm run dev
```
