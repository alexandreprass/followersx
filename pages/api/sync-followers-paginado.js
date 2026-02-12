// pages/api/sync-followers-paginado.js
// VERSÃO ALTERNATIVA - TweetAPI usando endpoint correto
import { validateAndRefreshAuth } from '../../lib/auth-middleware';
import redis from '../../lib/redis';

/**
 * NOTA IMPORTANTE:
 * Este arquivo contém DUAS implementações da função getAllFollowersFromTweetAPI:
 * 
 * 1. Implementação TweetAPI v2 (ATUAL - linhas 15-110)
 * 2. Implementação TweetAPI v1 (ALTERNATIVA - linhas 112-195)
 * 
 * Comente/descomente a versão apropriada baseado na documentação da sua API key
 */

// ==========================================
// OPÇÃO 1: TweetAPI v2 (MÉTODO GET)
// ==========================================
// Use esta se sua chave foi criada para a API v2
// Endpoint: https://api.tweetapi.com/tw-v2/user/followers

async function getAllFollowersFromTweetAPI_v2(userId) {
  const tweetApiKey = process.env.TWEETAPI_KEY;
  const baseUrl = 'https://api.tweetapi.com/tw-v2';
  
  let allFollowers = [];
  let cursor = null;
  let pageCount = 0;
  const maxPages = 100;
  
  console.log(`[TweetAPI v2] Iniciando busca de seguidores para userId: ${userId}`);
  
  do {
    pageCount++;
    console.log(`[TweetAPI v2] Página ${pageCount}${cursor ? ` (cursor: ${cursor.substring(0, 20)}...)` : ''}`);
    
    const url = cursor 
      ? `${baseUrl}/user/followers?userId=${userId}&cursor=${encodeURIComponent(cursor)}`
      : `${baseUrl}/user/followers?userId=${userId}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'X-API-Key': tweetApiKey,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TweetAPI v2] Erro HTTP:', response.status, errorText);
        throw new Error(`TweetAPI error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      console.log('[TweetAPI v2] Estrutura da resposta:', Object.keys(data));
      
      const followers = data.data?.followers || data.followers;
      
      if (!followers || !Array.isArray(followers)) {
        console.warn('[TweetAPI v2] Resposta sem array de followers:', JSON.stringify(data).substring(0, 200));
        break;
      }
      
      console.log(`[TweetAPI v2] Página ${pageCount}: ${followers.length} seguidores recebidos`);
      
      allFollowers = allFollowers.concat(followers);
      
      cursor = data.data?.next_cursor || data.next_cursor || data.nextCursor || null;
      
      if (!cursor || cursor === '0' || cursor === 0 || cursor === '') {
        console.log('[TweetAPI v2] Última página alcançada');
        break;
      }
      
      if (followers.length === 0) {
        console.log('[TweetAPI v2] Página vazia, finalizando');
        break;
      }
      
      if (pageCount >= maxPages) {
        console.warn(`[TweetAPI v2] Limite de ${maxPages} páginas atingido`);
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`[TweetAPI v2] Erro na página ${pageCount}:`, error.message);
      
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.warn('[TweetAPI v2] Rate limit atingido, retornando dados parciais');
        break;
      }
      
      throw error;
    }
    
  } while (cursor);
  
  console.log(`[TweetAPI v2] Busca concluída: ${allFollowers.length} seguidores em ${pageCount} páginas`);
  return allFollowers;
}

// ==========================================
// OPÇÃO 2: TweetAPI v1 (MÉTODO POST)
// ==========================================
// Use esta se sua chave foi criada para a API v1
// Endpoint: https://api.tweetapi.com/api/v1/followers/list

