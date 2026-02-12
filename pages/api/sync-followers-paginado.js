import { saveFollowersToRedis } from "../../lib/redis";
import { getFollowersPage } from "../../lib/tweetApi";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  try {
    const { userId } = req.body;

    console.log(`[SyncFollowers] Iniciando para ${userId}`);

    let cursor = null;
    let page = 1;
    let total = 0;

    while (page <= 100) {

      console.log(`[SyncFollowers] ⏳ Página ${page}`);

      try {
        const result = await getFollowersPage(userId, cursor);

        if (!result?.data) break;

        await saveFollowersToRedis(userId, result.data);

        total += result.data.length;

        console.log(`[SyncFollowers] Total até agora: ${total}`);

        cursor = result.pagination?.nextCursor;

        if (!cursor) break;

        console.log(`[SyncFollowers] Aguardando 8s...`);
        await sleep(8000);

        page++;

      } catch (err) {

        if (err?.status === 429) {
          console.log("[SyncFollowers] ⚠️ Rate limit. Esperando 60s...");
          await sleep(60000);
          continue;
        }

        throw err;
      }
    }

    console.log(`[SyncFollowers] Finalizado. Total: ${total}`);

    return res.status(200).json({
      success: true,
      total
    });

  } catch (error) {

    console.error("[SyncFollowers] Erro:", error);

    return res.status(500).json({
      error: "Erro ao sincronizar seguidores"
    });
  }
}