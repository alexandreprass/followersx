import { TwitterApi } from 'twitter-api-v2';
import { serialize } from 'cookie';
import redis from '../../lib/redis';

export default async function handler(req, res) {
  const { code, state } = req.query;
  const cookies = req.cookies || {};

  console.log('Callback chamado - Query:', req.query);
  console.log('Cookies recebidos:', Object.keys(cookies));
  console.log('state recebido:', state);
  console.log('oauthState no cookie:', cookies.oauthState);
  console.log('codeVerifier no cookie:', cookies.codeVerifier ? 'presente' : 'ausente');

  if (!code) {
    return res.status(400).send('Erro na autenticação: code ausente');
  }

  if (!cookies.codeVerifier) {
    return res.status(400).send('Erro na autenticação: codeVerifier ausente');
  }

  if (state !== cookies.oauthState) {
    console.error('State mismatch');
    return res.status(400).send('Erro na autenticação: state mismatch');
  }

  try {
    const twitter = new TwitterApi({ clientId: process.env.TWITTER_CLIENT_ID });

    console.log('Trocando code por tokens...');
    const { accessToken, refreshToken, expiresIn } = await twitter.loginWithOAuth2({
      code: code.toString(),
      codeVerifier: cookies.codeVerifier,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/callback`,
    });

    console.log('Tokens obtidos');

    res.setHeader('Set-Cookie', [
      serialize('accessToken', accessToken, { path: '/', httpOnly: true, secure: true, sameSite: 'none', maxAge: expiresIn }),
      serialize('refreshToken', refreshToken || '', { path: '/', httpOnly: true, secure: true, sameSite: 'none', maxAge: 31536000 }),
    ]);

    const userClient = new TwitterApi(accessToken);
    const user = await userClient.v2.me({ 'user.fields': ['profile_image_url', 'public_metrics', 'name', 'username'] });

    const userId = user.data.id;
    console.log('Usuário autenticado:', user.data.username, userId);

    await redis.hset(`user:${userId}`, {
      name: user.data.name,
      username: user.data.username,
      profile_image_url: user.data.profile_image_url || '',
      followers_count: user.data.public_metrics.followers_count || 0,
      following_count: user.data.public_metrics.following_count || 0,
      last_updated: new Date().toISOString(),
    });

    console.log('Dados salvos no Redis');

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Erro no callback:', err.message, err.stack || err);
    res.status(500).send(`Erro interno: ${err.message}`);
  }
}