// pages/api/callback.js - Versão corrigida com melhor debug e handling de erros
import { TwitterApi } from 'twitter-api-v2';
import { serialize } from 'cookie';
import redis from '../../lib/redis';

export default async function handler(req, res) {
  const { code, state } = req.query;
  const cookies = req.cookies || {};

  // Log completo para ajudar a debugar (veja no Vercel Functions Logs)
  console.log('Callback chamado:', {
    query: req.query,
    code: code ? 'presente' : 'ausente',
    state: state,
    savedState: cookies.oauthState,
    codeVerifier: cookies.codeVerifier ? 'presente' : 'ausente',
    fullCookies: Object.keys(cookies),
  });

  // Validações claras
  if (!code) {
    console.error('Code ausente no callback');
    return res.status(400).send('Erro na autenticação: code ausente');
  }

  if (!cookies.codeVerifier) {
    console.error('codeVerifier ausente no cookie');
    return res.status(400).send('Erro na autenticação: codeVerifier ausente');
  }

  if (state !== cookies.oauthState) {
    console.error('State mismatch:', { received: state, saved: cookies.oauthState });
    return res.status(400).send('Erro na autenticação: state mismatch');
  }

  try {
    const twitter = new TwitterApi({ clientId: process.env.TWITTER_CLIENT_ID });

    console.log('Tentando trocar code por tokens...');
    const { accessToken, refreshToken, expiresIn } = await twitter.loginWithOAuth2({
      code: code.toString(),
      codeVerifier: cookies.codeVerifier,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/callback`,
    });

    console.log('Tokens obtidos com sucesso');

    res.setHeader('Set-Cookie', [
      serialize('accessToken', accessToken, { path: '/', httpOnly: true, maxAge: expiresIn }),
      serialize('refreshToken', refreshToken || '', { path: '/', httpOnly: true, maxAge: 31536000 }),
    ]);

    const userClient = new TwitterApi(accessToken);
    const user = await userClient.v2.me({
      'user.fields': ['profile_image_url', 'public_metrics', 'name', 'username'],
    });

    const userId = user.data.id;
    console.log('Usuário autenticado:', user.data.username, userId);

    // Salva no Redis
    await redis.hset(`user:${userId}`, {
      name: user.data.name,
      username: user.data.username,
      profile_image_url: user.data.profile_image_url || '',
      followers_count: user.data.public_metrics.followers_count || 0,
      following_count: user.data.public_metrics.following_count || 0,
      last_updated: new Date().toISOString(),
    });

    console.log('Dados do usuário salvos no Redis');

    res.redirect('/dashboard');
  } catch (err) {
    console.error('Erro completo no callback:', err.message, err.stack || err);
    res.status(500).send(`Erro interno na autenticação: ${err.message}`);
  }
}