// pages/api/get-last-sync.js
// Consulta timestamp da última sincronização de seguidores
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
    // Pegar userId via API Oficial
    const client = new TwitterApi(accessToken);
    const { data: me } = await client.v2.me();
    const userId = me.id;

    // Buscar timestamp da última sincronização no Redis
    const lastSync = await redis.get(`followers:${userId}:lastSync`);

    if (lastSync) {
      const lastSyncDate = new Date(lastSync);
      const now = new Date();
      const millisecondsSince = now.getTime() - lastSyncDate.getTime();
      const hoursSince = millisecondsSince / (1000 * 60 * 60);
      const minutesSince = millisecondsSince / (1000 * 60);

      // Pode atualizar se passou 12 horas
      const canUpdate = hoursSince >= 12;
      
      // Calcular tempo restante até próxima atualização
      const hoursRemaining = canUpdate ? 0 : Math.ceil(12 - hoursSince);
      const minutesRemaining = canUpdate ? 0 : Math.ceil((12 * 60) - minutesSince);

      res.status(200).json({
        lastSync: lastSync,
        lastSyncFormatted: lastSyncDate.toLocaleString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
        }),
        hoursSince: hoursSince.toFixed(1),
        minutesSince: Math.floor(minutesSince),
        canUpdate: canUpdate,
        hoursRemaining: hoursRemaining,
        minutesRemaining: minutesRemaining,
        nextUpdateMessage: canUpdate 
          ? 'Você pode atualizar agora!' 
          : `Aguarde ${hoursRemaining}h para atualizar novamente`,
      });
    } else {
      // Nunca sincronizou antes
      res.status(200).json({
        lastSync: null,
        lastSyncFormatted: null,
        hoursSince: null,
        minutesSince: null,
        canUpdate: true,
        hoursRemaining: 0,
        minutesRemaining: 0,
        nextUpdateMessage: 'Você nunca atualizou. Clique em "Atualizar Dados"!',
      });
    }

  } catch (error) {
    console.error('[GetLastSync] Erro ao consultar última sincronização:', error);
    
    // Verificar se é erro de autenticação
    if (error.code === 401 || error.code === 403) {
      return res.status(401).json({
        error: 'Token de acesso inválido ou expirado',
        message: 'Por favor, faça login novamente',
      });
    }

    res.status(500).json({
      error: 'Erro ao consultar dados',
      details: error.message,
    });
  }
}