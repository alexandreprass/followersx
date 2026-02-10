// pages/api/sync-followers.js - VERSÃO ATUALIZADA
import { TwitterApi } from 'twitter-api-v2';
import redis from '../../lib/redis';

export default async function handler(req, res) {
  const accessToken = req.cookies.accessToken;
  const userId = req.cookies.userId;

  if (!accessToken) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'UserId não encontrado' });
  }

  try {
    console.log('[sync-followers] Iniciando sincronização para userId:', userId);

    const client = new TwitterApi(accessToken);
    
    // Busca informações atualizadas do usuário
    const me = await client.v2.me({
      'user.fields': ['profile_image_url', 'public_metrics', 'name', 'username'],
    });

    console.log('[sync-followers] Dados do usuário obtidos:', me.data.username);

    // Atualiza dados básicos do usuário no Redis
    await redis.hset(`user:${userId}`, {
      name: me.data.name,
      username: me.data.username,
      profile_image_url: me.data.profile_image_url || '',
      followers_count: me.data.public_metrics.followers_count || 0,
      following_count: me.data.public_metrics.following_count || 0,
      last_updated: new Date().toISOString(),
    });

    // Busca lista ATUAL de seguidores da API do Twitter
    console.log('[sync-followers] Buscando seguidores atuais...');
    const currentRes = await client.v2.followers(userId, { 
      max_results: 1000,
      'user.fields': ['profile_image_url', 'name', 'username'],
    });

    const currentFollowers = currentRes.data || [];
    const currentIds = currentFollowers.map(u => u.id);

    console.log('[sync-followers] Seguidores atuais:', currentIds.length);

    // Busca lista ANTERIOR de seguidores do Redis
    const prevStr = await redis.get(`followers:${userId}:current`);
    const prevFollowers = prevStr ? JSON.parse(prevStr) : [];
    const prevIds = prevFollowers.map(u => u.id);

    console.log('[sync-followers] Seguidores anteriores no Redis:', prevIds.length);

    // Detecta quem deixou de seguir (estava na lista anterior mas não está na atual)
    const unfollowerIds = prevIds.filter(id => !currentIds.includes(id));

    console.log('[sync-followers] Unfollowers detectados:', unfollowerIds.length);

    // Salva unfollowers no Redis (com dados completos)
    if (unfollowerIds.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      
      // Busca dados completos dos unfollowers da lista anterior
      const unfollowersData = prevFollowers
        .filter(u => unfollowerIds.includes(u.id))
        .map(u => ({
          id: u.id,
          username: u.username,
          name: u.name,
          profile_image_url: u.profile_image_url || '',
          date: today,
        }));

      // Salva cada unfollower na lista do dia
      const entries = unfollowersData.map(u => JSON.stringify(u));
      await redis.rpush(`unfollowers:${userId}:${today}`, ...entries);
      await redis.expire(`unfollowers:${userId}:${today}`, 30 * 24 * 60 * 60); // 30 dias

      console.log('[sync-followers] Unfollowers salvos no Redis:', unfollowersData.length);
    }

    // Atualiza lista atual de seguidores no Redis
    const followersToSave = currentFollowers.map(u => ({
      id: u.id,
      username: u.username,
      name: u.name,
      profile_image_url: u.profile_image_url || '',
    }));

    await redis.set(`followers:${userId}:current`, JSON.stringify(followersToSave));

    console.log('[sync-followers] Lista de seguidores atualizada no Redis');

    // Retorna resultado
    res.json({ 
      success: true,
      message: 'Lista de seguidores atualizada com sucesso! Volte amanhã ou mais tarde para atualizar novamente e ver quem deixou de te seguir.',
      stats: {
        current_followers: currentIds.length,
        new_unfollowers: unfollowerIds.length,
        unfollowers: prevIds.length > 0 ? unfollowerIds.length : null,
      },
      unfollowers: unfollowerIds.length > 0 ? prevFollowers.filter(u => unfollowerIds.includes(u.id)) : [],
    });

  } catch (err) {
    console.error('[sync-followers] ERRO:', err.message, err.data || err);
    
    // Verifica se é erro de permissão do Twitter
    if (err.code === 403) {
      return res.status(403).json({ 
        error: 'Acesso negado pela API do Twitter',
        message: 'Seu App precisa estar vinculado a um Project no Twitter Developer Portal. Veja: https://developer.twitter.com/en/docs/projects/overview',
        details: err.data || err.message,
      });
    }

    res.status(500).json({ 
      error: 'Erro ao sincronizar seguidores', 
      details: err.message,
    });
  }
}