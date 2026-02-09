import { TwitterApi } from 'twitter-api-v2';

export default async function handler(req, res) {
  // Recuperar access token dos cookies
  const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});

  const accessToken = cookies?.twitter_access_token;

  if (!accessToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const client = new TwitterApi(accessToken);
    
    // Buscar ID do usuário
    const { data: me } = await client.v2.me();
    
    // Buscar todos os seguidores (com paginação)
    const followers = [];
    let paginationToken;
    
    do {
      const response = await client.v2.followers(me.id, {
        max_results: 1000,
        pagination_token: paginationToken,
        'user.fields': ['username', 'name', 'profile_image_url']
      });
      
      if (response.data) {
        followers.push(...response.data);
      }
      paginationToken = response.meta?.next_token;
      
    } while (paginationToken);

    res.status(200).json({ followers });
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ error: error.message });
  }
}
