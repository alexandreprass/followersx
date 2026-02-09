import { TwitterApi } from 'twitter-api-v2';

export default async function handler(req, res) {
  const { code, state } = req.query;
  
  console.log('Callback received:', { code: !!code, state: !!state });
  
  // Recuperar codeVerifier dos cookies
  const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {}) || {};

  const codeVerifier = cookies.twitter_code_verifier;
  const savedState = cookies.twitter_state;

  console.log('Cookies received:', { 
    hasCodeVerifier: !!codeVerifier, 
    hasSavedState: !!savedState,
    stateMatch: state === savedState 
  });

  if (!codeVerifier) {
    console.error('Missing codeVerifier');
    return res.redirect('/?error=missing_code_verifier');
  }

  if (!code) {
    console.error('Missing authorization code');
    return res.redirect('/?error=missing_code');
  }

  if (state !== savedState) {
    console.error('State mismatch');
    return res.redirect('/?error=state_mismatch');
  }

  try {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });

    // Remover barra final da URL se existir
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

    console.log('Attempting OAuth2 login...');
    
    const { client: loggedClient, accessToken, refreshToken } = 
      await client.loginWithOAuth2({ 
        code, 
        codeVerifier, 
        redirectUri: `${baseUrl}/api/callback` 
      });

    console.log('OAuth2 login successful');

    // Buscar informações do usuário
    const { data: userObject } = await loggedClient.v2.me({
      'user.fields': ['public_metrics', 'profile_image_url']
    });

    console.log('User data retrieved:', userObject.username);

    // Limpar cookies do OAuth
    const isProduction = process.env.NODE_ENV === 'production';
    const secureCookie = isProduction ? '; Secure' : '';
    
    res.setHeader('Set-Cookie', [
      `twitter_code_verifier=; HttpOnly; Path=/; Max-Age=0`,
      `twitter_state=; HttpOnly; Path=/; Max-Age=0`,
      `twitter_access_token=${accessToken}; HttpOnly; Path=/; Max-Age=7200; SameSite=Lax${secureCookie}`,
      `twitter_refresh_token=${refreshToken}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax${secureCookie}`,
      `twitter_user=${encodeURIComponent(JSON.stringify(userObject))}; Path=/; Max-Age=7200; SameSite=Lax${secureCookie}`
    ]);

    // Redirecionar para a página principal
    res.redirect('/');
  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect(`/?error=${encodeURIComponent(error.message)}`);
  }
}
