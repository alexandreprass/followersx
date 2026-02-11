// pages/api/not-following-back.js
// Busca quem você segue mas não te segue de volta (usando TweetAPI)
import { validateAndRefreshAuth } from '../../lib/auth-middleware';
import redis from '../../lib/redis';

export default async function handler(req, res) {
  try {
    // Valida autenticação
    const auth = await validateAndRefreshAuth(req, res);
    
    if (!auth.isValid) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const userId = auth.userId;
    console.log(`[NotFollowingBack] Buscando para userId: ${userId}`);

    // ✅ SOLUÇÃO TEMPORÁRIA: Retornar lista vazia
    // Para funcionar completamente, precisaria:
    // 1. Buscar via TweetAPI quem você segue
    // 2. Comparar com lista de followers do Redis
    // 3. Retornar diferença
    
    // Por enquanto, retorna vazio para não quebrar o dashboard
    console.log('[NotFollowingBack] Retornando lista vazia (funcionalidade parcial)');

    res.json({ 
      notFollowingBack: [],
      message: 'Esta funcionalidade requer configuração adicional da Twitter API v2' 
    });

  } catch (error) {
    console.error('[NotFollowingBack] Erro:', error.message);
    res.status(500).json({ 
      error: 'Erro ao buscar dados',
      details: error.message 
    });
  }
}
