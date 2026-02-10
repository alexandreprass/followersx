import { redis } from "@/lib/redis";

export default async function handler(req, res) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "userId required" });
  }

  const data = await redis.zrange(`unfollowers:${userId}`, 0, -1);
  const unfollowers = data.map(f => JSON.parse(f));

  res.json(unfollowers);
}
