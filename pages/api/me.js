// pages/api/me.js - Retorna dados do usuário salvos no Redis
import redis from '../../lib/redis';

export default async function handler(req, res) {
  const accessToken = req.cookies.accessToken;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  try {
    // Pega o userId do cookie (foi salvo no callback)
    const userId = req.cookies.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'UserId não encontrado' });
    }

    // Busca dados do usuário no Redis
    const userData = await redis.hgetall(`user:${userId}`);

    if (!userData || Object.keys(userData).length === 0) {
      return res.status(404).json({ error: 'Dados do usuário não encontrados no Redis' });
    }

    // Busca estatísticas de seguidores
    const followersData = await redis.get(`followers:${userId}:current`);
    const followers = followersData ? JSON.parse(followersData) : [];

    // Busca unfollowers dos últimos 30 dias
    const today = new Date();
    let totalUnfollowers = 0;

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const dayUnfollowers = await redis.lrange(`unfollowers:${userId}:${dateKey}`, 0, -1);
      totalUnfollowers += dayUnfollowers.length;
    }

    // Retorna dados completos
    res.json({
      user: {
        id: userId,
        name: userData.name || '',
        username: userData.username || '',
        profile_image_url: userData.profile_image_url || '',
        followers_count: parseInt(userData.followers_count || 0),
        following_count: parseInt(userData.following_count || 0),
        last_updated: userData.last_updated || null,
      },
      stats: {
        followers_count: followers.length,
        unfollowers_count_30d: totalUnfollowers,
      }
    });

  } catch (err) {
    console.error('[me] Erro ao buscar dados:', err);
    res.status(500).json({ error: 'Erro ao buscar dados do usuário', details: err.message });
  }
}