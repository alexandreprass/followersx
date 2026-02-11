// pages/api/sync-followers-paginado.js
// VERSÃO CORRIGIDA - TweetAPI v2
import { validateAndRefreshAuth } from '../../lib/auth-middleware';
import redis from '../../lib/redis';

// Função para buscar seguidores com paginação (TweetAPI v2)
async function getAllFollowersFromTweetAPI(userId) {
  const tweetApiKey = process.env.TWEETAPI_KEY;
  // ✅ CORREÇÃO: Base URL correta da TweetAPI v2
  const baseUrl = 'https://api.tweetapi.com/tw-v2';
  
  let allFollowers = [];
  let cursor = null;
  let pageCount = 0;
  const maxPages = 100; // Proteção contra loop infinito
  
  console.log(`[TweetAPI] Iniciando busca de seguidores para userId: ${userId}`);
  
  do {
    pageCount++;
    console.log(`[TweetAPI] Página ${pageCount}${cursor ? ` (cursor: ${cursor.substring(0, 20)}...)` : ''}`);
    
    // ✅ CORREÇÃO: Endpoint correto para followers
    // Monta URL com cursor se existir
    const url = cursor 
      ? `${baseUrl}/user/followers?userId=${userId}&cursor=${encodeURIComponent(cursor)}`
      : `${baseUrl}/user/followers?userId=${userId}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          // ✅ CORREÇÃO: Header correto é 'X-API-Key' (com hífen)
          'X-API-Key': tweetApiKey,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TweetAPI] Erro HTTP:', response.status, errorText);
        throw new Error(`TweetAPI error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      console.log('[TweetAPI] Estrutura da resposta:', Object.keys(data));
      
      // ✅ CORREÇÃO: Verificar estrutura correta da resposta
      // TweetAPI pode retornar { data: { followers: [...], next_cursor: "..." } }
      // ou { followers: [...], next_cursor: "..." }
      const followers = data.data?.followers || data.followers;
      
      if (!followers || !Array.isArray(followers)) {
        console.warn('[TweetAPI] Resposta sem array de followers:', JSON.stringify(data).substring(0, 200));
        break;
      }
      
      console.log(`[TweetAPI] Página ${pageCount}: ${followers.length} seguidores recebidos`);
      
      // Adiciona à lista total
      allFollowers = allFollowers.concat(followers);
      
      // ✅ CORREÇÃO: Buscar cursor correto (pode estar em data ou na raiz)
      cursor = data.data?.next_cursor || data.next_cursor || data.nextCursor || null;
      
      // Se não há mais cursor, terminou
      if (!cursor || cursor === '0' || cursor === 0 || cursor === '') {
        console.log('[TweetAPI] Última página alcançada (sem next_cursor)');
        break;
      }
      
      // Se retornou 0 seguidores, também terminou
      if (followers.length === 0) {
        console.log('[TweetAPI] Página vazia, finalizando');
        break;
      }
      
      // Proteção contra loop infinito
      if (pageCount >= maxPages) {
        console.warn(`[TweetAPI] Limite de ${maxPages} páginas atingido, parando`);
        break;
      }
      
      // Delay entre requisições para evitar rate limit
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`[TweetAPI] Erro na página ${pageCount}:`, error.message);
      
      // Se for erro de rate limit, tenta continuar com o que tem
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.warn('[TweetAPI] Rate limit atingido, retornando dados parciais');
        break;
      }
      
      throw error;
    }
    
  } while (cursor);
  
  console.log(`[TweetAPI] Busca concluída: ${allFollowers.length} seguidores totais em ${pageCount} páginas`);
  return allFollowers;
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
      console.error('[SyncFollowers] Autenticação inválida:', auth.error);
      return res.status(401).json({ error: auth.error || 'Não autenticado' });
    }

    const userId = auth.userId;
    console.log('[SyncFollowers] UserId autenticado:', userId);

    // 2. Verificar se TWEETAPI_KEY existe
    if (!process.env.TWEETAPI_KEY) {
      console.error('[SyncFollowers] TWEETAPI_KEY não configurada!');
      return res.status(500).json({ 
        error: 'Configuração inválida: TWEETAPI_KEY não encontrada' 
      });
    }

    // 3. Buscar lista antiga de seguidores (para comparação)
    const oldFollowersStr = await redis.get(`followers:${userId}:list`);
    const oldFollowers = oldFollowersStr ? JSON.parse(oldFollowersStr) : [];
    const oldFollowersIds = new Set(oldFollowers.map(f => f.id));
    
    console.log(`[SyncFollowers] Seguidores antigos: ${oldFollowers.length}`);

    // 4. Buscar novos seguidores via TweetAPI
    console.log('[SyncFollowers] Buscando seguidores via TweetAPI...');
    const newFollowers = await getAllFollowersFromTweetAPI(userId);
    const newFollowersIds = new Set(newFollowers.map(f => f.id || f.user_id));
    
    console.log(`[SyncFollowers] Seguidores novos: ${newFollowers.length}`);

    // 5. Detectar unfollowers (quem estava na lista antiga mas não está na nova)
    const unfollowers = oldFollowers.filter(f => !newFollowersIds.has(f.id));
    
    if (unfollowers.length > 0) {
      console.log(`[SyncFollowers] Detectados ${unfollowers.length} unfollowers`);
      
      // Salvar unfollowers com data de hoje
      const today = new Date().toISOString().split('T')[0];
      const unfollowersWithDate = unfollowers.map(f => ({
        ...f,
        unfollowDate: new Date().toISOString()
      }));
      
      await redis.set(
        `unfollowers:${userId}:${today}`,
        JSON.stringify(unfollowersWithDate),
        { EX: 60 * 60 * 24 * 30 } // 30 dias
      );
    }

    // 6. Normalizar dados dos novos seguidores
    const normalizedFollowers = newFollowers.map(f => ({
      id: f.id || f.user_id || f.userId,
      username: f.username || f.screen_name || f.userName,
      name: f.name || f.display_name,
      profile_image_url: f.profile_image_url || f.profilePicture || f.profile_pic,
    }));

    // 7. Salvar lista atualizada no Redis
    await redis.set(
      `followers:${userId}:list`,
      JSON.stringify(normalizedFollowers)
    );

    // 8. Atualizar dados do usuário
    await redis.hset(`user:${userId}`, {
      followers_count: normalizedFollowers.length.toString(),
      last_sync: new Date().toISOString(),
      needs_sync: 'false'
    });

    console.log('[SyncFollowers] ========== SUCESSO ==========');
    
    res.json({
      success: true,
      followersCount: normalizedFollowers.length,
      unfollowersCount: unfollowers.length,
      newFollowers: newFollowersIds.size - oldFollowersIds.size,
      message: 'Sincronização concluída com sucesso'
    });

  } catch (error) {
    console.error('[SyncFollowers] ERRO:', error.message);
    console.error('[SyncFollowers] Stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Erro ao sincronizar seguidores',
      details: error.message 
    });
  }
}
