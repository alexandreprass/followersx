// pages/api/sync-followers.js
// VERSÃO COM PAGINAÇÃO COMPLETA - Busca TODOS os seguidores via TweetAPI
import { validateAndRefreshAuth } from '../../lib/auth-middleware';
import redis from '../../lib/redis';

// Função para buscar seguidores com paginação
async function getAllFollowersFromTweetAPI(userId) {
  const tweetApiKey = process.env.TWEETAPI_KEY;
  const baseUrl = 'https://api.tweetapi.com/v1';
  
  let allFollowers = [];
  let cursor = null;
  let pageCount = 0;
  const maxPages = 100; // Proteção contra loop infinito
  
  console.log(`[TweetAPI] Iniciando busca de seguidores para userId: ${userId}`);
  
  do {
    pageCount++;
    console.log(`[TweetAPI] Página ${pageCount}${cursor ? ` (cursor: ${cursor.substring(0, 20)}...)` : ''}`);
    
    // Monta URL com cursor se existir
    const url = cursor 
      ? `${baseUrl}/followers?userId=${userId}&cursor=${encodeURIComponent(cursor)}`
      : `${baseUrl}/followers?userId=${userId}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'X-Api-Key': tweetApiKey,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TweetAPI error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      // Verifica estrutura da resposta
      if (!data.followers || !Array.isArray(data.followers)) {
        console.warn('[TweetAPI] Resposta sem array de followers:', data);
        break;
      }
      
      const pageFollowers = data.followers;
      console.log(`[TweetAPI] Página ${pageCount}: ${pageFollowers.length} seguidores recebidos`);
      
      // Adiciona à lista total
      allFollowers = allFollowers.concat(pageFollowers);
      
      // Atualiza cursor para próxima página
      cursor = data.next_cursor || data.nextCursor || null;
      
      // Se não há mais cursor, terminou
      if (!cursor || cursor === '0' || cursor === 0) {
        console.log('[TweetAPI] Última página alcançada (sem next_cursor)');
        break;
      }
      
      // Se retornou 0 seguidores, também terminou
      if (pageFollowers.length === 0) {
        console.log('[TweetAPI] Página vazia, finalizando');
        break;
      }
      
      // Proteção contra loop infinito
      if (pageCount >= maxPages) {
        console.warn(`[TweetAPI] Limite de ${maxPages} páginas atingido, parando`);
        break;
      }
      
      // Pequeno delay entre requisições para evitar rate limit
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.error(`[TweetAPI] Erro na página ${pageCount}:`, error.message);
      throw error;
    }
    
  } while (cursor);
  
  console.log(`[TweetAPI] ✅ Total de seguidores coletados: ${allFollowers.length} em ${pageCount} página(s)`);
  
  return allFollowers;
}

// Normaliza dados dos seguidores para formato consistente
function normalizeFollowerData(follower) {
  return {
    id: follower.id || follower.id_str,
    name: follower.name || '',
    username: follower.screen_name || follower.username || '',
    profile_image_url: follower.profile_image_url || follower.profile_image_url_https || '',
    followers_count: follower.followers_count || 0,
    following_count: follower.friends_count || follower.following_count || 0,
    verified: follower.verified || false,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('[SyncFollowers] ========== INÍCIO ==========');
    
    // 1. Validar autenticação
    const auth = await validateAndRefreshAuth(req, res);
    
    if (!auth.isValid) {
      return res.status(401).json({ error: auth.error || 'Não autenticado' });
    }

    const userId = auth.userId;
    console.log(`[SyncFollowers] ✅ Usuário autenticado: ${userId}`);
    
    // 2. Verificar se TWEETAPI_KEY está configurada
    if (!process.env.TWEETAPI_KEY) {
      return res.status(500).json({
        error: 'Configuração inválida',
        message: 'TWEETAPI_KEY não configurada nas variáveis de ambiente',
      });
    }
    
    // 3. Verificar rate limit (máximo 1 sync a cada 5 minutos)
    const lastSyncKey = `sync:${userId}:lastSync`;
    const lastSync = await redis.get(lastSyncKey);
    
    if (lastSync) {
      const lastSyncTime = new Date(lastSync);
      const now = new Date();
      const minutesSinceLastSync = (now - lastSyncTime) / 1000 / 60;
      
      if (minutesSinceLastSync < 5) {
        const minutesRemaining = Math.ceil(5 - minutesSinceLastSync);
        return res.status(429).json({
          error: 'Rate limit',
          message: `Aguarde ${minutesRemaining} minuto(s) antes de sincronizar novamente`,
          nextUpdateIn: `${minutesRemaining} minuto(s)`,
        });
      }
    }
    
    // 4. Buscar TODOS os seguidores via TweetAPI (com paginação)
    console.log('[SyncFollowers] Buscando seguidores via TweetAPI (com paginação)...');
    
    let currentFollowersRaw;
    try {
      currentFollowersRaw = await getAllFollowersFromTweetAPI(userId);
    } catch (tweetApiError) {
      console.error('[SyncFollowers] Erro ao buscar da TweetAPI:', tweetApiError);
      return res.status(500).json({
        error: 'Erro na TweetAPI',
        message: tweetApiError.message,
      });
    }
    
    // 5. Normalizar dados
    const currentFollowers = currentFollowersRaw.map(normalizeFollowerData);
    console.log(`[SyncFollowers] ✅ ${currentFollowers.length} seguidores normalizados`);
    
    // 6. Pegar lista anterior do Redis
    const previousFollowersStr = await redis.get(`followers:${userId}:list`);
    const previousFollowers = previousFollowersStr ? JSON.parse(previousFollowersStr) : [];
    console.log(`[SyncFollowers] Seguidores anteriores: ${previousFollowers.length}`);
    
    // 7. Detectar unfollowers
    const prevIds = previousFollowers.map(f => f.id);
    const currentIds = currentFollowers.map(f => f.id);
    const unfollowerIds = prevIds.filter(id => !currentIds.includes(id));
    console.log(`[SyncFollowers] Unfollowers detectados: ${unfollowerIds.length}`);
    
    // 8. Salvar unfollowers no histórico (se houver)
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
      
      const existingHistoryStr = await redis.get(`unfollowers:${userId}:history`);
      const existingHistory = existingHistoryStr ? JSON.parse(existingHistoryStr) : [];
      const updatedHistory = [...unfollowerData, ...existingHistory];
      
      // Manter apenas últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const filteredHistory = updatedHistory.filter(u => 
        new Date(u.unfollowedAt) > thirtyDaysAgo
      );
      
      await redis.set(`unfollowers:${userId}:history`, JSON.stringify(filteredHistory));
      console.log(`[SyncFollowers] ✅ ${filteredHistory.length} unfollowers salvos no histórico`);
    }
    
    // 9. Salvar lista atual no Redis
    console.log('[SyncFollowers] Salvando lista atualizada no Redis...');
    await redis.set(`followers:${userId}:list`, JSON.stringify(currentFollowers));
    
    // Também salva em formato legacy para compatibilidade
    await redis.set(`followers:${userId}:current`, JSON.stringify(currentFollowers));
    
    // 10. Atualizar timestamp da última sync
    const now = new Date().toISOString();
    await redis.set(lastSyncKey, now);
    await redis.hset(`user:${userId}`, {
      needs_sync: 'false',
      last_sync: now,
      followers_count: currentFollowers.length,
    });
    
    console.log('[SyncFollowers] ========== CONCLUÍDO ==========');
    
    // 11. Calcular novos seguidores
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
    console.error('[SyncFollowers] ❌ ERRO:', error);
    res.status(500).json({ 
      error: 'Erro ao sincronizar',
      details: error.message,
    });
  }
}