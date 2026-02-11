// pages/api/callback.js - VERSÃO OTIMIZADA - Sem chamar API do Twitter
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
    console.log('[callback] Iniciando troca OAuth2 com Client Secret...');

    const twitter = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET
    });

    // Troca o código por tokens
    const { accessToken, refreshToken, expiresIn } = await twitter.loginWithOAuth2({
      code: code.toString(),
      codeVerifier: cookies.codeVerifier,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/callback`,
    });

    console.log('[callback] Tokens obtidos com sucesso!');

    // IMPORTANTE: Não fazemos mais chamada para v2.me() aqui
    // O userId será obtido pelo decode do accessToken ou pela primeira sync
    
    // Decodifica o token JWT para extrair o userId (método seguro sem API call)
    const tokenParts = accessToken.split('.');
    let userId = null;
    
    try {
      // O token JWT do Twitter contém o userId no payload
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      userId = payload.sub; // Twitter coloca o userId no campo 'sub' (subject)
      console.log('[callback] UserId extraído do token:', userId);
    } catch (e) {
      console.error('[callback] Erro ao decodificar token, userId será obtido na primeira sync');
    }

    // Se conseguiu extrair userId, salva dados básicos no Redis
    if (userId) {
      await redis.hset(`user:${userId}`, {
        userId: userId,
        last_login: new Date().toISOString(),
        needs_sync: 'true', // Flag para indicar que precisa sincronizar
      });

      // Salva tempo de expiração do token
      const expiryTime = Date.now() + (expiresIn * 1000);
      await redis.set(`token:${userId}:expiry`, expiryTime.toString(), { EX: expiresIn });

      console.log('[callback] Dados básicos salvos no Redis para userId:', userId);
    }

    // Salva cookies incluindo o userId (se disponível)
    const cookiesToSet = [
      serialize('accessToken', accessToken, { 
        path: '/', 
        httpOnly: true, 
        secure: true, 
        sameSite: 'none', 
        maxAge: expiresIn 
      }),
      serialize('refreshToken', refreshToken || '', { 
        path: '/', 
        httpOnly: true, 
        secure: true, 
        sameSite: 'none', 
        maxAge: 31536000 
      }),
    ];

    if (userId) {
      cookiesToSet.push(
        serialize('userId', userId, { 
          path: '/', 
          httpOnly: true, 
          secure: true, 
          sameSite: 'none', 
          maxAge: 31536000 
        })
      );
    }

    res.setHeader('Set-Cookie', cookiesToSet);

    // Redireciona para dashboard que vai iniciar a sincronização
    res.redirect('/dashboard');
  } catch (err) {
    console.error('[callback] ERRO DETALHADO:', err.message, err.data || err);
    res.status(500).send(`Erro na troca de tokens: ${err.message}`);
  }
}
