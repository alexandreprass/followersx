import { TwitterApi } from 'twitter-api-v2';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const client = new TwitterApi({ clientId: process.env.TWITTER_CLIENT_ID });

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/callback`;

  console.log('Gerando OAuth link com callback:', callbackUrl);

  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(callbackUrl, {
    scope: ['tweet.read', 'users.read', 'follows.read', 'follows.write', 'offline.access'],
  });

  console.log('codeVerifier gerado:', codeVerifier.substring(0, 10) + '...');
  console.log('state gerado:', state);

  // Cookies com SameSite=None + Secure para permitir cross-site redirect do X
  res.setHeader('Set-Cookie', [
    `codeVerifier=${codeVerifier}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=600`,
    `oauthState=${state}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=600`,
  ]);

  console.log('Cookies setados no header');

  res.redirect(url);
}