import redis from '../../lib/redis';  // caminho relativo correto

export default async function handler(req, res) {
  const accessToken = req.cookies.accessToken;
  if (!accessToken) return res.status(401).json({ error: 'Não autenticado' });

  // Assuma userId do cookie ou query; pra simplicidade, pegue de me (mas precisa client Twitter se não salvo)
  const { userId } = req.query;  // Ou derive de token

  await redis.ping(); // teste simples de conexão

  // Pega histórico últimos 30 dias
  const today = new Date();
  const unfollowersHistory = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];

    const dayUnfollowers = await redis.lrange(`unfollowers:${userId}:${dateKey}`, 0, -1);
    if (dayUnfollowers.length > 0) {
      unfollowersHistory.push({ date: dateKey, unfollowers: dayUnfollowers.map(JSON.parse) });
    }
  }

  res.json({ history: unfollowersHistory });
}