// pages/api/callback.js - Versão corrigida e com debug reforçado
import { TwitterApi } from 'twitter-api-v2';
import { serialize } from 'cookie';
import redis from '../../lib/redis';

export default async function handler(req, res) {
  const { code, state } = req.query;
  const cookies = req.cookies || {};

  // Logs completos para debug (veja no Vercel Functions Logs)
  console.log('[callback] Início do callback');
  console.log('[callback] Query recebida:', JSON.stringify(req.query, null, 2));
  console.log('[callback] Cookies recebidos:', Object.keys(cookies));
  console.log('[callback] state recebido:', state);
  console.log('[callback] oauthState salvo no cookie:', cookies.oauthState);
  console.log('[callback] codeVerifier presente?', !!cookies.codeVerifier);
  console.log('[callback] NEXT_PUBLIC_APP_URL usado:', process.env.NEXT_PUBLIC_APP_URL);

  // Validações iniciais
  if (!code) {
    console.error('[callback] code ausente na query');
    return res.status(400).send('Erro na autenticação: code ausente');
  }

  if (!cookies.codeVerifier) {
    console.error('[callback] codeVerifier ausente no cookie');
    return res.status(400).send('Erro na autenticação: codeVerifier ausente');
  }

  if (state !== cookies.oauthState) {
    console.error('[callback] state mismatch', {
      recebido: state,
      salvo: cookies.oauthState
    });
    return res.status(400).send('Erro na autenticação: state mismatch');
  }

  try {
    console.log('[callback] Criando cliente Twitter com Client ID:', process.env.TWITTER_CLIENT_ID ? 'presente' : 'ausente');

    const twitter = new TwitterApi({ clientId: process.env.TWITTER_CLIENT_ID });

    console.log('[callback] Iniciando troca de code por tokens...');
    console.log('[callback] redirectUri usado:', `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/callback`);

    const { accessToken, refreshToken, expiresIn } = await twitter.loginWithOAuth2({
      code: code.toString(),
      codeVerifier: cookies.codeVerifier,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/callback`,
    });

    console.log('[callback] Tokens obtidos com sucesso!');

    // Salva tokens em cookies
    res.setHeader('Set-Cookie', [
      serialize('accessToken', accessToken, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: expiresIn,
      }),
      serialize('refreshToken', refreshToken || '', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 31536000,
      }),
    ]);

    // Pega dados do usuário
    const userClient = new TwitterApi(accessToken);
    const user = await userClient.v2.me({
      'user.fields': ['profile_image_url', 'public_metrics', 'name', 'username'],
    });

    const userId = user.data.id;
    console.log('[callback] Usuário autenticado com sucesso:', user.data.username, userId);

    // Salva no Redis
    await redis.hset(`user:${userId}`, {
      name: user.data.name,
      username: user.data.username,
      profile_image_url: user.data.profile_image_url || '',
      followers_count: user.data.public_metrics.followers_count || 0,
      following_count: user.data.public_metrics.following_count || 0,
      last_updated: new Date().toISOString(),
    });

    console.log('[callback] Dados do usuário salvos no Redis');

    res.redirect('/dashboard');
  } catch (err) {
    console.error('[callback] ERRO DETALHADO NA TROCA DE TOKENS:', {
      message: err.message,
      code: err.code,
      data: err.data,
      stack: err.stack || 'sem stack',
    });

    // Mensagem clara na tela para debug
    const errorMessage = err.message.includes('401') 
      ? 'Erro 401: Credenciais inválidas ou app sem permissões Write. Verifique Client Secret e permissões no Twitter Developer Portal.'
      : `Erro interno: ${err.message}`;

    res.status(500).send(errorMessage);
  }
}