// pages/api/check-needs-sync.js
// Verifica se o usuário precisa fazer sincronização inicial
import { validateAndRefreshAuth, getUserFromCache } from '../../lib/auth-middleware';
import redis from '../../lib/redis';

export default async function handler(req, res) {
  try {
    // Valida autenticação
    const auth = await validateAndRefreshAuth(req, res);
    
    if (!auth.isValid) {
      return res.status(401).json({ error: auth.error || 'Não autenticado' });
    }

    const userId = auth.userId;
    
    // Verifica se tem dados do usuário
    const userData = await redis.hgetall(`user:${userId}`);
    
    // Verifica se tem lista de seguidores
    const followersList = await redis.get(`followers:${userId}:list`);
    const hasFollowers = followersList && JSON.parse(followersList).length > 0;
    
    // Precisa fazer sync se:
    // 1. Flag needs_sync está true
    // 2. Não tem lista de seguidores
    // 3. Nunca fez sync antes (last_sync ausente)
    const needsSync = 
      userData.needs_sync === 'true' || 
      !hasFollowers || 
      !userData.last_sync;
    
    res.json({
      needsSync,
      hasFollowers,
      lastSync: userData.last_sync || null,
      followersCount: hasFollowers ? JSON.parse(followersList).length : 0,
    });
    
  } catch (error) {
    console.error('[check-needs-sync] Erro:', error);
    res.status(500).json({ error: error.message });
  }
}