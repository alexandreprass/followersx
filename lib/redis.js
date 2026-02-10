// lib/redis.js - Compatível com integração Upstash do Vercel (KV)
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.KV_REST_API_URL,      // nome que o Vercel usa
  token: process.env.KV_REST_API_TOKEN,  // nome que o Vercel usa
});

export async function connectRedis() {
  return; // REST não precisa de connect explícito
}

export default redis;