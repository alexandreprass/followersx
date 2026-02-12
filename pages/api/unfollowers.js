// pages/api/unfollowers.js
// VERSÃO CORRIGIDA - Melhor tratamento de parsing
import redis from '../../lib/redis';
import { validateAndRefreshAuth } from '../../lib/auth-middleware';

export default async function handler(req, res) {
  try {
    // Valida autenticação
    const auth = await validateAndRefreshAuth(req, res);
    
    if (!auth.isValid) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const userId = auth.userId;
    
    console.log(`[Unfollowers API] Buscando unfollowers para userId: ${userId}`);

    // Buscar últimos 30 dias de unfollowers
    const today = new Date();
    let allUnfollowers = [];

    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];

      const dayUnfollowersStr = await redis.get(`unfollowers:${userId}:${dateKey}`);
      
      if (dayUnfollowersStr) {
        try {
          // Converte para string se necessário
          const str = typeof dayUnfollowersStr === 'string' 
            ? dayUnfollowersStr 
            : String(dayUnfollowersStr);
          
          if (str.trim() !== '') {
            const dayUnfollowers = JSON.parse(str);
            if (Array.isArray(dayUnfollowers)) {
              allUnfollowers = [...allUnfollowers, ...dayUnfollowers];
              console.log(`[Unfollowers API] ${dateKey}: ${dayUnfollowers.length} unfollowers`);
            }
          }
        } catch (parseError) {
          console.error(`[Unfollowers API] Erro ao parsear dados de ${dateKey}:`, parseError.message);
        }
      }
    }

    // Remover duplicados (pode ter unfollowed em dias diferentes)
    // Mantém apenas a entrada mais recente de cada usuário
    const uniqueUnfollowers = Array.from(
      new Map(
        allUnfollowers
          .sort((a, b) => new Date(b.unfollowDate) - new Date(a.unfollowDate))
          .map(u => [u.id, u])
      ).values()
    );

    console.log(`[Unfollowers API] Total de unfollowers únicos: ${uniqueUnfollowers.length}`);

    res.json({ 
      unfollowers: uniqueUnfollowers,
      count: uniqueUnfollowers.length 
    });

  } catch (error) {
    console.error('[Unfollowers API] Erro:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar unfollowers',
      details: error.message 
    });
  }
}