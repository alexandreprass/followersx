import { TwitterApi } from 'twitter-api-v2';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const client = new TwitterApi({ clientId: process.env.TWITTER_CLIENT_ID });

  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/callback`,
    { scope: ['tweet.read', 'users.read', 'follows.read', 'follows.write', 'offline.access'] }
  );

  res.setHeader('Set-Cookie', [
    `codeVerifier=${codeVerifier}; Path=/; HttpOnly; Max-Age=600; SameSite=Lax`,
    `oauthState=${state}; Path=/; HttpOnly; Max-Age=600; SameSite=Lax`,
  ]);

  res.redirect(url);
}