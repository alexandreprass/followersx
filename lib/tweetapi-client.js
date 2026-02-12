// lib/tweetapi-client.js
// Cliente para TweetAPI - usado apenas para buscar lista de seguidores
// VERSÃO DEBUG: Logs extras para identificar problemas

/**
 * Busca lista de seguidores via TweetAPI
 * @param {string} userId - ID do usuário do Twitter
 * @param {string} cursor - Cursor para paginação (opcional)
 * @returns {Promise<Object>} - Objeto com users e nextCursor
 */
export async function getFollowersFromTweetAPI(userId, cursor = '-1') {
  const apiKey = process.env.TWEETAPI_KEY;
  
  console.log(`[TweetAPI Client] getFollowersFromTweetAPI chamada - userId: ${userId}, cursor: ${cursor}`);
  
  if (!apiKey) {
    console.error('[TweetAPI Client] ❌ TWEETAPI_KEY não configurada!');
    throw new Error('TWEETAPI_KEY não configurada nas variáveis de ambiente');
  }

  console.log(`[TweetAPI Client] ✅ TWEETAPI_KEY encontrada (primeiros 10 chars): ${apiKey.substring(0, 10)}...`);

  try {
    console.log('[TweetAPI Client] 📡 Fazendo requisição POST para TweetAPI...');
    console.log('[TweetAPI Client] URL:', 'https://api.tweetapi.com/api/v1/followers/list');
    console.log('[TweetAPI Client] Body:', JSON.stringify({
      user_id: userId,
      count: 200,
      cursor: cursor,
    }));
    
    const response = await fetch('https://api.tweetapi.com/api/v1/followers/list', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        count: 200, // Máximo permitido por requisição
        cursor: cursor,
      }),
    });

    console.log(`[TweetAPI Client] 📥 Resposta recebida - Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TweetAPI Client] ❌ Erro na resposta: ${response.status}`);
      console.error(`[TweetAPI Client] Corpo do erro:`, errorText);
      throw new Error(`TweetAPI error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`[TweetAPI Client] ✅ JSON parseado com sucesso`);
    console.log(`[TweetAPI Client] Usuários retornados: ${data.users?.length || 0}`);
    console.log(`[TweetAPI Client] Next cursor: ${data.nextCursor_str || data.nextCursor || '0'}`);
    
    if (data.users && data.users.length > 0) {
      console.log(`[TweetAPI Client] 📋 Exemplo do primeiro usuário:`, JSON.stringify(data.users[0]));
    }
    
    return {
      users: data.users || [],
      nextCursor: data.nextCursor || 0,
      nextCursor_str: data.nextCursor_str || '0',
    };
  } catch (error) {
    console.error('[TweetAPI Client] ❌❌❌ ERRO FATAL ❌❌❌');
    console.error('[TweetAPI Client] Tipo:', error.constructor.name);
    console.error('[TweetAPI Client] Mensagem:', error.message);
    console.error('[TweetAPI Client] Stack:', error.stack);
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

  console.log(`[TweetAPI getAllFollowers] ========== INÍCIO ==========`);
  console.log(`[TweetAPI getAllFollowers] UserId: ${userId}`);
  console.log(`[TweetAPI getAllFollowers] Max páginas: ${maxPages}`);

  while (cursor !== '0' && cursor !== 0 && pageCount < maxPages) {
    try {
      console.log(`[TweetAPI getAllFollowers] 📄 Página ${pageCount + 1}/${maxPages} - Cursor: ${cursor}`);
      
      const result = await getFollowersFromTweetAPI(userId, cursor);
      
      if (result.users && result.users.length > 0) {
        allFollowers = [...allFollowers, ...result.users];
        console.log(`[TweetAPI getAllFollowers] ✅ Página ${pageCount + 1}: +${result.users.length} seguidores. Total acumulado: ${allFollowers.length}`);
      } else {
        console.log(`[TweetAPI getAllFollowers] ℹ️ Nenhum seguidor retornado na página ${pageCount + 1}. Finalizando.`);
        break;
      }

      cursor = result.nextCursor_str || result.nextCursor;
      console.log(`[TweetAPI getAllFollowers] Próximo cursor: ${cursor}`);
      
      pageCount++;

      // Delay entre requisições para evitar rate limit
      if (cursor !== '0' && cursor !== 0) {
        console.log(`[TweetAPI getAllFollowers] ⏳ Aguardando 1 segundo antes da próxima requisição...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo
      }
    } catch (error) {
      console.error(`[TweetAPI getAllFollowers] ❌ Erro na página ${pageCount + 1}:`, error.message);
      console.error(`[TweetAPI getAllFollowers] Retornando ${allFollowers.length} seguidores coletados até agora`);
      // Se der erro, retorna o que conseguiu até agora
      break;
    }
  }

  console.log(`[TweetAPI getAllFollowers] ========== FIM ==========`);
  console.log(`[TweetAPI getAllFollowers] 🎉 Total de seguidores coletados: ${allFollowers.length}`);
  console.log(`[TweetAPI getAllFollowers] Total de páginas processadas: ${pageCount}`);
  
  return allFollowers;
}

/**
 * Normaliza dados de seguidor para formato consistente
 * @param {Object} user - Objeto de usuário da TweetAPI
 * @returns {Object} - Objeto normalizado
 */
export function normalizeFollowerData(user) {
  const normalized = {
    id: user.id_str || user.id?.toString(),
    name: user.name,
    username: user.screen_name || user.username,
    profile_image_url: user.profile_image_url || user.profile_image_url_https,
  };
  
  // Log apenas do primeiro para não poluir
  if (!normalizeFollowerData._logged) {
    console.log('[TweetAPI normalizeFollowerData] Exemplo de normalização:', JSON.stringify(normalized));
    normalizeFollowerData._logged = true;
  }
  
  return normalized;
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