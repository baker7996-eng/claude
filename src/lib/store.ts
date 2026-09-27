import "server-only";

import { Redis } from "@upstash/redis";

/**
 * Tiny key-value store for PINs and sign-in attempts. Uses Upstash Redis when
 * its settings are present (added by Vercel's Upstash integration); otherwise
 * falls back to in-memory storage, which is only good for local testing
 * because it is wiped on every restart.
 */
interface Store {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  incr(key: string, ttlSeconds: number): Promise<number>;
  del(key: string): Promise<void>;
}

function redisStore(url: string, token: string): Store {
  const redis = new Redis({ url, token });
  return {
    get: (key) => redis.get(key),
    async set(key, value, ttlSeconds) {
      await (ttlSeconds ? redis.set(key, value, { ex: ttlSeconds }) : redis.set(key, value));
    },
    async incr(key, ttlSeconds) {
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, ttlSeconds);
      return n;
    },
    async del(key) {
      await redis.del(key);
    },
  };
}

function memoryStore(): Store {
  const data = new Map<string, { value: unknown; expires: number | null }>();
  const live = (key: string) => {
    const item = data.get(key);
    if (item?.expires && item.expires < Date.now()) data.delete(key);
    return data.get(key);
  };
  return {
    get: async <T,>(key: string) => (live(key)?.value as T) ?? null,
    async set(key, value, ttlSeconds) {
      data.set(key, { value, expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
    },
    async incr(key, ttlSeconds) {
      const n = ((live(key)?.value as number) ?? 0) + 1;
      data.set(key, { value: n, expires: live(key)?.expires ?? Date.now() + ttlSeconds * 1000 });
      return n;
    },
    async del(key) {
      data.delete(key);
    },
  };
}

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export const hasDatabase = Boolean(url && token);
export const store: Store = url && token ? redisStore(url, token) : memoryStore();
