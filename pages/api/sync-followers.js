// pages/api/sync-followers.js
// Sistema híbrido: API Oficial (perfil) + TweetAPI (lista de seguidores)
import { TwitterApi } from 'twitter-api-v2';
import { getAllFollowers, normalizeFollowerData } from '../../lib/tweetapi-client';
import redis from '../../lib/redis';

export default async function handler(req, res) {
  // Apenas método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const accessToken = req.cookies.accessToken;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  try {
    // 1. Buscar dados básicos do perfil via API Oficial (para pegar o userId)
    console.log('[SyncFollowers] Buscando dados do perfil via API Oficial...');
    const client = new TwitterApi(accessToken);
    const { data: me } = await client.v2.me();
    const userId = me.id;
    
    console.log(`[SyncFollowers] UserId obtido: ${userId} (@${me.username})`);

    // 2. Verificar última sincronização (controle de frequência)
    const lastSync = await redis.get(`followers:${userId}:lastSync`);
    
    if (lastSync) {
      const lastSyncDate = new Date(lastSync);
      const hoursSince = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60);
      
      console.log(`[SyncFollowers] Última sincronização: ${lastSyncDate.toISOString()} (${hoursSince.toFixed(1)}h atrás)`);
      
      if (hoursSince < 12) {
        const hoursRemaining = Math.ceil(12 - hoursSince);
        return res.status(429).json({
          error: 'Limite de frequência atingido',
          message: `Você já atualizou recentemente. Volte amanhã ou mais tarde para atualizar novamente!`,
          nextUpdateIn: `${hoursRemaining} horas`,
          lastSync: lastSync,
          canUpdateAt: new Date(lastSyncDate.getTime() + (12 * 60 * 60 * 1000)).toISOString(),
        });
      }
    } else {
      console.log('[SyncFollowers] Primeira sincronização deste usuário.');
    }

    // 3. Buscar lista atual de seguidores via TweetAPI (economiza rate limits da API Oficial)
    console.log('[SyncFollowers] Buscando lista de seguidores via TweetAPI...');
    const currentFollowersRaw = await getAllFollowers(userId);
    
    // Normalizar dados dos seguidores
    const currentFollowers = currentFollowersRaw.map(normalizeFollowerData);
    console.log(`[SyncFollowers] Total de seguidores obtidos via TweetAPI: ${currentFollowers.length}`);
    
    // 4. Pegar lista anterior do Redis
    const previousFollowersStr = await redis.get(`followers:${userId}:list`);
    const previousFollowers = previousFollowersStr ? JSON.parse(previousFollowersStr) : [];
    
    console.log(`[SyncFollowers] Seguidores anteriores no Redis: ${previousFollowers.length}`);
    
    // 5. Detectar unfollowers (quem estava antes e não está mais)
    const prevIds = previousFollowers.map(f => f.id);
    const currentIds = currentFollowers.map(f => f.id);
    const unfollowerIds = prevIds.filter(id => !currentIds.includes(id));
    
    console.log(`[SyncFollowers] Unfollowers detectados: ${unfollowerIds.length}`);
    
    // 6. Salvar unfollowers no histórico (se houver)
    if (unfollowerIds.length > 0) {
      const unfollowerData = previousFollowers
        .filter(f => unfollowerIds.includes(f.id))
        .map(user => ({
          id: user.id,
          name: user.name,
          username: user.username,
          profile_image_url: user.profile_image_url,
          unfollowedAt: new Date().toISOString(),
        }));
      
      // Buscar histórico existente
      const existingHistoryStr = await redis.get(`unfollowers:${userId}:history`);
      const existingHistory = existingHistoryStr ? JSON.parse(existingHistoryStr) : [];
      
      // Adicionar novos unfollowers ao início da lista
      const updatedHistory = [...unfollowerData, ...existingHistory];
      
      // Manter apenas últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const filteredHistory = updatedHistory.filter(u => 
        new Date(u.unfollowedAt) > thirtyDaysAgo
      );
      
      console.log(`[SyncFollowers] Salvando histórico de unfollowers: ${filteredHistory.length} registros (últimos 30 dias)`);
      
      await redis.set(
        `unfollowers:${userId}:history`,
        JSON.stringify(filteredHistory)
      );
    }
    
    // 7. Atualizar lista atual de seguidores
    await redis.set(
      `followers:${userId}:list`,
      JSON.stringify(currentFollowers)
    );
    
    console.log('[SyncFollowers] Lista de seguidores atualizada no Redis.');
    
    // 8. Atualizar timestamp da última sincronização
    const now = new Date().toISOString();
    await redis.set(
      `followers:${userId}:lastSync`,
      now
    );
    
    console.log(`[SyncFollowers] Timestamp atualizado: ${now}`);
    
    // 9. Retornar resultado
    const successMessage = unfollowerIds.length > 0
      ? `Lista de seguidores atualizada com sucesso! ${unfollowerIds.length} pessoa(s) deixaram de te seguir. Volte amanhã ou mais tarde para atualizar novamente.`
      : 'Lista de seguidores atualizada com sucesso! Nenhum novo unfollower detectado. Volte amanhã ou mais tarde para atualizar novamente.';

    res.status(200).json({
      success: true,
      message: successMessage,
      unfollowersCount: unfollowerIds.length,
      totalFollowers: currentFollowers.length,
      previousFollowers: previousFollowers.length,
      newFollowers: currentFollowers.length - previousFollowers.length + unfollowerIds.length,
      lastSync: now,
    });
    
  } catch (error) {
    console.error('[SyncFollowers] Erro na sincronização:', error);
    
    // Verificar tipo de erro
    if (error.message?.includes('TWEETAPI_KEY')) {
      return res.status(500).json({
        error: 'Configuração inválida',
        message: 'A chave da TweetAPI não está configurada. Adicione TWEETAPI_KEY nas variáveis de ambiente.',
        details: error.message,
      });
    }
    
    if (error.code === 401 || error.code === 403) {
      return res.status(401).json({
        error: 'Token de acesso inválido ou expirado',
        message: 'Por favor, faça login novamente',
      });
    }
    
    res.status(500).json({ 
      error: 'Erro ao sincronizar dados',
      details: error.message,
    });
  }
}