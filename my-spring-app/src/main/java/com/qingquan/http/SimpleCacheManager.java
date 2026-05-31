package com.qingquan.http;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class SimpleCacheManager {

    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private final long defaultTtlMs;

    public SimpleCacheManager(long defaultTtlMs) {
        this.defaultTtlMs = defaultTtlMs;
    }

    public SimpleCacheManager() {
        this(60_000);
    }

    public void put(String key, ApiResponse response) {
        put(key, response, defaultTtlMs);
    }

    public void put(String key, ApiResponse response, long ttlMs) {
        cache.put(key, new CacheEntry(response, System.currentTimeMillis() + ttlMs));
    }

    public ApiResponse get(String key) {
        CacheEntry entry = cache.get(key);
        if (entry == null) {
            return null;
        }
        if (entry.isExpired()) {
            cache.remove(key);
            return null;
        }
        return entry.response;
    }

    public void invalidate(String key) {
        cache.remove(key);
    }

    public void invalidateByPrefix(String prefix) {
        cache.keySet().removeIf(k -> k.startsWith(prefix));
    }

    public void clear() {
        cache.clear();
    }

    public int size() {
        cleanExpired();
        return cache.size();
    }

    private void cleanExpired() {
        cache.entrySet().removeIf(e -> e.getValue().isExpired());
    }

    private static class CacheEntry {
        final ApiResponse response;
        final long expireAt;

        CacheEntry(ApiResponse response, long expireAt) {
            this.response = response;
            this.expireAt = expireAt;
        }

        boolean isExpired() {
            return System.currentTimeMillis() > expireAt;
        }
    }
}
