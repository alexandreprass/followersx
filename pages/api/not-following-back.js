// pages/api/not-following-back.js
// VERSÃO COMPLETA - Busca quem você segue mas não te segue de volta
import { validateAndRefreshAuth } from '../../lib/auth-middleware';
import redis from '../../lib/redis';

/**
 * Busca lista de quem o usuário segue via TweetAPI v2
 */
async function getFollowingFromTweetAPI(userId, paginationToken = null) {
  const apiKey = process.env.TWEETAPI_KEY;
  
  if (!apiKey) {
    throw new Error('TWEETAPI_KEY não configurada');
  }

  const url = 'https://api.tweetapi.com/api/v2/users/following';
  const requestBody = {
    user_id: userId,
    max_results: 1000, // Máximo permitido pela v2
  };

  if (paginationToken) {
    requestBody.pagination_token = paginationToken;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TweetAPI error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return {
    users: data.data || [],
    next_token: data.meta?.next_token || null,
  };
}

/**
 * Busca TODOS que o usuário segue (paginado)
 */
async function getAllFollowing(userId, maxPages = 50) {
  let allFollowing = [];
  let paginationToken = null;
  let pageCount = 0;

  console.log(`[NotFollowingBack] Buscando following para userId: ${userId}`);

  while (pageCount < maxPages) {
    try {
      console.log(`[NotFollowingBack] Página ${pageCount + 1} - Token: ${paginationToken || 'inicial'}`);
      
      const result = await getFollowingFromTweetAPI(userId, paginationToken);
      
      if (result.users && result.users.length > 0) {
        allFollowing = [...allFollowing, ...result.users];
        console.log(`[NotFollowingBack] +${result.users.length} following. Total: ${allFollowing.length}`);
      } else {
        console.log(`[NotFollowingBack] Nenhum usuário retornado. Finalizando.`);
        break;
      }

      paginationToken = result.next_token;
      pageCount++;

      // Se não houver próximo token, acabou a paginação
      if (!paginationToken) {
        console.log(`[NotFollowingBack] Fim da paginação (sem next_token)`);
        break;
      }

      // Delay para evitar rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`[NotFollowingBack] Erro na página ${pageCount + 1}:`, error.message);
      break;
    }
  }

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
    const notFollowingBack = following
      .map(user => ({
        id: user.id || user.id_str,
        name: user.name,
        username: user.username,
        profile_image_url: user.profile_image_url,
      }))
      .filter(user => !followerIds.has(user.id));

    console.log(`[NotFollowingBack] Não seguem de volta: ${notFollowingBack.length}`);

    // 5. Salva no Redis para cache (opcional, expira em 1 hora)
    if (notFollowingBack.length > 0) {
      await redis.set(
        `not-following-back:${userId}`,
        JSON.stringify(notFollowingBack),
        'EX',
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