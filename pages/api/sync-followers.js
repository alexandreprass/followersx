import { TwitterApi } from 'twitter-api-v2';
import redis from '../../lib/redis';

export default async function handler(req, res) {
  const accessToken = req.cookies.accessToken;
  if (!accessToken) return res.status(401).json({ error: 'Não autenticado' });

  const client = new TwitterApi(accessToken);
  const me = await client.v2.me();
  const userId = me.data.id;

  const currentRes = await client.v2.followers(userId, { max_results: 1000 });
  const currentIds = currentRes.data?.map(u => u.id) || [];

  const prevStr = await redis.get(`followers:${userId}:current`);
  const prevIds = prevStr ? JSON.parse(prevStr).map(u => u.id) : [];

  const unfollowers = prevIds.filter(id => !currentIds.includes(id));

  if (unfollowers.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const entries = unfollowers.map(id => JSON.stringify({ id, date: today }));
    await redis.rpush(`unfollowers:${userId}:${today}`, ...entries);
    await redis.expire(`unfollowers:${userId}:${today}`, 30 * 24 * 60 * 60); // 30 dias
  }

  await redis.set(`followers:${userId}:current`, JSON.stringify(currentRes.data || []));

  res.json({ unfollowers, message: 'Sincronizado' });
}