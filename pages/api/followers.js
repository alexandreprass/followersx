// pages/api/followers.js
// VERSÃO CORRIGIDA - Trata Buffer corretamente
import redis from '../../lib/redis';
import { validateAndRefreshAuth } from '../../lib/auth-middleware';

export default async function handler(req, res) {
  try {
    // Valida autenticação
    const auth = await validateAndRefreshAuth(req, res);
    
    if (!auth.isValid) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const userId = auth.userId;
    
    console.log(`[Followers API] Buscando followers para userId: ${userId}`);

    // Buscar lista de seguidores do Redis
    const followersData = await redis.get(`followers:${userId}:list`);
    
    let followers = [];
    
    if (followersData) {
      try {
        // 🔧 CORREÇÃO: Trata Buffer corretamente
        let jsonString;
        
        if (Buffer.isBuffer(followersData)) {
          // Se é um Buffer, converte para string UTF-8
          jsonString = followersData.toString('utf8');
          console.log(`[Followers API] ✅ Convertido Buffer para string (${jsonString.length} chars)`);
        } else if (typeof followersData === 'string') {
          // Se já é string, usa diretamente
          jsonString = followersData;
          console.log(`[Followers API] ✅ Já é string (${jsonString.length} chars)`);
        } else {
          // Se é objeto, serializa
          jsonString = JSON.stringify(followersData);
          console.log(`[Followers API] ⚠️ Convertido objeto para JSON`);
        }
        
        if (jsonString && jsonString.trim() !== '') {
          const parsed = JSON.parse(jsonString);
          
          if (Array.isArray(parsed)) {
            followers = parsed;
            console.log(`[Followers API] ✅ ${followers.length} seguidores parseados com sucesso`);
            
            // Log de amostra dos dados
            if (followers.length > 0) {
              console.log(`[Followers API] Exemplo de seguidor:`, JSON.stringify(followers[0]));
            }
          } else {
            console.warn('[Followers API] ⚠️ Dados parseados não são um array:', typeof parsed);
          }
        } else {
          console.log('[Followers API] ℹ️ String vazia ou nula');
        }
      } catch (parseError) {
        console.error('[Followers API] ❌ Erro ao parsear followers:', parseError.message);
        console.error('[Followers API] Tipo recebido:', typeof followersData);
        console.error('[Followers API] É Buffer?', Buffer.isBuffer(followersData));
        
        // Mostra primeiros 100 caracteres para debug
        const preview = Buffer.isBuffer(followersData) 
          ? followersData.toString('utf8').substring(0, 100)
          : String(followersData).substring(0, 100);
        console.error('[Followers API] Preview dos dados:', preview);
      }
    } else {
      console.log('[Followers API] ℹ️ Nenhum dado encontrado no Redis');
    }

    res.json({ 
      followers: followers,
      count: followers.length 
    });

  } catch (error) {
    console.error('[Followers API] ❌ Erro geral:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar seguidores',
      details: error.message 
    });
  }
}