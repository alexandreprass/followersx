import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
});

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/callback`,
        { scope: ['tweet.read', 'users.read', 'follows.read', 'follows.write', 'offline.access'] }
      );

      // Armazene codeVerifier e state em sessão ou cookie
      res.setHeader('Set-Cookie', [
        `twitter_code_verifier=${codeVerifier}; HttpOnly; Path=/; Max-Age=600`,
        `twitter_state=${state}; HttpOnly; Path=/; Max-Age=600`
      ]);

      res.status(200).json({ url });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
