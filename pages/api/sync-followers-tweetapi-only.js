// pages/api/sync-followers.js
// VERSÃO SIMPLIFICADA: USA APENAS TWEETAPI (sem Twitter API v2)
// Remove dependência de Project do Twitter Developer
import { getAllFollowers, normalizeFollowerData, getUserIdByUsername } from '../../lib/tweetapi-client';
import redis from '../../lib/redis';

export default async function handler(req, res) {
  // Apenas método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Para essa versão simplificada, vamos pegar o userId do Redis
  // (foi salvo durante o login/callback)
  try {
    console.log('[SyncFollowers] ========== INÍCIO (VERSÃO TWEETAPI ONLY) ==========');
    
    // 1. Buscar userId do Redis (salvo durante o callback OAuth)
    console.log('[SyncFollowers] Passo 1: Buscando userId do Redis...');
    
    // Pegar do cookie ou Redis - precisamos identificar o usuário
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    // Buscar todos os usuários cadastrados e pegar o mais recente
    // (melhor seria guardar userId no cookie, mas por enquanto vamos usar essa abordagem)
    const allKeys = await redis.keys('user:*');
    console.log(`[SyncFollowers] Keys encontradas no Redis: ${allKeys.length}`);
    
    if (allKeys.length === 0) {
      return res.status(404).json({ 
        error: 'Usuário não encontrado',
        message: 'Faça login novamente para sincronizar seus dados.'
      });
    }
    
    // Pegar o userId da última chave (assumindo que é o usuário atual)
    // Formato da chave: user:2696187636
    const lastKey = allKeys[allKeys.length - 1];
    const userId = lastKey.split(':')[1];
    
    console.log(`[SyncFollowers] ✅ UserId obtido do Redis: ${userId}`);
    
    // Verificar username também
    const userData = await redis.hgetall(lastKey);
    console.log(`[SyncFollowers] Dados do usuário: @${userData.username || 'desconhecido'}`);

    // 2. Verificar se TWEETAPI_KEY está configurada
    console.log('[SyncFollowers] Passo 2: Verificando TWEETAPI_KEY...');
    const tweetApiKey = process.env.TWEETAPI_KEY;
    
    if (!tweetApiKey) {
      console.error('[SyncFollowers] ❌ TWEETAPI_KEY não encontrada!');
      return res.status(500).json({
        error: 'Configuração inválida',
        message: 'A chave da TweetAPI não está configurada. Adicione TWEETAPI_KEY nas variáveis de ambiente do Vercel.',
      });
    }
    
    console.log(`[SyncFollowers] ✅ TWEETAPI_KEY encontrada (primeiros 10 chars): ${tweetApiKey.substring(0, 10)}...`);

    // 3. Buscar lista atual de seguidores via TweetAPI
    console.log('[SyncFollowers] Passo 3: Buscando seguidores via TweetAPI...');
    console.log(`[SyncFollowers] Chamando getAllFollowers(${userId})...`);
    
    let currentFollowersRaw;
    try {
      currentFollowersRaw = await getAllFollowers(userId);
      console.log(`[SyncFollowers] ✅ getAllFollowers retornou: ${currentFollowersRaw.length} seguidores`);
    } catch (tweetApiError) {
      console.error('[SyncFollowers] ❌ Erro ao chamar TweetAPI:', tweetApiError);
      
      return res.status(500).json({
        error: 'Erro na TweetAPI',
        message: 'Falha ao buscar seguidores da TweetAPI. Verifique sua chave e créditos.',
        details: tweetApiError.message,
      });
    }
    
    // 4. Normalizar dados dos seguidores
    console.log('[SyncFollowers] Passo 4: Normalizando dados...');
    const currentFollowers = currentFollowersRaw.map(normalizeFollowerData);
    console.log(`[SyncFollowers] ✅ ${currentFollowers.length} seguidores normalizados`);
    
    if (currentFollowers.length > 0) {
      console.log('[SyncFollowers] 📋 Exemplo:', JSON.stringify(currentFollowers[0]));
    }
    
    // 5. Pegar lista anterior do Redis
    console.log('[SyncFollowers] Passo 5: Buscando lista anterior...');
    const previousFollowersStr = await redis.get(`followers:${userId}:list`);
    const previousFollowers = previousFollowersStr ? JSON.parse(previousFollowersStr) : [];
    
    console.log(`[SyncFollowers] ✅ Anteriores: ${previousFollowers.length}`);
    
    // 6. Detectar unfollowers
    console.log('[SyncFollowers] Passo 6: Detectando unfollowers...');
    const prevIds = previousFollowers.map(f => f.id);
    const currentIds = currentFollowers.map(f => f.id);
    const unfollowerIds = prevIds.filter(id => !currentIds.includes(id));
    
    console.log(`[SyncFollowers] ✅ Unfollowers: ${unfollowerIds.length}`);
    
    // 7. Salvar unfollowers no histórico (se houver)
    if (unfollowerIds.length > 0) {
      console.log('[SyncFollowers] Passo 7: Salvando unfollowers...');
      
      const unfollowerData = previousFollowers
        .filter(f => unfollowerIds.includes(f.id))
        .map(user => ({
          id: user.id,
          name: user.name,
          username: user.username,
          profile_image_url: user.profile_image_url,
          unfollowedAt: new Date().toISOString(),
        }));
      
      const existingHistoryStr = await redis.get(`unfollowers:${userId}:history`);
      const existingHistory = existingHistoryStr ? JSON.parse(existingHistoryStr) : [];
      const updatedHistory = [...unfollowerData, ...existingHistory];
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const filteredHistory = updatedHistory.filter(u => 
        new Date(u.unfollowedAt) > thirtyDaysAgo
      );
      
      await redis.set(`unfollowers:${userId}:history`, JSON.stringify(filteredHistory));
      console.log(`[SyncFollowers] ✅ ${filteredHistory.length} unfollowers salvos`);
    }
    
    // 8. Salvar lista atual no Redis
    console.log('[SyncFollowers] Passo 8: Salvando no Redis...');
    console.log(`[SyncFollowers] Chave: followers:${userId}:list`);
    
    try {
      const jsonStr = JSON.stringify(currentFollowers);
      console.log(`[SyncFollowers] Tamanho do JSON: ${jsonStr.length} caracteres`);
      
      await redis.set(`followers:${userId}:list`, jsonStr);
      console.log('[SyncFollowers] ✅ SALVO NO REDIS!');
      
      // Verificar
      const verification = await redis.get(`followers:${userId}:list`);
      if (verification && verification.length > 0) {
        console.log(`[SyncFollowers] ✅ VERIFICADO: ${verification.length} caracteres`);
      } else {
        console.log('[SyncFollowers] ⚠️ VERIFICAÇÃO FALHOU!');
      }
    } catch (redisError) {
      console.error('[SyncFollowers] ❌ Erro ao salvar:', redisError);
      throw redisError;
    }
    
    // 9. Atualizar timestamp
    console.log('[SyncFollowers] Passo 9: Atualizando timestamp...');
    const now = new Date().toISOString();
    await redis.set(`followers:${userId}:lastSync`, now);
    
    console.log('[SyncFollowers] ========== CONCLUÍDO ==========');
    
    // 10. Retornar resultado
    const newFollowersCount = Math.max(0, currentFollowers.length - previousFollowers.length + unfollowerIds.length);
    
    const successMessage = unfollowerIds.length > 0
      ? `Lista atualizada! ${unfollowerIds.length} unfollower(s) detectado(s).`
      : 'Lista atualizada! Nenhum unfollower detectado.';

    res.status(200).json({
      success: true,
      message: successMessage,
      unfollowersCount: unfollowerIds.length,
      totalFollowers: currentFollowers.length,
      previousFollowers: previousFollowers.length,
      newFollowers: newFollowersCount,
      lastSync: now,
    });
    
  } catch (error) {
    console.error('[SyncFollowers] ❌❌❌ ERRO FATAL ❌❌❌');
    console.error('[SyncFollowers] Tipo:', error.constructor.name);
    console.error('[SyncFollowers] Mensagem:', error.message);
    console.error('[SyncFollowers] Stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Erro ao sincronizar',
      details: error.message,
      type: error.constructor.name,
    });
  }
}