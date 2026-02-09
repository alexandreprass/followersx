#!/bin/bash

# Script para configurar e fazer deploy no Vercel

echo "🚀 Configurando projeto para deploy no Vercel..."
echo ""

# Criar diretório .vercel se não existir
mkdir -p .vercel

# Criar configuração do projeto
cat > .vercel/project.json << 'EOFPROJECT'
{
  "orgId": "team_UTf5NmTYzBQNVNzw3nJk2BUq",
  "projectId": "",
  "settings": {
    "framework": "nextjs"
  }
}
EOFPROJECT

echo "✅ Configuração criada!"
echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo ""
echo "1. Instale a Vercel CLI:"
echo "   npm install -g vercel"
echo ""
echo "2. Faça login:"
echo "   vercel login"
echo ""
echo "3. Deploy:"
echo "   vercel --prod"
echo ""
echo "4. Durante o deploy, quando perguntar sobre variáveis de ambiente, adicione:"
echo "   TWITTER_CLIENT_ID=czFxUEptd3Y5SlhxQmpEQkJBTng6MTpjaQ"
echo "   TWITTER_CLIENT_SECRET=oInKsBNj3JfTIrtz7C6WiI66WEbTyJbZpZHKJUj4BrJwkeLwZA"
echo "   NEXT_PUBLIC_APP_URL=(sua URL do Vercel)"
echo ""
echo "5. Após o deploy, atualize no Twitter Developer Portal:"
echo "   Callback URL: https://SEU-APP.vercel.app/api/callback"
echo ""
