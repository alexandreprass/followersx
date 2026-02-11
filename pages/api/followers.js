// pages/api/followers.js
// Busca seguidores do Redis (salvos pela sync via TweetAPI)
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
    console.log(`[Followers API] Buscando seguidores do Redis para userId: ${userId}`);

    // Busca seguidores salvos no Redis
    const followersStr = await redis.get(`followers:${userId}:list`);
    
    if (!followersStr) {
      console.log('[Followers API] Nenhum seguidor encontrado no Redis');
      return res.json({ followers: [] });
    }

    const followers = JSON.parse(followersStr);
    console.log(`[Followers API] ${followers.length} seguidores encontrados`);

    res.json({ 
      followers,
      count: followers.length 
    });

  } catch (error) {
    console.error('[Followers API] Erro:', error.message);
    res.status(500).json({ 
      error: 'Erro ao buscar seguidores',
      details: error.message 
    });
  }
}
