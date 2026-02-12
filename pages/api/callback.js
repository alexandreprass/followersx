// pages/api/callback.js - VERSÃO CORRIGIDA
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

    // ✅ CORREÇÃO: Buscar userId via API oficial do Twitter
    let userId = null;
    let userData = null;

    try {
      const client = new TwitterApi(accessToken);
      const { data: me } = await client.v2.me({
        'user.fields': ['id', 'name', 'username', 'profile_image_url', 'public_metrics']
      });
      
      userId = me.id;
      userData = me;
      
      console.log('[callback] Dados do usuário obtidos:', {
        userId: userId,
        username: me.username,
        name: me.name
      });

    } catch (e) {
      console.error('[callback] Erro ao buscar dados do usuário:', e);
      return res.status(500).send('Erro ao buscar dados do usuário: ' + e.message);
    }

    // Se conseguiu obter userId, salva dados no Redis
    if (userId && userData) {
      await redis.hset(`user:${userId}`, {
        userId: userId,
        username: userData.username,
        name: userData.name,
        profile_image_url: userData.profile_image_url || '',
        followers_count: userData.public_metrics?.followers_count?.toString() || '0',
        following_count: userData.public_metrics?.following_count?.toString() || '0',
        last_login: new Date().toISOString(),
        needs_sync: 'true', // Flag para indicar que precisa sincronizar
      });

      // Salva tempo de expiração do token
      const expiryTime = Date.now() + (expiresIn * 1000);
      await redis.set(`token:${userId}:expiry`, expiryTime.toString(), { EX: expiresIn });

      console.log('[callback] Dados salvos no Redis para userId:', userId);
    }

    // Salva cookies incluindo o userId
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