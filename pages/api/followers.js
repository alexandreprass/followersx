// pages/api/followers.js
// VERSÃO CORRIGIDA - Proteção contra parsing
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
    const followersStr = await redis.get(`followers:${userId}:list`);
    
    let followers = [];
    
    if (followersStr) {
      try {
        // Converte para string se necessário
        const str = typeof followersStr === 'string' 
          ? followersStr 
          : String(followersStr);
        
        if (str.trim() !== '') {
          const parsed = JSON.parse(str);
          if (Array.isArray(parsed)) {
            followers = parsed;
            console.log(`[Followers API] ✅ ${followers.length} seguidores encontrados`);
          } else {
            console.warn('[Followers API] ⚠️ Dados parseados não são um array');
          }
        } else {
          console.log('[Followers API] ℹ️ String vazia no Redis');
        }
      } catch (parseError) {
        console.error('[Followers API] ❌ Erro ao parsear followers:', parseError.message);
      }
    } else {
      console.log('[Followers API] ℹ️ Nenhum dado encontrado no Redis');
    }

    res.json({ 
      followers: followers,
      count: followers.length 
    });

  } catch (error) {
    console.error('[Followers API] ❌ Erro:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar seguidores',
      details: error.message 
    });
  }
}