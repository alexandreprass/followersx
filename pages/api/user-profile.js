// pages/api/user-profile.js
// Busca dados do perfil do usuário via API Oficial do Twitter (OAuth)
import { TwitterApi } from 'twitter-api-v2';
import redis from '../../lib/redis';

export default async function handler(req, res) {
  // Apenas método GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const accessToken = req.cookies.accessToken;
  
  if (!accessToken) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  try {
    // Buscar dados do perfil via API Oficial (OAuth)
    const client = new TwitterApi(accessToken);
    const { data: userProfile } = await client.v2.me({
      'user.fields': [
        'id',
        'name',
        'username',
        'profile_image_url',
        'public_metrics',
        'description',
        'created_at',
        'verified',
      ],
    });

    console.log('[UserProfile] Dados do perfil obtidos:', {
      id: userProfile.id,
      username: userProfile.username,
      followers_count: userProfile.public_metrics?.followers_count,
    });

    // Salvar no Redis (cache de 1 hora)
    await redis.set(
      `user:${userProfile.id}:profile`,
      JSON.stringify(userProfile),
      { ex: 3600 } // Expira em 1 hora
    );

    // Retornar dados do perfil
    res.status(200).json({
      success: true,
      profile: userProfile,
    });

  } catch (error) {
    console.error('[UserProfile] Erro ao buscar dados do perfil:', error);
    
    // Verificar se é erro de autenticação
    if (error.code === 401 || error.code === 403) {
      return res.status(401).json({
        error: 'Token de acesso inválido ou expirado',
        message: 'Por favor, faça login novamente',
      });
    }

    res.status(500).json({
      error: 'Erro ao buscar dados do perfil',
      details: error.message,
    });
  }
}