// pages/api/callback.js - Versão PKCE sem Client Secret
import { TwitterApi } from 'twitter-api-v2';
import { serialize } from 'cookie';
import redis from '../../lib/redis';

export default async function handler(req, res) {
  const { code, state } = req.query;
  const cookies = req.cookies || {};

  console.log('[callback] Query:', req.query);
  console.log('[callback] Cookies:', Object.keys(cookies));
  console.log('[callback] state:', state, 'oauthState cookie:', cookies.oauthState);
  console.log('[callback] codeVerifier presente?', !!cookies.codeVerifier);

  if (!code) return res.status(400).send('Code ausente');
  if (!cookies.codeVerifier) return res.status(400).send('codeVerifier ausente');
  if (state !== cookies.oauthState) return res.status(400).send('State mismatch');

  try {
    console.log('[callback] Iniciando troca PKCE (sem Client Secret)...');

    // Cria cliente só com Client ID (PKCE não usa Secret)
    const twitter = new TwitterApi({ clientId: process.env.TWITTER_CLIENT_ID });

    const { accessToken, refreshToken, expiresIn } = await twitter.loginWithOAuth2({
      code: code.toString(),
      codeVerifier: cookies.codeVerifier,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/callback`,
    });

    console.log('[callback] Tokens obtidos!');

    res.setHeader('Set-Cookie', [
      serialize('accessToken', accessToken, { path: '/', httpOnly: true, secure: true, sameSite: 'none', maxAge: expiresIn }),
      serialize('refreshToken', refreshToken || '', { path: '/', httpOnly: true, secure: true, sameSite: 'none', maxAge: 31536000 }),
    ]);

    const userClient = new TwitterApi(accessToken);
    const user = await userClient.v2.me({
      'user.fields': ['profile_image_url', 'public_metrics', 'name', 'username'],
    });

    const userId = user.data.id;
    console.log('[callback] Usuário OK:', user.data.username, userId);

    await redis.hset(`user:${userId}`, {
      name: user.data.name,
      username: user.data.username,
      profile_image_url: user.data.profile_image_url || '',
      followers_count: user.data.public_metrics.followers_count || 0,
      following_count: user.data.public_metrics.following_count || 0,
      last_updated: new Date().toISOString(),
    });

    res.redirect('/dashboard');
  } catch (err) {
    console.error('[callback] ERRO DETALHADO:', err.message, err.data || err);
    res.status(500).send(`Erro na troca de tokens: ${err.message}`);
  }
}