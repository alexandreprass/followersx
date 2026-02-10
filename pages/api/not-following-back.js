import { TwitterApi } from 'twitter-api-v2';
import redis from '../../lib/redis';  // caminho relativo

export default async function handler(req, res) {
  const accessToken = req.cookies.accessToken;
  if (!accessToken) return res.status(401).json({ error: 'Não autenticado' });

  const client = new TwitterApi(accessToken);
  const me = await client.v2.me();

  const userId = me.data.id;

  // Pega quem você segue
  const followingRes = await client.v2.following(userId, { max_results: 1000 });

  // Pega followers atuais do Redis
  const followersStr = await redis.get(`followers:${userId}:current`);
  const followersIds = followersStr ? JSON.parse(followersStr).map(u => u.id) : [];

  // Quem não segue de volta
  const notFollowingBack = followingRes.data?.filter(u => !followersIds.includes(u.id)) || [];

  res.json({ notFollowingBack });
}