#!/bin/bash

echo "🚀 Iniciando deploy no Vercel..."
echo ""

# Verificar se vercel CLI está instalada
if ! command -v vercel &> /dev/null
then
    echo "❌ Vercel CLI não encontrada. Instalando..."
    npm install -g vercel
fi

echo "✅ Vercel CLI encontrada"
echo ""

# Fazer deploy
echo "📦 Fazendo deploy..."
vercel --prod

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "⚠️  IMPORTANTE: Atualize as seguintes configurações:"
echo "1. No Twitter Developer Portal, atualize:"
echo "   - Callback URL: https://SEU-DOMINIO.vercel.app/api/callback"
echo "   - Website URL: https://SEU-DOMINIO.vercel.app"
echo ""
echo "2. No Vercel Dashboard, adicione as variáveis de ambiente:"
echo "   - TWITTER_CLIENT_ID"
echo "   - TWITTER_CLIENT_SECRET"
echo "   - NEXT_PUBLIC_APP_URL (com sua URL do Vercel)"
echo ""
