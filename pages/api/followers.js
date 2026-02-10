import { redis } from "@/lib/redis";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // você pode pegar userId da sessão, cookie ou query
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "userId required" });
  }

  try {
    const data = await redis.zrange(`followers:${userId}`, 0, -1);
    const followers = data.map(item => JSON.parse(item));

    return res.status(200).json({ followers });
  } catch (err) {
    console.error("Error loading followers:", err);
    return res.status(500).json({ error: "Failed to load followers" });
  }
}
