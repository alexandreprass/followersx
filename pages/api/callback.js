import { TwitterApi } from 'twitter-api-v2';

export default async function handler(req, res) {
  const { code, state } = req.query;
  
  // Recuperar codeVerifier dos cookies
  const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});

  const codeVerifier = cookies?.twitter_code_verifier;
  const savedState = cookies?.twitter_state;

  if (!codeVerifier || !code || state !== savedState) {
    return res.status(400).json({ error: 'Invalid OAuth flow' });
  }

  try {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });

    const { client: loggedClient, accessToken, refreshToken } = 
      await client.loginWithOAuth2({ code, codeVerifier, redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/callback` });

    // Buscar informações do usuário
    const { data: userObject } = await loggedClient.v2.me({
      'user.fields': ['public_metrics', 'profile_image_url']
    });

    // Armazenar tokens de forma segura (em produção, use um banco de dados)
    res.setHeader('Set-Cookie', [
      `twitter_access_token=${accessToken}; HttpOnly; Path=/; Max-Age=7200`,
      `twitter_refresh_token=${refreshToken}; HttpOnly; Path=/; Max-Age=2592000`,
      `twitter_user=${JSON.stringify(userObject)}; Path=/; Max-Age=7200`
    ]);

    // Redirecionar para a página principal
    res.redirect('/');
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: error.message });
  }
}
