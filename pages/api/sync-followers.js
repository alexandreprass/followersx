// pages/api/sync-followers.js
// Sistema híbrido: API Oficial (perfil) + TweetAPI (lista de seguidores)
// VERSÃO DEBUG: SEM LIMITE DE HORAS + LOGS EXTRAS
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
    console.log('[SyncFollowers] ========== INÍCIO DA SINCRONIZAÇÃO ==========');
    
    // 1. Buscar dados básicos do perfil via API Oficial (para pegar o userId)
    console.log('[SyncFollowers] Passo 1: Buscando dados do perfil via API Oficial...');
    const client = new TwitterApi(accessToken);
    const { data: me } = await client.v2.me();
    const userId = me.id;
    
    console.log(`[SyncFollowers] ✅ UserId obtido: ${userId} (@${me.username})`);

    // 2. Verificar última sincronização (APENAS INFORMATIVO - SEM BLOQUEIO)
    const lastSync = await redis.get(`followers:${userId}:lastSync`);
    
    if (lastSync) {
      const lastSyncDate = new Date(lastSync);
      const hoursSince = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60);
      console.log(`[SyncFollowers] ℹ️ Última sincronização: ${lastSyncDate.toISOString()} (${hoursSince.toFixed(1)}h atrás)`);
      console.log(`[SyncFollowers] ⚠️ LIMITE DESABILITADO PARA TESTES - Prosseguindo com sincronização...`);
    } else {
      console.log('[SyncFollowers] 🆕 Primeira sincronização deste usuário.');
    }

    // 3. Verificar se TWEETAPI_KEY está configurada
    console.log('[SyncFollowers] Passo 2: Verificando TWEETAPI_KEY...');
    const tweetApiKey = process.env.TWEETAPI_KEY;
    
    if (!tweetApiKey) {
      console.error('[SyncFollowers] ❌ TWEETAPI_KEY não encontrada nas variáveis de ambiente!');
      return res.status(500).json({
        error: 'Configuração inválida',
        message: 'A chave da TweetAPI não está configurada. Adicione TWEETAPI_KEY nas variáveis de ambiente do Vercel.',
      });
    }
    
    console.log(`[SyncFollowers] ✅ TWEETAPI_KEY encontrada (primeiros 10 chars): ${tweetApiKey.substring(0, 10)}...`);

    // 4. Buscar lista atual de seguidores via TweetAPI
    console.log('[SyncFollowers] Passo 3: Buscando lista de seguidores via TweetAPI...');
    console.log(`[SyncFollowers] Chamando getAllFollowers(${userId})...`);
    
    let currentFollowersRaw;
    try {
      currentFollowersRaw = await getAllFollowers(userId);
      console.log(`[SyncFollowers] ✅ getAllFollowers retornou: ${currentFollowersRaw.length} seguidores`);
    } catch (tweetApiError) {
      console.error('[SyncFollowers] ❌ Erro ao chamar TweetAPI:', tweetApiError);
      console.error('[SyncFollowers] Detalhes do erro:', {
        message: tweetApiError.message,
        stack: tweetApiError.stack,
      });
      
      return res.status(500).json({
        error: 'Erro na TweetAPI',
        message: 'Falha ao buscar seguidores da TweetAPI. Verifique sua chave e créditos.',
        details: tweetApiError.message,
      });
    }
    
    // 5. Normalizar dados dos seguidores
    console.log('[SyncFollowers] Passo 4: Normalizando dados dos seguidores...');
    const currentFollowers = currentFollowersRaw.map(normalizeFollowerData);
    console.log(`[SyncFollowers] ✅ Dados normalizados: ${currentFollowers.length} seguidores`);
    
    if (currentFollowers.length > 0) {
      console.log('[SyncFollowers] 📋 Exemplo do primeiro seguidor:', JSON.stringify(currentFollowers[0]));
    }
    
    // 6. Pegar lista anterior do Redis
    console.log('[SyncFollowers] Passo 5: Buscando lista anterior no Redis...');
    const previousFollowersStr = await redis.get(`followers:${userId}:list`);
    const previousFollowers = previousFollowersStr ? JSON.parse(previousFollowersStr) : [];
    
    console.log(`[SyncFollowers] ✅ Seguidores anteriores no Redis: ${previousFollowers.length}`);
    
    // 7. Detectar unfollowers (quem estava antes e não está mais)
    console.log('[SyncFollowers] Passo 6: Detectando unfollowers...');
    const prevIds = previousFollowers.map(f => f.id);
    const currentIds = currentFollowers.map(f => f.id);
    const unfollowerIds = prevIds.filter(id => !currentIds.includes(id));
    
    console.log(`[SyncFollowers] ✅ Unfollowers detectados: ${unfollowerIds.length}`);
    
    // 8. Salvar unfollowers no histórico (se houver)
    if (unfollowerIds.length > 0) {
      console.log('[SyncFollowers] Passo 7: Salvando unfollowers no histórico...');
      
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
      
      console.log(`[SyncFollowers] ✅ Salvando histórico de unfollowers: ${filteredHistory.length} registros (últimos 30 dias)`);
      
      await redis.set(
        `unfollowers:${userId}:history`,
        JSON.stringify(filteredHistory)
      );
    } else {
      console.log('[SyncFollowers] ℹ️ Nenhum unfollower para salvar.');
    }
    
    // 9. Atualizar lista atual de seguidores NO REDIS
    console.log('[SyncFollowers] Passo 8: Salvando lista de seguidores no Redis...');
    console.log(`[SyncFollowers] Chave Redis: followers:${userId}:list`);
    console.log(`[SyncFollowers] Tamanho do JSON: ${JSON.stringify(currentFollowers).length} caracteres`);
    
    try {
      await redis.set(
        `followers:${userId}:list`,
        JSON.stringify(currentFollowers)
      );
      console.log('[SyncFollowers] ✅ Lista de seguidores SALVA no Redis!');
      
      // Verificar se salvou mesmo
      const verification = await redis.get(`followers:${userId}:list`);
      if (verification) {
        console.log(`[SyncFollowers] ✅ VERIFICAÇÃO: Redis retornou ${verification.length} caracteres`);
      } else {
        console.log('[SyncFollowers] ⚠️ VERIFICAÇÃO FALHOU: Redis retornou null/vazio!');
      }
    } catch (redisError) {
      console.error('[SyncFollowers] ❌ Erro ao salvar no Redis:', redisError);
      throw redisError;
    }
    
    // 10. Atualizar timestamp da última sincronização
    console.log('[SyncFollowers] Passo 9: Atualizando timestamp...');
    const now = new Date().toISOString();
    await redis.set(
      `followers:${userId}:lastSync`,
      now
    );
    
    console.log(`[SyncFollowers] ✅ Timestamp atualizado: ${now}`);
    console.log('[SyncFollowers] ========== SINCRONIZAÇÃO CONCLUÍDA ==========');
    
    // 11. Retornar resultado
    const newFollowersCount = Math.max(0, currentFollowers.length - previousFollowers.length + unfollowerIds.length);
    
    const successMessage = unfollowerIds.length > 0
      ? `Lista de seguidores atualizada com sucesso! ${unfollowerIds.length} pessoa(s) deixaram de te seguir.`
      : 'Lista de seguidores atualizada com sucesso! Nenhum novo unfollower detectado.';

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
    console.error('[SyncFollowers] ❌❌❌ ERRO NA SINCRONIZAÇÃO ❌❌❌');
    console.error('[SyncFollowers] Tipo:', error.constructor.name);
    console.error('[SyncFollowers] Mensagem:', error.message);
    console.error('[SyncFollowers] Stack:', error.stack);
    
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
      type: error.constructor.name,
    });
  }
}