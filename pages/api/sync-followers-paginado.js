// pages/api/sync-followers-paginado.js
// VERSÃO CORRIGIDA - Melhor tratamento de erros e logs
import { validateAndRefreshAuth } from '../../lib/auth-middleware';
import redis from '../../lib/redis';

// ==========================================
// OPÇÃO 1: TweetAPI v2 (MÉTODO GET) - RECOMENDADA
// ==========================================
async function getAllFollowersFromTweetAPI_v2(userId) {
  const tweetApiKey = process.env.TWEETAPI_KEY;
  const baseUrl = 'https://api.tweetapi.com/tw-v2';
  
  if (!tweetApiKey) {
    throw new Error('TWEETAPI_KEY não configurada nas variáveis de ambiente');
  }
  
  let allFollowers = [];
  let cursor = null;
  let pageCount = 0;
  const maxPages = 100;
  
  console.log(`[TweetAPI v2] Iniciando busca de seguidores para userId: ${userId}`);
  console.log(`[TweetAPI v2] API Key configurada: ${tweetApiKey.substring(0, 10)}...`);
  
  do {
    pageCount++;
    console.log(`[TweetAPI v2] 📄 Página ${pageCount}/${maxPages}${cursor ? ` (cursor: ${cursor.substring(0, 20)}...)` : ' (primeira página)'}`);
    
    const url = cursor 
      ? `${baseUrl}/user/followers?userId=${userId}&cursor=${encodeURIComponent(cursor)}`
      : `${baseUrl}/user/followers?userId=${userId}`;
    
    console.log(`[TweetAPI v2] 🔗 URL: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': tweetApiKey,
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`[TweetAPI v2] 📥 Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TweetAPI v2] ❌ Erro HTTP:', response.status, errorText);
        
        // Se é rate limit, retorna o que conseguiu até agora
        if (response.status === 429) {
          console.warn('[TweetAPI v2] ⚠️ Rate limit atingido, retornando dados parciais');
          break;
        }
        
        throw new Error(`TweetAPI error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      console.log('[TweetAPI v2] 📦 Estrutura da resposta:', Object.keys(data));
      
      // Tenta diferentes estruturas de resposta
      const followers = data.data?.followers || data.followers || data.data?.users || data.users;
      
      if (!followers || !Array.isArray(followers)) {
        console.warn('[TweetAPI v2] ⚠️ Resposta sem array de followers:', JSON.stringify(data).substring(0, 300));
        break;
      }
      
      console.log(`[TweetAPI v2] ✅ Página ${pageCount}: ${followers.length} seguidores recebidos`);
      
      // Log do primeiro seguidor para debug
      if (followers.length > 0 && pageCount === 1) {
        console.log('[TweetAPI v2] 📋 Exemplo do primeiro seguidor:', JSON.stringify(followers[0]));
      }
      
      allFollowers = allFollowers.concat(followers);
      
      // Tenta encontrar o cursor em diferentes locais
      cursor = data.data?.next_cursor || 
               data.data?.nextCursor || 
               data.next_cursor || 
               data.nextCursor || 
               null;
      
      console.log(`[TweetAPI v2] 🔄 Próximo cursor:`, cursor ? cursor.substring(0, 30) + '...' : 'null (última página)');
      
      // Condições de parada
      if (!cursor || cursor === '0' || cursor === 0 || cursor === '') {
        console.log('[TweetAPI v2] ✅ Última página alcançada (cursor vazio)');
        break;
      }
      
      if (followers.length === 0) {
        console.log('[TweetAPI v2] ✅ Página vazia, finalizando');
        break;
      }
      
      if (pageCount >= maxPages) {
        console.warn(`[TweetAPI v2] ⚠️ Limite de ${maxPages} páginas atingido`);
        break;
      }
      
      // Delay entre requisições para evitar rate limit
      console.log('[TweetAPI v2] ⏳ Aguardando 500ms...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`[TweetAPI v2] ❌ Erro na página ${pageCount}:`, error.message);
      
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.warn('[TweetAPI v2] Rate limit atingido, retornando dados parciais');
        break;
      }
      
      // Se já tem alguns seguidores, retorna o que conseguiu
      if (allFollowers.length > 0) {
        console.warn(`[TweetAPI v2] Retornando ${allFollowers.length} seguidores coletados antes do erro`);
        break;
      }
      
      throw error;
    }
    
  } while (cursor);
  
  console.log(`[TweetAPI v2] 🎉 Busca concluída: ${allFollowers.length} seguidores em ${pageCount} páginas`);
  return allFollowers;
}

// ==========================================
// OPÇÃO 2: TweetAPI v1 (MÉTODO POST) - ALTERNATIVA
// ==========================================
async function getAllFollowersFromTweetAPI_v1(userId) {
  const tweetApiKey = process.env.TWEETAPI_KEY;
  const baseUrl = 'https://api.tweetapi.com/api/v1';
  
  if (!tweetApiKey) {
    throw new Error('TWEETAPI_KEY não configurada nas variáveis de ambiente');
  }
  
  let allFollowers = [];
  let cursor = '-1';
  let pageCount = 0;
  const maxPages = 100;
  
  console.log(`[TweetAPI v1] Iniciando busca de seguidores para userId: ${userId}`);
  console.log(`[TweetAPI v1] API Key configurada: ${tweetApiKey.substring(0, 10)}...`);
  
  while (cursor !== '0' && cursor !== 0 && pageCount < maxPages) {
    pageCount++;
    console.log(`[TweetAPI v1] 📄 Página ${pageCount}/${maxPages} - Cursor: ${cursor}`);
    
    try {
      const response = await fetch(`${baseUrl}/followers/list`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tweetApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          count: 200,
          cursor: cursor,
        }),
      });
      
      console.log(`[TweetAPI v1] 📥 Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TweetAPI v1] ❌ Erro HTTP:', response.status, errorText);
        
        if (response.status === 429) {
          console.warn('[TweetAPI v1] ⚠️ Rate limit atingido');
          break;
        }
        
        throw new Error(`TweetAPI error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      const followers = data.users;
      
      if (!followers || !Array.isArray(followers)) {
        console.warn('[TweetAPI v1] ⚠️ Resposta sem array de users');
        break;
      }
      
      console.log(`[TweetAPI v1] ✅ Página ${pageCount}: ${followers.length} seguidores recebidos`);
      
      if (followers.length === 0) {
        console.log('[TweetAPI v1] Página vazia, finalizando');
        break;
      }
      
      allFollowers = allFollowers.concat(followers);
      
      cursor = data.next_cursor_str || data.next_cursor?.toString() || '0';
      
      console.log(`[TweetAPI v1] 🔄 Próximo cursor: ${cursor}`);
      
      if (cursor !== '0' && cursor !== 0) {
        console.log('[TweetAPI v1] ⏳ Aguardando 1 segundo...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`[TweetAPI v1] ❌ Erro na página ${pageCount}:`, error.message);
      
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.warn('[TweetAPI v1] Rate limit atingido');
        break;
      }
      
      if (allFollowers.length > 0) {
        console.warn(`[TweetAPI v1] Retornando ${allFollowers.length} seguidores coletados antes do erro`);
        break;
      }
      
      throw error;
    }
  }
  
  console.log(`[TweetAPI v1] 🎉 Busca concluída: ${allFollowers.length} seguidores em ${pageCount} páginas`);
  return allFollowers;
}

// ==========================================
// ESCOLHA A VERSÃO AQUI
// ==========================================
// ✅ Use v2 se sua chave foi criada após 2024 ou se tiver acesso à v2
const getAllFollowersFromTweetAPI = getAllFollowersFromTweetAPI_v2;

// ⚠️ Use v1 se sua chave é antiga ou se v2 não funcionar
// const getAllFollowersFromTweetAPI = getAllFollowersFromTweetAPI_v1;

// ==========================================
// HANDLER PRINCIPAL
// ==========================================
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('[SyncFollowers] ========== INÍCIO ==========');
    
    // 1. Validar autenticação
    const auth = await validateAndRefreshAuth(req, res);
    
    if (!auth.isValid) {
      console.error('[SyncFollowers] ❌ Autenticação inválida:', auth.error);
      return res.status(401).json({ error: auth.error || 'Não autenticado' });
    }

    const userId = auth.userId;
    console.log('[SyncFollowers] ✅ UserId autenticado:', userId);

    // 2. Verificar se TWEETAPI_KEY existe
    if (!process.env.TWEETAPI_KEY) {
      console.error('[SyncFollowers] ❌ TWEETAPI_KEY não configurada!');
      return res.status(500).json({ 
        error: 'Configuração inválida: TWEETAPI_KEY não encontrada nas variáveis de ambiente' 
      });
    }
    
    console.log('[SyncFollowers] ✅ TWEETAPI_KEY configurada');

    // 3. Buscar lista antiga de seguidores (para comparação)
    const oldFollowersStr = await redis.get(`followers:${userId}:list`);
    let oldFollowers = [];
    
    if (oldFollowersStr) {
      try {
        const str = typeof oldFollowersStr === 'string' ? oldFollowersStr : String(oldFollowersStr);
        if (str.trim() !== '') {
          oldFollowers = JSON.parse(str);
        }
      } catch (e) {
        console.warn('[SyncFollowers] ⚠️ Erro ao parsear lista antiga, assumindo vazia:', e.message);
      }
    }
    
    const oldFollowersIds = new Set(oldFollowers.map(f => f.id));
    console.log(`[SyncFollowers] 📊 Seguidores antigos: ${oldFollowers.length}`);

    // 4. Buscar novos seguidores via TweetAPI
    console.log('[SyncFollowers] 🔄 Buscando seguidores via TweetAPI...');
    const newFollowers = await getAllFollowersFromTweetAPI(userId);
    
    if (!newFollowers || newFollowers.length === 0) {
      console.warn('[SyncFollowers] ⚠️ Nenhum seguidor retornado pela API');
      return res.status(500).json({ 
        error: 'Nenhum seguidor retornado pela TweetAPI. Verifique se a chave está correta.' 
      });
    }
    
    console.log(`[SyncFollowers] 📊 Seguidores novos: ${newFollowers.length}`);

    // 5. Normalizar IDs (compatível com v1 e v2)
    const newFollowersIds = new Set(
      newFollowers.map(f => f.id || f.id_str || f.user_id || f.userId)
    );

    // 6. Detectar unfollowers (quem estava na antiga mas não está na nova)
    const unfollowers = oldFollowers.filter(f => !newFollowersIds.has(f.id));
    
    if (unfollowers.length > 0) {
      console.log(`[SyncFollowers] 💔 Detectados ${unfollowers.length} unfollowers`);
      
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
      
      console.log(`[SyncFollowers] ✅ Unfollowers salvos: unfollowers:${userId}:${today}`);
    } else {
      console.log('[SyncFollowers] ✅ Nenhum unfollower detectado');
    }

    // 7. Detectar novos seguidores
    const newFollowersCount = Array.from(newFollowersIds).filter(
      id => !oldFollowersIds.has(id)
    ).length;
    
    if (newFollowersCount > 0) {
      console.log(`[SyncFollowers] 🎉 ${newFollowersCount} novos seguidores!`);
    }

    // 8. Normalizar dados dos novos seguidores (compatível com v1 e v2)
    const normalizedFollowers = newFollowers.map(f => ({
      id: f.id || f.id_str || f.user_id || f.userId,
      username: f.username || f.screen_name || f.userName,
      name: f.name || f.display_name || f.displayName,
      profile_image_url: f.profile_image_url || 
                        f.profile_image_url_https || 
                        f.profilePicture || 
                        f.profile_pic ||
                        f.profileImageUrl,
    }));
    
    console.log('[SyncFollowers] 📋 Exemplo de seguidor normalizado:', normalizedFollowers[0]);

    // 9. Salvar lista atualizada no Redis
    await redis.set(
      `followers:${userId}:list`,
      JSON.stringify(normalizedFollowers)
    );

    console.log(`[SyncFollowers] ✅ Lista atualizada salva: followers:${userId}:list`);

    // 10. Atualizar dados do usuário
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
      newFollowersCount: newFollowersCount,
      message: unfollowers.length > 0 
        ? `${unfollowers.length} pessoa(s) deixou(aram) de te seguir` 
        : 'Nenhum unfollower detectado',
    });

  } catch (error) {
    console.error('[SyncFollowers] ❌❌❌ ERRO FATAL ❌❌❌');
    console.error('[SyncFollowers] Tipo:', error.constructor.name);
    console.error('[SyncFollowers] Mensagem:', error.message);
    console.error('[SyncFollowers] Stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Erro ao sincronizar seguidores',
      details: error.message 
    });
  }
}