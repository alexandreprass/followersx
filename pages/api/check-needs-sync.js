// pages/api/check-needs-sync.js
// VERSÃO CORRIGIDA - Protege contra JSON.parse de valores vazios
import { validateAndRefreshAuth } from '../../lib/auth-middleware';
import redis from '../../lib/redis';

export default async function handler(req, res) {
  try {
    // Valida autenticação
    const auth = await validateAndRefreshAuth(req, res);
    
    if (!auth.isValid) {
      return res.status(401).json({ error: auth.error || 'Não autenticado' });
    }

    const userId = auth.userId;
    
    console.log(`[check-needs-sync] Verificando sync para userId: ${userId}`);
    
    // Verifica se tem dados do usuário
    const userData = await redis.hgetall(`user:${userId}`);
    
    console.log(`[check-needs-sync] userData:`, userData);
    
    // Verifica se tem lista de seguidores
    const followersList = await redis.get(`followers:${userId}:list`);
    
    console.log(`[check-needs-sync] followersList raw:`, followersList ? `${followersList.length} chars` : 'null');
    
    // ✅ CORREÇÃO: Proteger contra JSON.parse de string vazia ou null
    let hasFollowers = false;
    let followersCount = 0;
    
    if (followersList && followersList.trim() !== '') {
      try {
        const parsed = JSON.parse(followersList);
        hasFollowers = Array.isArray(parsed) && parsed.length > 0;
        followersCount = hasFollowers ? parsed.length : 0;
        console.log(`[check-needs-sync] Parsed followers: ${followersCount}`);
      } catch (parseError) {
        console.error(`[check-needs-sync] Erro ao parsear followers:`, parseError.message);
        hasFollowers = false;
        followersCount = 0;
      }
    }
    
    // Precisa fazer sync se:
    // 1. Flag needs_sync está true
    // 2. Não tem lista de seguidores
    // 3. Nunca fez sync antes (last_sync ausente)
    const needsSync = 
      userData.needs_sync === 'true' || 
      !hasFollowers || 
      !userData.last_sync;
    
    console.log(`[check-needs-sync] Resultado: needsSync=${needsSync}, hasFollowers=${hasFollowers}, lastSync=${userData.last_sync}`);
    
    res.json({
      needsSync,
      hasFollowers,
      lastSync: userData.last_sync || null,
      followersCount,
    });
    
  } catch (error) {
    console.error('[check-needs-sync] Erro:', error.message);
    console.error('[check-needs-sync] Stack:', error.stack);
    res.status(500).json({ 
      error: 'Erro ao verificar sincronização',
      details: error.message 
    });
  }
}