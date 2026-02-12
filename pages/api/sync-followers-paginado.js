// pages/api/sync-followers-paginado.js
// VERSÃO CORRIGIDA v2 - Debug completo da estrutura de paginação
import { validateAndRefreshAuth } from '../../lib/auth-middleware';
import redis from '../../lib/redis';

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
  
  console.log(`[TweetAPI v2] ========== INÍCIO ==========`);
  console.log(`[TweetAPI v2] UserId: ${userId}`);
  console.log(`[TweetAPI v2] API Key: ${tweetApiKey.substring(0, 10)}...`);
  
  do {
    pageCount++;
    const isFirstPage = cursor === null;
    console.log(`[TweetAPI v2] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[TweetAPI v2] 📄 PÁGINA ${pageCount}/${maxPages}`);
    
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
      
      console.log(`[TweetAPI v2] 📥 HTTP Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TweetAPI v2] ❌ Erro HTTP:', errorText);
        
        if (response.status === 429) {
          console.warn('[TweetAPI v2] ⚠️ Rate limit atingido');
          break;
        }
        
        throw new Error(`TweetAPI error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      // ============================================
      // 🔍 DEBUG COMPLETO DA ESTRUTURA DE RESPOSTA
      // ============================================
      console.log('[TweetAPI v2] 📦 ESTRUTURA COMPLETA DA RESPOSTA:');
      console.log('[TweetAPI v2]    - Keys na raiz:', Object.keys(data));
      console.log('[TweetAPI v2]    - Tipo de data:', typeof data.data, Array.isArray(data.data) ? `(array com ${data.data?.length} items)` : '');
      console.log('[TweetAPI v2]    - Tipo de pagination:', typeof data.pagination);
      
      if (data.pagination) {
        console.log('[TweetAPI v2]    - Keys em pagination:', Object.keys(data.pagination));
        console.log('[TweetAPI v2]    - pagination.nextCursor:', data.pagination.nextCursor);
        console.log('[TweetAPI v2]    - pagination.next:', data.pagination.next);
        console.log('[TweetAPI v2]    - pagination.nextCursor:', data.pagination.nextCursor);
        console.log('[TweetAPI v2]    - pagination.nextCursor:', data.pagination.nextCursor);
      }
      
      // Log da resposta completa (apenas na primeira página)
      if (isFirstPage) {
        const jsonString = JSON.stringify(data);
        console.log('[TweetAPI v2] 📋 RESPOSTA JSON COMPLETA (primeiros 1000 chars):');
        console.log(jsonString.substring(0, 1000));
        if (jsonString.length > 1000) {
          console.log('[TweetAPI v2]    ... (truncado, total:', jsonString.length, 'chars)');
        }
      }
      
      // ============================================
      // EXTRAÇÃO DOS SEGUIDORES
      // ============================================
      const followers = Array.isArray(data.data) ? data.data : 
                       data.data?.followers || 
                       data.followers || 
                       data.data?.users || 
                       data.users;
      
      if (!followers || !Array.isArray(followers)) {
        console.error('[TweetAPI v2] ❌ ERRO: Resposta não contém array de followers');
        console.error('[TweetAPI v2] Estrutura recebida:', JSON.stringify(data).substring(0, 500));
        break;
      }
      
      console.log(`[TweetAPI v2] ✅ Followers extraídos: ${followers.length}`);
      
      if (followers.length === 0) {
        console.log('[TweetAPI v2] ⚠️ Página vazia, finalizando');
        break;
      }
      
      // Log do primeiro seguidor (apenas primeira página)
      if (isFirstPage && followers.length > 0) {
        console.log('[TweetAPI v2] 📋 Exemplo do primeiro seguidor:');
        console.log(JSON.stringify(followers[0], null, 2).substring(0, 500));
      }
      
      allFollowers = allFollowers.concat(followers);
      console.log(`[TweetAPI v2] 📊 Total acumulado: ${allFollowers.length} seguidores`);
      
      // ============================================
      // EXTRAÇÃO DO CURSOR (TENTANDO TODOS OS CAMPOS POSSÍVEIS)
      // ============================================
      const possibleCursors = [
        data.pagination?.nextCursor,
        data.pagination?.next,
        data.pagination?.nextCursor,
        data.pagination?.nextCursor,
        data.pagination?.cursor,
        data.nextCursor,
        data.nextCursor,
        data.next,
        data.nextCursor,
        data.cursor,
      ];
      
      console.log('[TweetAPI v2] 🔍 BUSCANDO CURSOR...');
      console.log('[TweetAPI v2] Possíveis valores:');
      possibleCursors.forEach((val, idx) => {
        if (val !== undefined) {
          console.log(`[TweetAPI v2]    [${idx}]:`, typeof val, '=', String(val).substring(0, 50));
        }
      });
      
      // Pega o primeiro cursor não-nulo/não-vazio
      cursor = possibleCursors.find(c => 
        c !== null && 
        c !== undefined && 
        c !== '0' && 
        c !== 0 && 
        c !== '' &&
        c !== 'null'
      ) || null;
      
      console.log('[TweetAPI v2] 🔄 Cursor selecionado:', cursor ? String(cursor).substring(0, 50) + '...' : 'null (última página)');
      
      // ============================================
      // CONDIÇÕES DE PARADA
      // ============================================
      if (!cursor) {
        console.log('[TweetAPI v2] ✅ Cursor null/vazio - Última página');
        
        // ⚠️ VERIFICAÇÃO IMPORTANTE: Se temos poucos seguidores mas usuário tem muito mais
        if (allFollowers.length < 100 && isFirstPage) {
          console.warn('[TweetAPI v2] ⚠️⚠️⚠️ ALERTA ⚠️⚠️⚠️');
          console.warn('[TweetAPI v2] Apenas', allFollowers.length, 'seguidores encontrados');
          console.warn('[TweetAPI v2] API retornou cursor null na primeira página');
          console.warn('[TweetAPI v2] Isso pode indicar:');
          console.warn('[TweetAPI v2]   1. Limitação da TweetAPI v2');
          console.warn('[TweetAPI v2]   2. Endpoint incorreto');
          console.warn('[TweetAPI v2]   3. Problema com a chave API');
          console.warn('[TweetAPI v2] Considere usar TweetAPI v1 se disponível');
        }
        break;
      }
      
      if (pageCount >= maxPages) {
        console.warn(`[TweetAPI v2] ⚠️ Limite de ${maxPages} páginas atingido`);
        break;
      }
      
      // Delay entre requisições
      console.log('[TweetAPI v2] ⏳ Aguardando 500ms antes da próxima página...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`[TweetAPI v2] ❌ ERRO na página ${pageCount}:`, error.message);
      console.error(`[TweetAPI v2] Stack:`, error.stack);
      
      if (allFollowers.length > 0) {
        console.warn(`[TweetAPI v2] Retornando ${allFollowers.length} seguidores coletados antes do erro`);
        break;
      }
      
      throw error;
    }
    
  } while (cursor && pageCount < maxPages);
  
  console.log(`[TweetAPI v2] ========== FIM ==========`);
  console.log(`[TweetAPI v2] 🎉 Total: ${allFollowers.length} seguidores em ${pageCount} páginas`);
  return allFollowers;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('[SyncFollowers] ========== INÍCIO ==========');
    
    const auth = await validateAndRefreshAuth(req, res);
    
    if (!auth.isValid) {
      console.error('[SyncFollowers] ❌ Autenticação inválida');
      return res.status(401).json({ error: auth.error || 'Não autenticado' });
    }

    const userId = auth.userId;
    console.log('[SyncFollowers] ✅ UserId:', userId);

    if (!process.env.TWEETAPI_KEY) {
      console.error('[SyncFollowers] ❌ TWEETAPI_KEY não configurada');
      return res.status(500).json({ 
        error: 'TWEETAPI_KEY não encontrada' 
      });
    }

    // Buscar lista antiga
    const oldFollowersData = await redis.get(`followers:${userId}:list`);
    let oldFollowers = [];
    
    if (oldFollowersData) {
      try {
        let jsonString;
        
        if (Buffer.isBuffer(oldFollowersData)) {
          jsonString = oldFollowersData.toString('utf8');
        } else if (typeof oldFollowersData === 'string') {
          jsonString = oldFollowersData;
        } else {
          jsonString = JSON.stringify(oldFollowersData);
        }
        
        if (jsonString && jsonString.trim()) {
          oldFollowers = JSON.parse(jsonString);
        }
      } catch (e) {
        console.warn('[SyncFollowers] Erro ao parsear lista antiga:', e.message);
      }
    }
    
    const oldFollowersIds = new Set(oldFollowers.map(f => f.id));
    console.log(`[SyncFollowers] 📊 Seguidores antigos: ${oldFollowers.length}`);

    // Buscar novos seguidores
    console.log('[SyncFollowers] 🔄 Iniciando busca via TweetAPI v2...');
    const newFollowers = await getAllFollowersFromTweetAPI_v2(userId);
    
    if (!newFollowers || newFollowers.length === 0) {
      console.error('[SyncFollowers] ❌ Nenhum seguidor retornado');
      return res.status(500).json({ 
        error: 'Nenhum seguidor retornado pela TweetAPI' 
      });
    }
    
    console.log(`[SyncFollowers] 📊 Seguidores novos: ${newFollowers.length}`);

    const newFollowersIds = new Set(
      newFollowers.map(f => f.id || f.id_str)
    );

    // Detectar unfollowers
    const unfollowers = oldFollowers.filter(f => !newFollowersIds.has(f.id));
    
    if (unfollowers.length > 0) {
      console.log(`[SyncFollowers] 💔 Unfollowers: ${unfollowers.length}`);
      
      const today = new Date().toISOString().split('T')[0];
      const unfollowersWithDate = unfollowers.map(f => ({
        ...f,
        unfollowDate: new Date().toISOString()
      }));
      
      await redis.set(
        `unfollowers:${userId}:${today}`,
        JSON.stringify(unfollowersWithDate),
        'ex',
        60 * 60 * 24 * 30
      );
    }

    // Detectar novos seguidores
    const newFollowersCount = Array.from(newFollowersIds).filter(
      id => !oldFollowersIds.has(id)
    ).length;
    
    if (newFollowersCount > 0) {
      console.log(`[SyncFollowers] 🎉 Novos: ${newFollowersCount}`);
    }

    // Normalizar dados (formato v2)
    const normalizedFollowers = newFollowers.map(f => ({
      id: f.id || f.id_str,
      username: f.username || f.screen_name,
      name: f.name,
      profile_image_url: f.avatar || f.profile_image_url || f.profileImageUrl,
    }));
    
    console.log('[SyncFollowers] 📋 Exemplo normalizado:', normalizedFollowers[0]);

    // Salvar no Redis
    await redis.set(
      `followers:${userId}:list`,
      JSON.stringify(normalizedFollowers)
    );

    console.log(`[SyncFollowers] ✅ Salvos: ${normalizedFollowers.length} seguidores`);

    // Atualizar metadados
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
        : 'Sincronização completa',
    });

  } catch (error) {
    console.error('[SyncFollowers] ❌ ERRO FATAL');
    console.error('[SyncFollowers] Mensagem:', error.message);
    console.error('[SyncFollowers] Stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Erro ao sincronizar',
      details: error.message 
    });
  }
}