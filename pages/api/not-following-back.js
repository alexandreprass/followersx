import { TwitterApi } from 'twitter-api-v2';

export default async function handler(req, res) {
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
    const { data: me } = await client.v2.me();
    
    // Buscar quem o usuário segue
    const following = [];
    let followingToken;
    
    do {
      const response = await client.v2.following(me.id, {
        max_results: 1000,
        pagination_token: followingToken,
        'user.fields': ['username', 'name', 'profile_image_url']
      });
      
      if (response.data) {
        following.push(...response.data);
      }
      followingToken = response.meta?.next_token;
      
    } while (followingToken);

    // Buscar seguidores
    const followers = [];
    let followersToken;
    
    do {
      const response = await client.v2.followers(me.id, {
        max_results: 1000,
        pagination_token: followersToken,
        'user.fields': ['username', 'name', 'profile_image_url']
      });
      
      if (response.data) {
        followers.push(...response.data);
      }
      followersToken = response.meta?.next_token;
      
    } while (followersToken);

    // Encontrar quem não segue de volta
    const followerIds = new Set(followers.map(f => f.id));
    const notFollowingBack = following.filter(user => !followerIds.has(user.id));

    res.status(200).json({ users: notFollowingBack, total: notFollowingBack.length });
  } catch (error) {
    console.error('Error checking not following back:', error);
    res.status(500).json({ error: error.message });
  }
}
