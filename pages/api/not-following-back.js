import { getFollowersFromRedis } from "../../lib/redis";
import { getFollowingPage } from "../../lib/tweetApi";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  try {
    const userId = req.query.userId;

    console.log(`[NotFollowingBack] Iniciando para userId: ${userId}`);

    const followers = await getFollowersFromRedis(userId);

    if (!followers || followers.length === 0) {
      return res.status(200).json({ data: [], message: "Sem seguidores no cache" });
    }

    console.log(`[NotFollowingBack] Followers no cache: ${followers.length}`);

    let following = [];
    let cursor = null;
    let page = 1;
    const maxPages = 100;

    while (page <= maxPages) {
      try {
        console.log(`[NotFollowingBack] ⏳ Página ${page}...`);

        const result = await getFollowingPage(userId, cursor);

        if (!result || !result.data) break;

        following.push(...result.data);

        cursor = result.pagination?.nextCursor;

        if (!cursor) break;

        console.log(`[NotFollowingBack] Aguardando 8s...`);
        await sleep(8000);

        page++;

      } catch (err) {

        if (err?.status === 429) {
          console.log("[NotFollowingBack] ⚠️ Rate limit, aguardando 60s...");
          await sleep(60000);
          continue;
        }

        throw err;
      }
    }

    const followerIds = new Set(followers.map(f => f.id));

    const notFollowingBack = following.filter(
      f => !followerIds.has(f.id)
    );

    console.log(`[NotFollowingBack] Finalizado. Encontrados: ${notFollowingBack.length}`);

    return res.status(200).json({
      data: notFollowingBack
    });

  } catch (error) {
    console.error("[NotFollowingBack] Erro:", error);

    return res.status(500).json({
      error: "Erro ao buscar não seguidores"
    });
  }
}