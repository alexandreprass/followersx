import { TwitterApi } from 'twitter-api-v2';
import redis from '../../lib/redis';  // caminho relativo

export default async function handler(req, res) {
  const accessToken = req.cookies.accessToken;
  if (!accessToken) return res.status(401).json({ error: 'Não autenticado' });

  const client = new TwitterApi(accessToken);
  const me = await client.v2.me();
  const userId = me.data.id;

  const followersRes = await client.v2.followers(userId, {
    max_results: 1000,
    'user.fields': ['profile_image_url', 'name', 'username'],
  });

  const followersList = followersRes.data?.map(u => ({
    id: u.id,
    username: u.username,
    name: u.name,
    profile_image_url: u.profile_image_url || '',
  })) || [];

  await redis.set(`followers:${userId}:current`, JSON.stringify(followersList));
  await redis.hset(`user:${userId}`, 'followers_count', followersRes.meta.result_count || 0);

  res.json({ followers: followersList, count: followersRes.meta.result_count || 0 });
}