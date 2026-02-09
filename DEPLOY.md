# 🎯 GUIA DE DEPLOY - PASSO A PASSO

## ✅ Passo 1: Configurar Twitter Developer Portal

1. Acesse: https://developer.twitter.com/en/portal/dashboard
2. Crie um novo projeto/app ou use um existente
3. Vá em **Settings** → **User authentication settings** → **Set up**
4. Configure:

```
App permissions: Read and Write
Type of App: Web App, Automated App or Bot
App info:
  - Callback URI: https://seu-app.vercel.app/api/callback (atualize depois)
  - Website URL: https://seu-app.vercel.app (atualize depois)
```

5. Salve e copie:
   - ✅ Client ID: `czFxUEptd3Y5SlhxQmpEQkJBTng6MTpjaQ`
   - ✅ Client Secret: `oInKsBNj3JfTIrtz7C6WiI66WEbTyJbZpZHKJUj4BrJwkeLwZA`

*Obs: Suas credenciais já estão salvas nos arquivos!*

---

## ✅ Passo 2: Deploy no Vercel (MÉTODO MAIS FÁCIL)

### Opção A: Via Interface Web (Recomendado)

1. **Criar repositório no GitHub**
   ```bash
   cd /home/claude/twitter-unfollowers
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/twitter-unfollowers.git
   git push -u origin main
   ```

2. **Deploy no Vercel**
   - Acesse: https://vercel.com
   - Clique em **"Add New Project"**
   - Importe seu repositório do GitHub
   - Vercel detecta Next.js automaticamente
   - Clique em **"Deploy"**

3. **Adicionar Variáveis de Ambiente**
   - Vá em **Settings** → **Environment Variables**
   - Adicione uma por uma:

   ```
   Nome: TWITTER_CLIENT_ID
   Valor: czFxUEptd3Y5SlhxQmpEQkJBTng6MTpjaQ
   
   Nome: TWITTER_CLIENT_SECRET
   Valor: oInKsBNj3JfTIrtz7C6WiI66WEbTyJbZpZHKJUj4BrJwkeLwZA
   
   Nome: NEXT_PUBLIC_APP_URL
   Valor: https://SEU-APP.vercel.app (use a URL que o Vercel te deu)
   ```

4. **Redeploy**
   - Vá em **Deployments**
   - Clique nos 3 pontos do último deploy
   - Clique em **"Redeploy"**

### Opção B: Via CLI do Vercel

```bash
# Instalar CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd /home/claude/twitter-unfollowers
vercel

# Seguir as instruções no terminal
# Depois, adicionar variáveis de ambiente via dashboard
```

---

## ✅ Passo 3: Atualizar Twitter Developer Portal

Depois que o Vercel te der uma URL (exemplo: `meu-app.vercel.app`):

1. Volte no Twitter Developer Portal
2. Vá em **Settings** → **User authentication settings**
3. **Edite** e atualize:
   ```
   Callback URI: https://meu-app.vercel.app/api/callback
   Website URL: https://meu-app.vercel.app
   ```
4. Salve

---

## ✅ Passo 4: Testar a Aplicação

1. Acesse sua URL do Vercel
2. Clique em "Conectar com Twitter/X"
3. Autorize o app
4. Pronto! 🎉

---

## 🔧 TROUBLESHOOTING

### Erro: "Callback URL mismatch"
- Certifique-se que a URL no Twitter Developer Portal é EXATAMENTE igual à do Vercel
- Não esqueça o `/api/callback` no final

### Erro: "Invalid client"
- Verifique se as variáveis de ambiente estão corretas no Vercel
- Faça um redeploy após adicionar as variáveis

### Erro: "Unauthorized"
- Verifique se as permissões no Twitter são "Read and Write"
- Regenere as credenciais se necessário

### Deploy falhou
- Verifique os logs no Vercel Dashboard
- Certifique-se que o `package.json` está correto
- Tente fazer deploy novamente

---

## 📱 PRÓXIMOS PASSOS

Depois do deploy funcionando:

1. ✅ Teste o login
2. ✅ Teste a função de unfollowers
3. ✅ Teste "não me segue de volta"
4. ✅ Teste o unfollow em massa

---

## 🎨 PERSONALIZAÇÕES FUTURAS

- Adicionar gráficos de crescimento
- Exportar relatórios em CSV
- Notificações por email
- Tema escuro
- Filtros avançados

---

## ⚠️ IMPORTANTE

**NÃO COMPARTILHE SUAS CREDENCIAIS!**
- As credenciais estão em `.env.local` (ignorado pelo git)
- No Vercel, elas ficam em Environment Variables (seguras)
- Nunca commite arquivos `.env*` no repositório público

---

Qualquer dúvida, consulte o README.md principal!
