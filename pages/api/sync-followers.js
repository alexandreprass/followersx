import { redis } from "@/lib/redis";
import { fetchFollowersFromTweetAPI } from "@/lib/tweetapi";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, username } = req.body;

  if (!userId || !username) {
    return res.status(400).json({ error: "userId and username required" });
  }

  let allFollowers = [];
  let cursor = null;

  try {
    // 1️⃣ Buscar seguidores (paginação)
    do {
      const data = await fetchFollowersFromTweetAPI(username, cursor);
      if (data?.data) allFollowers.push(...data.data);
      cursor = data?.meta?.next_token || null;
    } while (cursor);

    const currentKey = `followers:${userId}`;
    const snapshotKey = `followers_snapshot:${userId}`;
    const unfollowKey = `unfollowers:${userId}`;

    // 2️⃣ Snapshot antigo
    const oldFollowersRaw = await redis.zrange(currentKey, 0, -1);
    const oldFollowers = oldFollowersRaw.map(f => JSON.parse(f));

    if (oldFollowersRaw.length > 0) {
      await redis.del(snapshotKey);
      await redis.zadd(
        snapshotKey,
        oldFollowersRaw.map(f => ({
          score: Date.now(),
          member: f,
        }))
      );
    }

    // 3️⃣ Limpa seguidores atuais
    await redis.del(currentKey);

    // 4️⃣ Salva seguidores novos
    const now = Date.now();
    for (const f of allFollowers) {
      await redis.zadd(currentKey, {
        score: now,
        member: JSON.stringify({
          id: f.id,
          username: f.username,
          name: f.name,
          profile_image_url: f.profile_image_url,
        }),
      });
    }

    // 5️⃣ Detectar unfollowers
    const newIds = new Set(allFollowers.map(f => f.id));

    const unfollowers = oldFollowers.filter(
      old => !newIds.has(old.id)
    );

    for (const u of unfollowers) {
      await redis.zadd(unfollowKey, {
        score: Date.now(),
        member: JSON.stringify({
          ...u,
          unfollowed_at: new Date().toISOString(),
        }),
      });
    }

    return res.json({
      synced: allFollowers.length,
      unfollowers: unfollowers.length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Sync failed" });
  }
}
