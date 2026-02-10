import { TwitterApi } from 'twitter-api-v2';
import { serialize } from 'cookie';
import redis from '../../lib/redis';

export default async function handler(req, res) {
  const { code, state } = req.query;
  const cookies = req.cookies || {};

  if (!code || !cookies.codeVerifier || state !== cookies.oauthState) {
    return res.status(400).send('Erro na autenticação');
  }

  const twitter = new TwitterApi({ clientId: process.env.TWITTER_CLIENT_ID });

  const { accessToken, refreshToken, expiresIn } = await twitter.loginWithOAuth2({
    code: code.toString(),
    codeVerifier: cookies.codeVerifier,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/callback`,
  });

  res.setHeader('Set-Cookie', [
    serialize('accessToken', accessToken, { path: '/', httpOnly: true, maxAge: expiresIn }),
    serialize('refreshToken', refreshToken || '', { path: '/', httpOnly: true, maxAge: 31536000 }),
  ]);

  const userClient = new TwitterApi(accessToken);
  const user = await userClient.v2.me({ 'user.fields': ['profile_image_url', 'public_metrics', 'name', 'username'] });

  const userId = user.data.id;

  await redis.hset(`user:${userId}`, {
    name: user.data.name,
    username: user.data.username,
    profile_image_url: user.data.profile_image_url || '',
    followers_count: user.data.public_metrics.followers_count,
    following_count: user.data.public_metrics.following_count,
    last_updated: new Date().toISOString(),
  });

  res.redirect('/dashboard');
}