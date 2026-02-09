import { TwitterApi } from 'twitter-api-v2';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});

  const accessToken = cookies?.twitter_access_token;

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { userIds } = req.body;

  if (!userIds || !Array.isArray(userIds)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const client = new TwitterApi(accessToken);
    const { data: me } = await client.v2.me();
    
    let unfollowed = 0;
    const errors = [];

    // Deixar de seguir cada usuário com delay para evitar rate limit
    for (const userId of userIds) {
      try {
        await client.v2.unfollow(me.id, userId);
        unfollowed++;
        
        // Delay de 1 segundo entre cada unfollow para respeitar rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error unfollowing ${userId}:`, error);
        errors.push({ userId, error: error.message });
      }
    }

    res.status(200).json({ 
      unfollowed, 
      total: userIds.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error in bulk unfollow:', error);
    res.status(500).json({ error: error.message });
  }
}
