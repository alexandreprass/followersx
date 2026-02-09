# 🚀 DEPLOY RÁPIDO - 5 MINUTOS

## ✅ MÉTODO MAIS FÁCIL (Recomendado)

### Passo 1: Criar repositório no GitHub

1. Acesse: https://github.com/new
2. Nome do repositório: `twitter-unfollowers`
3. Deixe como **privado** (para proteger suas credenciais)
4. Clique em "Create repository"

### Passo 2: Upload do código

**Opção A - Via Interface Web (Mais Fácil):**

1. Baixe o arquivo `twitter-unfollowers.zip`
2. Extraia os arquivos
3. No GitHub, clique em "uploading an existing file"
4. Arraste TODOS os arquivos da pasta extraída
5. Commit!

**Opção B - Via Terminal:**

```bash
# Navegue até a pasta do projeto
cd twitter-unfollowers

# Inicialize o git
git init
git add .
git commit -m "Initial commit"
git branch -M main

# Conecte com seu repositório (substitua SEU-USUARIO)
git remote add origin https://github.com/SEU-USUARIO/twitter-unfollowers.git
git push -u origin main
```

### Passo 3: Deploy no Vercel

1. Acesse: https://vercel.com/new
2. Clique em "Import Git Repository"
3. Selecione `twitter-unfollowers`
4. **IMPORTANTE:** Antes de clicar em Deploy, adicione as variáveis de ambiente:

```
Environment Variables:

Nome: TWITTER_CLIENT_ID
Valor: czFxUEptd3Y5SlhxQmpEQkJBTng6MTpjaQ

Nome: TWITTER_CLIENT_SECRET  
Valor: oInKsBNj3JfTIrtz7C6WiI66WEbTyJbZpZHKJUj4BrJwkeLwZA

Nome: NEXT_PUBLIC_APP_URL
Valor: (deixe em branco por enquanto)
```

5. Clique em **"Deploy"**
6. Aguarde 2-3 minutos

### Passo 4: Configurar URL

Depois que o deploy terminar, o Vercel te dará uma URL tipo:
`https://twitter-unfollowers-abc123.vercel.app`

1. Copie essa URL
2. Vá em **Settings** → **Environment Variables**
3. Edite `NEXT_PUBLIC_APP_URL`
4. Cole a URL que você copiou
5. Clique em **Save**
6. Vá em **Deployments**
7. Clique em **"Redeploy"** no último deployment

### Passo 5: Configurar Twitter Developer Portal

1. Acesse: https://developer.twitter.com/en/portal/dashboard
2. Vá no seu App
3. Settings → User authentication settings → Edit
4. Atualize:

```
Callback URI / Redirect URL: https://SUA-URL.vercel.app/api/callback
Website URL: https://SUA-URL.vercel.app
```

5. Salve

### Passo 6: TESTAR! 🎉

Acesse sua URL e clique em "Conectar com Twitter/X"

---

## 🆘 PROBLEMAS COMUNS

### Erro: "Callback URL mismatch"
→ Certifique que a URL no Twitter Developer Portal está EXATAMENTE igual à do Vercel

### Erro: "Invalid client"  
→ Verifique se as variáveis de ambiente foram adicionadas no Vercel
→ Faça um Redeploy

### Build falhou
→ Verifique se TODOS os arquivos foram enviados para o GitHub
→ Principalmente: package.json, next.config.js, e a pasta pages/

---

## ⚡ ATALHO - Deploy Direto pelo Vercel

Se você tem acesso ao Vercel CLI instalado na sua máquina:

```bash
# Na pasta do projeto
npm install -g vercel
vercel login
vercel --prod

# Siga as instruções no terminal
# Adicione as variáveis de ambiente quando solicitado
```

---

## 📞 Precisa de ajuda?

1. Verifique o arquivo `README.md` para documentação completa
2. Verifique o arquivo `DEPLOY.md` para troubleshooting detalhado
3. Veja os logs de erro no Vercel Dashboard → Deployments → View Function Logs

---

**PRONTO!** Seu site estará no ar em menos de 5 minutos! 🚀
