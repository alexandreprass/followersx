// lib/auth-middleware.js
// Middleware para gerenciar autenticação e refresh de tokens
import { TwitterApi } from 'twitter-api-v2';
import { serialize } from 'cookie';
import redis from './redis';

/**
 * Valida e renova tokens se necessário
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} { userId, accessToken, isValid }
 */
export async function validateAndRefreshAuth(req, res) {
  const { accessToken, refreshToken, userId } = req.cookies;

  // Verifica se tem os cookies necessários
  if (!accessToken || !userId) {
    return { isValid: false, error: 'Não autenticado' };
  }

  try {
    // Verifica se o token está próximo de expirar ou já expirou
    const tokenExpiry = await redis.get(`token:${userId}:expiry`);
    const now = Date.now();
    
    // Se token ainda válido (com 5 min de margem), retorna direto
    if (tokenExpiry && parseInt(tokenExpiry) > now + 300000) {
      return { 
        isValid: true, 
        userId, 
        accessToken,
        needsRefresh: false 
      };
    }

    // Token expirou ou está próximo - precisa fazer refresh
    if (!refreshToken) {
      return { isValid: false, error: 'Refresh token ausente, faça login novamente' };
    }

    console.log('[auth-middleware] Token expirado, renovando...');

    // Faz refresh do token
    const twitter = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET
    });

    const { 
      accessToken: newAccessToken, 
      refreshToken: newRefreshToken,
      expiresIn 
    } = await twitter.refreshOAuth2Token(refreshToken);

    console.log('[auth-middleware] Token renovado com sucesso!');

    // Calcula quando o token expira
    const expiryTime = now + (expiresIn * 1000);
    await redis.set(`token:${userId}:expiry`, expiryTime.toString(), { EX: expiresIn });

    // Atualiza cookies
    res.setHeader('Set-Cookie', [
      serialize('accessToken', newAccessToken, { 
        path: '/', 
        httpOnly: true, 
        secure: true, 
        sameSite: 'none', 
        maxAge: expiresIn 
      }),
      serialize('refreshToken', newRefreshToken || refreshToken, { 
        path: '/', 
        httpOnly: true, 
        secure: true, 
        sameSite: 'none', 
        maxAge: 31536000 
      }),
    ]);

    return { 
      isValid: true, 
      userId, 
      accessToken: newAccessToken,
      needsRefresh: true 
    };

  } catch (err) {
    console.error('[auth-middleware] Erro ao renovar token:', err.message);
    
    // Se falhar refresh, limpa cookies e pede novo login
    res.setHeader('Set-Cookie', [
      serialize('accessToken', '', { path: '/', maxAge: 0 }),
      serialize('refreshToken', '', { path: '/', maxAge: 0 }),
      serialize('userId', '', { path: '/', maxAge: 0 }),
    ]);

    return { 
      isValid: false, 
      error: 'Sessão expirada, faça login novamente' 
    };
  }
}

/**
 * Busca dados do usuário do cache (Redis)
 * Não faz chamadas à API do Twitter
 */
export async function getUserFromCache(userId) {
  try {
    const userData = await redis.hgetall(`user:${userId}`);
    
    if (!userData || Object.keys(userData).length === 0) {
      return null;
    }

    return {
      id: userId,
      name: userData.name || '',
      username: userData.username || '',
      profile_image_url: userData.profile_image_url || '',
      followers_count: parseInt(userData.followers_count || 0),
      following_count: parseInt(userData.following_count || 0),
      last_updated: userData.last_updated || null,
    };
  } catch (err) {
    console.error('[auth-middleware] Erro ao buscar cache:', err);
    return null;
  }
}

/**
 * Atualiza dados do usuário no cache
 * Deve ser chamado apenas quando realmente necessário (ex: sync)
 */
export async function updateUserCache(userId, userData) {
  try {
    await redis.hset(`user:${userId}`, {
      name: userData.name || '',
      username: userData.username || '',
      profile_image_url: userData.profile_image_url || '',
      followers_count: userData.followers_count || 0,
      following_count: userData.following_count || 0,
      last_updated: new Date().toISOString(),
    });
    
    return true;
  } catch (err) {
    console.error('[auth-middleware] Erro ao atualizar cache:', err);
    return false;
  }
}