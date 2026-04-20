import type { RideMapPreview } from "./api";

const CACHE_TTL_MS = 5 * 60_000;

const rideMapPreviewCache = new Map<
  string,
  {
    preview: RideMapPreview;
    expiresAt: number;
  }
>();

function buildCacheKey(driverId: string, rideId: string): string {
  return `${driverId}__${rideId}`;
}

function clonePreview(preview: RideMapPreview): RideMapPreview {
  return {
    ...preview,
    origin: preview.origin ? { ...preview.origin } : undefined,
    destination: preview.destination ? { ...preview.destination } : undefined,
    path: preview.path?.map((point) => ({ ...point }))
  };
}

export function getCachedRideMapPreview(driverId: string, rideId: string): RideMapPreview | null {
  const cacheKey = buildCacheKey(driverId, rideId);
  const cached = rideMapPreviewCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    rideMapPreviewCache.delete(cacheKey);
    return null;
  }

  return clonePreview(cached.preview);
}

export function setCachedRideMapPreview(driverId: string, rideId: string, preview: RideMapPreview): void {
  rideMapPreviewCache.set(buildCacheKey(driverId, rideId), {
    preview: clonePreview(preview),
    expiresAt: Date.now() + CACHE_TTL_MS
  });
}
