# 📊 Twitter Unfollowers Tracker

Aplicação para rastrear quem deixou de seguir você no Twitter/X, ver quem não te segue de volta e gerenciar seus seguidores.

## 🚀 Funcionalidades

- ✅ Login com Twitter/X OAuth 2.0
- ✅ Dashboard com estatísticas em tempo real
- ✅ Detectar quem deixou de te seguir
- ✅ Histórico de unfollowers dos últimos 30 dias
- ✅ Ver quem não te segue de volta
- ✅ Deixar de seguir em massa (unfollow bulk)

## 🔧 Configuração

### 1. Pré-requisitos

- Node.js 18+ instalado
- Conta no Twitter Developer Portal
- Conta no Vercel

### 2. Configuração do Twitter Developer Portal

1. Acesse https://developer.twitter.com/en/portal/dashboard
2. Crie um novo App (ou use um existente)
3. Em "User authentication settings", configure:
   - **App permissions**: Read and Write
   - **Type of App**: Web App
   - **Callback URL**: `https://seu-dominio.vercel.app/api/callback`
   - **Website URL**: `https://seu-dominio.vercel.app`
4. Copie suas credenciais:
   - Client ID
   - Client Secret

### 3. Variáveis de Ambiente

As credenciais já estão configuradas no arquivo `.env.local`:

```bash
TWITTER_CLIENT_ID=czFxUEptd3Y5SlhxQmpEQkJBTng6MTpjaQ
TWITTER_CLIENT_SECRET=oInKsBNj3JfTIrtz7C6WiI66WEbTyJbZpZHKJUj4BrJwkeLwZA
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**IMPORTANTE**: Após o deploy no Vercel, atualize `NEXT_PUBLIC_APP_URL` com sua URL de produção.

### 4. Instalação Local

```bash
npm install
npm run dev
```

Acesse: http://localhost:3000

## 📦 Deploy no Vercel

### Opção 1: Via Vercel CLI

```bash
# Instale a CLI do Vercel
npm i -g vercel

# Faça login
vercel login

# Deploy
vercel
```

### Opção 2: Via Interface Web

1. Faça commit do código no GitHub
2. Acesse https://vercel.com
3. Importe o repositório
4. Configure as variáveis de ambiente:
   - `TWITTER_CLIENT_ID`
   - `TWITTER_CLIENT_SECRET`
   - `NEXT_PUBLIC_APP_URL` (sua URL do Vercel)
5. Deploy!

### Configurar Variáveis de Ambiente no Vercel

1. Acesse seu projeto no Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione:
   - `TWITTER_CLIENT_ID` = `czFxUEptd3Y5SlhxQmpEQkJBTng6MTpjaQ`
   - `TWITTER_CLIENT_SECRET` = `oInKsBNj3JfTIrtz7C6WiI66WEbTyJbZpZHKJUj4BrJwkeLwZA`
   - `NEXT_PUBLIC_APP_URL` = `https://seu-app.vercel.app`

### Atualizar Callback URL

Depois do deploy, atualize no Twitter Developer Portal:
- **Callback URL**: `https://seu-app.vercel.app/api/callback`
- **Website URL**: `https://seu-app.vercel.app`

## 🎯 Como Usar

1. **Login**: Clique em "Conectar com Twitter/X"
2. **Dashboard**: Veja suas estatísticas
3. **Unfollowers**: Veja quem deixou de te seguir nos últimos 30 dias
4. **Não me segue de volta**: 
   - Clique no menu lateral
   - O site busca todos que você segue
   - Mostra quem não te segue de volta
   - Clique em "Deixar de seguir todos" para unfollow em massa

## 📊 Armazenamento de Dados

Os dados são armazenados:
- **Localmente** (navegador): Lista de seguidores e histórico de unfollows
- **Comparação**: Toda vez que você acessa, o site compara com os dados anteriores
- **Histórico**: Mantém registro dos últimos 30 dias automaticamente

## 🔒 Segurança

- ✅ Credenciais em variáveis de ambiente
- ✅ `.gitignore` configurado para não expor `.env`
- ✅ Tokens OAuth armazenados com HttpOnly cookies
- ✅ Rate limiting respeitado (1s entre cada unfollow)

## ⚠️ Limitações da API do Twitter

- Rate limits aplicam-se
- Máximo de 1000 resultados por requisição
- Delay de 1s entre unfollows para evitar bloqueio

## 📝 Notas

- O site compara seguidores atuais com anteriores automaticamente
- Histórico é limpo após 30 dias
- Use o botão "Atualizar dados" para forçar nova verificação

## 🆘 Suporte

Se tiver problemas:
1. Verifique as credenciais do Twitter
2. Confirme que o callback URL está correto
3. Verifique as permissões do app (Read and Write)
4. Veja os logs no Vercel para erros

---

Desenvolvido com ❤️ usando Next.js e Twitter API v2