async function getAllFollowersFromTweetAPI_v1(userId) {
  const tweetApiKey = process.env.TWEETAPI_KEY;
  const baseUrl = 'https://api.tweetapi.com/api/v1';
  
  let allFollowers = [];
  let cursor = '-1'; // v1 usa string "-1" para primeira página
  let pageCount = 0;
  const maxPages = 100;
  
  console.log(`[TweetAPI v1] Iniciando busca de seguidores para userId: ${userId}`);
  
  // v1 usa loop while com cursor != '0'
  while (cursor !== '0' && cursor !== 0 && pageCount < maxPages) {
    pageCount++;
    console.log(`[TweetAPI v1] Página ${pageCount}/${maxPages} - Cursor: ${cursor}`);
    
    try {
      const response = await fetch(`${baseUrl}/followers/list`, {
        method: 'POST', // v1 usa POST
        headers: {
          'Authorization': `Bearer ${tweetApiKey}`, // v1 usa Bearer
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId, // v1 usa user_id no body
          count: 200, // máximo por página
          cursor: cursor,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TweetAPI v1] Erro HTTP:', response.status, errorText);
        throw new Error(`TweetAPI error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      // v1 retorna: { users: [...], next_cursor: "...", next_cursor_str: "..." }
      const followers = data.users;
      
      if (!followers || !Array.isArray(followers)) {
        console.warn('[TweetAPI v1] Resposta sem array de users');
        break;
      }
      
      console.log(`[TweetAPI v1] Página ${pageCount}: ${followers.length} seguidores recebidos`);
      
      if (followers.length === 0) {
        console.log('[TweetAPI v1] Página vazia, finalizando');
        break;
      }
      
      allFollowers = allFollowers.concat(followers);
      
      // v1 retorna next_cursor_str (preferível) ou next_cursor
      cursor = data.next_cursor_str || data.next_cursor?.toString() || '0';
      
      console.log(`[TweetAPI v1] Próximo cursor: ${cursor}`);
      
      // Delay entre requisições
      if (cursor !== '0' && cursor !== 0) {
        console.log('[TweetAPI v1] Aguardando 1 segundo...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
    } catch (error) {
      console.error(`[TweetAPI v1] Erro na página ${pageCount}:`, error.message);
      
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.warn('[TweetAPI v1] Rate limit atingido');
        break;
      }
      
      throw error;
    }
  }
  
  console.log(`[TweetAPI v1] Busca concluída: ${allFollowers.length} seguidores em ${pageCount} páginas`);
  return allFollowers;
}

// ==========================================
// ESCOLHA A VERSÃO AQUI
// ==========================================
// Descomente a linha apropriada para sua API key:

const getAllFollowersFromTweetAPI = getAllFollowersFromTweetAPI_v2; // ← USE v2
// const getAllFollowersFromTweetAPI = getAllFollowersFromTweetAPI_v1; // ← USE v1

// ==========================================
// RESTO DO CÓDIGO (igual para ambas versões)
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
    
    // Normalizar IDs (v1 usa id_str, v2 pode usar id ou user_id)
    const newFollowersIds = new Set(
      newFollowers.map(f => f.id || f.id_str || f.user_id || f.userId)
    );
    
    console.log(`[SyncFollowers] Seguidores novos: ${newFollowers.length}`);

    // 5. Detectar unfollowers (quem estava na lista antiga mas não está na nova)
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
      
      console.log(`[SyncFollowers] Unfollowers salvos: unfollowers:${userId}:${today}`);
    } else {
      console.log('[SyncFollowers] ✅ Nenhum unfollower detectado');
    }

    // 6. Detectar novos seguidores
    const newFollowersCount = Array.from(newFollowersIds).filter(
      id => !oldFollowersIds.has(id)
    ).length;
    
    if (newFollowersCount > 0) {
      console.log(`[SyncFollowers] 🎉 ${newFollowersCount} novos seguidores!`);
    }

    // 7. Normalizar dados dos novos seguidores (compatível com v1 e v2)
    const normalizedFollowers = newFollowers.map(f => ({
      // IDs
      id: f.id || f.id_str || f.user_id || f.userId,
      // Username
      username: f.username || f.screen_name || f.userName,
      // Nome completo
      name: f.name || f.display_name,
      // Avatar
      profile_image_url: f.profile_image_url || f.profile_image_url_https || f.profilePicture || f.profile_pic,
    }));

    // 8. Salvar lista atualizada no Redis
    await redis.set(
      `followers:${userId}:list`,
      JSON.stringify(normalizedFollowers)
    );

    console.log(`[SyncFollowers] Lista atualizada salva: followers:${userId}:list`);

    // 9. Atualizar dados do usuário
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
    console.error('[SyncFollowers] ❌ ERRO:', error.message);
    console.error('[SyncFollowers] Stack:', error.stack);
    
    res.status(500).json({ 
      error: 'Erro ao sincronizar seguidores',
      details: error.message 
    });
  }
}