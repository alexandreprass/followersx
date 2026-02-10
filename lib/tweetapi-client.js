// lib/tweetapi-client.js
// Cliente para TweetAPI - usado apenas para buscar lista de seguidores

/**
 * Busca lista de seguidores via TweetAPI
 * @param {string} userId - ID do usuário do Twitter
 * @param {string} cursor - Cursor para paginação (opcional)
 * @returns {Promise<Object>} - Objeto com users e next_cursor
 */
export async function getFollowersFromTweetAPI(userId, cursor = '-1') {
  const apiKey = process.env.TWEETAPI_KEY;
  
  if (!apiKey) {
    throw new Error('TWEETAPI_KEY não configurada nas variáveis de ambiente');
  }

  try {
    const response = await fetch('https://api.tweetapi.com/api/v1/followers/list', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        count: 200, // Máximo permitido por requisição (verificar docs da TweetAPI)
        cursor: cursor,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TweetAPI error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return {
      users: data.users || [],
      next_cursor: data.next_cursor || 0,
      next_cursor_str: data.next_cursor_str || '0',
    };
  } catch (error) {
    console.error('Erro ao buscar seguidores via TweetAPI:', error);
    throw error;
  }
}

/**
 * Busca TODOS os seguidores de um usuário (paginado)
 * @param {string} userId - ID do usuário do Twitter
 * @param {number} maxPages - Número máximo de páginas a buscar (segurança)
 * @returns {Promise<Array>} - Array com todos os seguidores
 */
export async function getAllFollowers(userId, maxPages = 50) {
  let allFollowers = [];
  let cursor = '-1';
  let pageCount = 0;

  console.log(`[TweetAPI] Iniciando busca de seguidores para userId: ${userId}`);

  while (cursor !== '0' && cursor !== 0 && pageCount < maxPages) {
    try {
      console.log(`[TweetAPI] Buscando página ${pageCount + 1}, cursor: ${cursor}`);
      
      const result = await getFollowersFromTweetAPI(userId, cursor);
      
      if (result.users && result.users.length > 0) {
        allFollowers = [...allFollowers, ...result.users];
        console.log(`[TweetAPI] Página ${pageCount + 1}: ${result.users.length} seguidores. Total: ${allFollowers.length}`);
      } else {
        console.log(`[TweetAPI] Nenhum seguidor retornado na página ${pageCount + 1}. Finalizando.`);
        break;
      }

      cursor = result.next_cursor_str || result.next_cursor;
      pageCount++;

      // Delay entre requisições para evitar rate limit
      if (cursor !== '0' && cursor !== 0) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo
      }
    } catch (error) {
      console.error(`[TweetAPI] Erro na página ${pageCount + 1}:`, error);
      // Se der erro, retorna o que conseguiu até agora
      break;
    }
  }

  console.log(`[TweetAPI] Busca finalizada. Total de seguidores: ${allFollowers.length}`);
  return allFollowers;
}

/**
 * Normaliza dados de seguidor para formato consistente
 * @param {Object} user - Objeto de usuário da TweetAPI
 * @returns {Object} - Objeto normalizado
 */
export function normalizeFollowerData(user) {
  return {
    id: user.id_str || user.id?.toString(),
    name: user.name,
    username: user.screen_name || user.username,
    profile_image_url: user.profile_image_url || user.profile_image_url_https,
  };
}

/**
 * Busca informações de um usuário específico via TweetAPI
 * NOTA: Use isso apenas se necessário. Para dados do perfil do usuário logado,
 * use a API Oficial (Twitter API v2) que já está autenticada via OAuth.
 */
export async function getUserInfo(userId) {
  const apiKey = process.env.TWEETAPI_KEY;
  
  if (!apiKey) {
    throw new Error('TWEETAPI_KEY não configurada nas variáveis de ambiente');
  }

  try {
    const response = await fetch('https://api.tweetapi.com/api/v1/users/show', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TweetAPI error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar informações do usuário via TweetAPI:', error);
    throw error;
  }
}