// pages/api/followers.js
// CORRIGIDO: Agora busca os seguidores do Redis (salvos pela TweetAPI)
import { TwitterApi } from 'twitter-api-v2';
import redis from '../../lib/redis';

export default async function handler(req, res) {
  const accessToken = req.cookies.accessToken;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  try {
    // 1. Pegar o userId do usuário autenticado
    const client = new TwitterApi(accessToken);
    const { data: me } = await client.v2.me();
    const userId = me.id;
    
    console.log(`[Followers API] Buscando seguidores do Redis para userId: ${userId}`);

    // 2. CORRIGIDO: Buscar seguidores salvos no Redis (pela TweetAPI)
    const followersStr = await redis.get(`followers:${userId}:list`);
    
    console.log(`[Followers API] Redis retornou:`, followersStr ? `${followersStr.length} caracteres` : 'null/vazio');
    
    if (!followersStr || followersStr.trim() === '') {
      console.log('[Followers API] Nenhum seguidor encontrado no Redis. Execute sync-followers primeiro.');
      return res.json({ 
        followers: [], 
        count: 0,
        message: 'Clique em "Atualizar Dados" para buscar seus seguidores pela primeira vez.'
      });
    }

    let followers;
    try {
      followers = JSON.parse(followersStr);
      console.log(`[Followers API] ${followers.length} seguidores encontrados no Redis`);
    } catch (parseError) {
      console.error('[Followers API] Erro ao fazer parse do JSON:', parseError);
      console.error('[Followers API] String recebida:', followersStr.substring(0, 100));
      return res.json({ 
        followers: [], 
        count: 0,
        message: 'Erro ao ler dados salvos. Clique em "Atualizar Dados" novamente.'
      });
    }

    res.json({ 
      followers: followers, 
      count: followers.length 
    });

  } catch (error) {
    console.error('[Followers API] Erro:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar seguidores',
      details: error.message 
    });
  }
}