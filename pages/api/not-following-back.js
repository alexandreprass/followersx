// pages/api/not-following-back.js
// VERSÃO CORRIGIDA - Busca quem você segue mas não te segue de volta
import { validateAndRefreshAuth } from '../../lib/auth-middleware';
import redis from '../../lib/redis';

/**
 * Busca lista de quem o usuário segue via TweetAPI tw-v2
 * Usa o mesmo padrão de sync-followers-paginado.js
 */
async function getFollowingFromTweetAPI(userId, cursor = null) {
  const apiKey = process.env.TWEETAPI_KEY;
  const baseUrl = 'https://api.tweetapi.com/tw-v2';
  
  if (!apiKey) {
    throw new Error('TWEETAPI_KEY não configurada');
  }

  const url = cursor 
    ? `${baseUrl}/user/following?userId=${userId}&cursor=${encodeURIComponent(cursor)}`
    : `${baseUrl}/user/following?userId=${userId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TweetAPI error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  
  // Extrai os usuários (seguindo o mesmo padrão de sync-followers-paginado)
  const users = Array.isArray(data.data) ? data.data : 
                data.data?.following || 
                data.following || 
                data.data?.users || 
                data.users || [];

  // Extrai o cursor de paginação (testando todos os campos possíveis)
  const possibleCursors = [
    data.pagination?.nextCursor,
    data.pagination?.nextCursor,
    data.pagination?.next,
    data.pagination?.nextCursor,
    data.pagination?.nextCursor,
    data.nextCursor,
    data.nextCursor,
    data.next,
  ];

  const nextCursor = possibleCursors.find(c => 
    c !== null && 
    c !== undefined && 
    c !== '0' && 
    c !== 0 && 
    c !== '' &&
    c !== 'null'
  ) || null;

  return {
    users: users,
    nextCursor: nextCursor,
  };
}

/**
 * Busca TODOS que o usuário segue (paginado)
 */
async function getAllFollowing(userId, maxPages = 100) {
  let allFollowing = [];
  let cursor = null;
  let pageCount = 0;

  console.log(`[NotFollowingBack] Buscando following para userId: ${userId}`);

  do {
    pageCount++;
    try {
      console.log(`[NotFollowingBack] Página ${pageCount}/${maxPages} - Cursor: ${cursor || 'inicial'}`);
      
      const result = await getFollowingFromTweetAPI(userId, cursor);
      
      if (result.users && result.users.length > 0) {
        allFollowing = allFollowing.concat(result.users);
        console.log(`[NotFollowingBack] +${result.users.length} following. Total: ${allFollowing.length}`);
      } else {
        console.log(`[NotFollowingBack] Nenhum usuário retornado. Finalizando.`);
        break;
      }

      cursor = result.nextCursor;
      
      // Se não houver próximo cursor, acabou a paginação
      if (!cursor) {
        console.log(`[NotFollowingBack] Fim da paginação (sem nextCursor)`);
        break;
      }

      // Delay para evitar rate limit
      if (pageCount < maxPages) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`[NotFollowingBack] Erro na página ${pageCount}:`, error.message);
      break;
    }
  } while (cursor && pageCount < maxPages);

  console.log(`[NotFollowingBack] Total following coletados: ${allFollowing.length}`);
  return allFollowing;
}

export default async function handler(req, res) {
  try {
    // Valida autenticação
    const auth = await validateAndRefreshAuth(req, res);
    
    if (!auth.isValid) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const userId = auth.userId;
    console.log(`[NotFollowingBack] Processando para userId: ${userId}`);

    // 1. Busca lista de seguidores do Redis
    const followersData = await redis.get(`followers:${userId}:list`);
    
    let followers = [];
    if (followersData) {
      try {
        let jsonString;
        
        if (Buffer.isBuffer(followersData)) {
          jsonString = followersData.toString('utf8');
        } else if (typeof followersData === 'string') {
          jsonString = followersData;
        } else {
          jsonString = JSON.stringify(followersData);
        }
        
        if (jsonString && jsonString.trim()) {
          followers = JSON.parse(jsonString);
        }
      } catch (e) {
        console.error('[NotFollowingBack] Erro ao parsear followers:', e.message);
      }
    }

    console.log(`[NotFollowingBack] Followers encontrados no Redis: ${followers.length}`);

    if (followers.length === 0) {
      return res.json({ 
        notFollowingBack: [],
        message: 'Nenhum seguidor encontrado. Execute a sincronização primeiro.' 
      });
    }

    // 2. Busca quem você segue via TweetAPI
    const following = await getAllFollowing(userId);
    
    if (following.length === 0) {
      return res.json({ 
        notFollowingBack: [],
        message: 'Você não segue ninguém' 
      });
    }

    // 3. Cria Set com IDs dos seus seguidores para busca rápida
    const followerIds = new Set(
      followers.map(f => f.id || f.id_str).filter(Boolean)
    );

    console.log(`[NotFollowingBack] Follower IDs únicos: ${followerIds.size}`);

    // 4. Filtra: você segue, mas não te seguem de volta
    // Normaliza os IDs para garantir compatibilidade
    const notFollowingBack = following
      .map(user => ({
        id: user.id || user.id_str,
        name: user.name,
        username: user.username || user.screen_name,
        profile_image_url: user.profile_image_url || user.profile_image_url_https,
      }))
      .filter(user => {
        const userId = user.id?.toString();
        return userId && !followerIds.has(userId);
      });

    console.log(`[NotFollowingBack] Não seguem de volta: ${notFollowingBack.length}`);

    // 5. Salva no Redis para cache (opcional, expira em 1 hora)
    if (notFollowingBack.length > 0) {
      await redis.set(
        `not-following-back:${userId}`,
        JSON.stringify(notFollowingBack),
        'ex',
        3600 // 1 hora
      );
    }

    res.json({ 
      notFollowingBack: notFollowingBack,
      count: notFollowingBack.length
    });

  } catch (error) {
    console.error('[NotFollowingBack] Erro:', error.message);
    res.status(500).json({ 
      error: 'Erro ao buscar dados',
      details: error.message 
    });
  }
}