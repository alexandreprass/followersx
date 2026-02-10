// pages/api/session-status.js
// Endpoint de debug para verificar status da autenticação
import { validateAndRefreshAuth } from '../../lib/auth-middleware';
import redis from '../../lib/redis';

export default async function handler(req, res) {
  const { accessToken, refreshToken, userId } = req.cookies;

  // Informações básicas
  const status = {
    hasCookies: {
      accessToken: !!accessToken,
      refreshToken: !!refreshToken,
      userId: !!userId,
    },
    userId: userId || null,
    timestamp: new Date().toISOString(),
  };

  // Se tem userId, busca mais info do Redis
  if (userId) {
    try {
      const tokenExpiry = await redis.get(`token:${userId}:expiry`);
      const userData = await redis.hgetall(`user:${userId}`);
      
      if (tokenExpiry) {
        const expiryDate = new Date(parseInt(tokenExpiry));
        const now = new Date();
        const minutesUntilExpiry = Math.floor((expiryDate - now) / 1000 / 60);
        
        status.token = {
          expiresAt: expiryDate.toISOString(),
          expiresIn: minutesUntilExpiry > 0 ? `${minutesUntilExpiry} minutos` : 'Expirado',
          isExpired: minutesUntilExpiry <= 0,
        };
      }

      if (userData && Object.keys(userData).length > 0) {
        status.user = {
          username: userData.username,
          name: userData.name,
          lastUpdated: userData.last_updated,
        };
      }
    } catch (err) {
      status.error = err.message;
    }
  }

  // Tenta validar e fazer refresh se necessário
  const auth = await validateAndRefreshAuth(req, res);
  status.authValidation = {
    isValid: auth.isValid,
    needsRefresh: auth.needsRefresh,
    error: auth.error || null,
  };

  res.json(status);
}