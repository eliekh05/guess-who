export async function getCached(kv, key, fetcher, ttl = 3600) {
  const cached = await kv.get(key, 'json');
  if (cached) return cached;

  const data = await fetcher();
  await kv.put(key, JSON.stringify(data), { expirationTtl: ttl });
  return data;
}

export async function invalidateCache(kv, key) {
  await kv.delete(key);
}
