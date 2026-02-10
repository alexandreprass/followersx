import { TwitterApi } from 'twitter-api-v2';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  try {
    const client = new TwitterApi({ clientId: process.env.TWITTER_CLIENT_ID });

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://followersx.vercel.app').replace(/\/$/, '');
    const callbackUrl = `${appUrl}/api/callback`;

    console.log('[auth] Gerando link OAuth com callback:', callbackUrl);

    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(callbackUrl, {
      scope: ['tweet.read', 'users.read', 'follows.read', 'follows.write', 'offline.access'],
    });

    console.log('[auth] codeVerifier gerado (primeiros 10 chars):', codeVerifier.substring(0, 10));
    console.log('[auth] state gerado:', state);

    // Cookies com atributos que permitem envio no redirect cross-site do X
    res.setHeader('Set-Cookie', [
      `codeVerifier=${codeVerifier}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=600`,
      `oauthState=${state}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=600`,
    ]);

    console.log('[auth] Cookies setados no header com SameSite=None + Secure');

    res.redirect(url);
  } catch (err) {
    console.error('[auth] Erro ao gerar link OAuth:', err);
    res.status(500).send('Erro interno ao iniciar autenticação');
  }
}