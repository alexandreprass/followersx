import { TwitterApi } from 'twitter-api-v2';

export default async function handler(req, res) {
  const accessToken = req.cookies.accessToken;
  if (!accessToken) return res.status(401).json({ error: 'Não autenticado' });

  const { userIds } = req.body;
  if (!Array.isArray(userIds)) return res.status(400).json({ error: 'IDs inválidos' });

  const client = new TwitterApi(accessToken);
  const me = await client.v2.me();
  const sourceUserId = me.data.id;

  for (const targetUserId of userIds) {
    try {
      await client.v2.unfollow(sourceUserId, targetUserId);
      await new Promise(r => setTimeout(r, 1200)); // delay seguro
    } catch (err) {
      console.error(`Erro unfollow ${targetUserId}:`, err);
    }
  }

  res.json({ message: 'Unfollow em massa concluído' });
}