// lib/redis.js - Cliente oficial Upstash REST (funciona no plano free)
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Não precisa de connect explícito em REST API
export async function connectRedis() {
  // placeholder - Upstash conecta automaticamente
  return;
}

export default redis;
