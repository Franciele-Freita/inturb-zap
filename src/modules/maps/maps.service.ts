import { BadRequestException, Injectable, Logger } from "@nestjs/common";

export interface RouteEstimate {
  distanceKm: number;
  durationMinutes: number;
  originLabel?: string;
  destinationLabel?: string;
  provider: "google_maps" | "fallback";
}

export interface GeocodedLocation {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface RoutePreview {
  provider: "google_maps" | "fallback";
  origin: GeocodedLocation;
  destination: GeocodedLocation;
  path: Array<{
    lat: number;
    lng: number;
  }>;
}

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);
  private readonly geocodeCache = new Map<string, { value: GeocodedLocation; expiresAt: number }>();
  private readonly routeEstimateCache = new Map<string, { value: RouteEstimate; expiresAt: number }>();
  private readonly routePreviewCache = new Map<string, { value: RoutePreview; expiresAt: number }>();
  private readonly geocodeTtlMs = 24 * 60 * 60_000;
  private readonly routeEstimateTtlMs = 10 * 60_000;
  private readonly routePreviewTtlMs = 30 * 60_000;

  async estimateRoute(origin: string, destination: string, departureTime?: string | Date): Promise<RouteEstimate> {
    const departureTimeIso = this.resolveDepartureTimeIso(departureTime);
    const cacheKey = this.buildRouteCacheKey(origin, destination, departureTimeIso);
    const cachedRoute = this.getCachedValue(this.routeEstimateCache, cacheKey);

    if (cachedRoute) {
      return { ...cachedRoute };
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

    if (!apiKey) {
      const fallback = this.estimateFallbackRoute(origin, destination);
      this.setCachedValue(this.routeEstimateCache, cacheKey, fallback, this.routeEstimateTtlMs);
      return { ...fallback };
    }

    const [originLocation, destinationLocation] = await Promise.all([
      this.getCachedGeocode(origin, apiKey),
      this.getCachedGeocode(destination, apiKey)
    ]);

    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters,routes.duration"
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: originLocation.lat,
              longitude: originLocation.lng
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: destinationLocation.lat,
              longitude: destinationLocation.lng
            }
          }
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        ...(departureTimeIso ? { departureTime: departureTimeIso } : {}),
        languageCode: "pt-BR",
        units: "METRIC"
      })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      routes?: Array<{
        distanceMeters?: number;
        duration?: string;
      }>;
      error?: {
        message?: string;
      };
    };

    if (!response.ok) {
      const message = payload.error?.message ?? "Falha ao consultar Google Routes API.";
      this.logger.error(`Routes API error: ${message}`);
      throw new BadRequestException("Nao foi possivel calcular a rota com os enderecos informados.");
    }

    const route = payload.routes?.[0];
    if (!route?.distanceMeters || !route.duration) {
      throw new BadRequestException("Nao foi possivel calcular a rota com os enderecos informados.");
    }

    const estimate: RouteEstimate = {
      distanceKm: Number((route.distanceMeters / 1000).toFixed(2)),
      durationMinutes: Math.max(1, Math.round(this.parseDurationSeconds(route.duration) / 60)),
      originLabel: originLocation.formattedAddress,
      destinationLabel: destinationLocation.formattedAddress,
      provider: "google_maps"
    };

    this.setCachedValue(this.routeEstimateCache, cacheKey, estimate, this.routeEstimateTtlMs);
    return { ...estimate };
  }

  private estimateFallbackRoute(origin: string, destination: string): RouteEstimate {
    const signal = origin.trim().length + destination.trim().length;
    const distanceKm = Math.max(2, Math.min(80, Math.round(signal / 3)));
    const durationMinutes = Math.max(5, Math.round(distanceKm * 2.4));

    return {
      distanceKm,
      durationMinutes,
      provider: "fallback"
    };
  }

  async geocodeForPreview(address: string): Promise<GeocodedLocation | null> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

    if (!apiKey) {
      return null;
    }

    try {
      return await this.getCachedGeocode(address, apiKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao geocodificar endereco.";
      this.logger.warn(`Preview geocode failed for "${address}": ${message}`);
      return null;
    }
  }

  async getRoutePreview(origin: string, destination: string, departureTime?: string | Date): Promise<RoutePreview | null> {
    const departureTimeIso = this.resolveDepartureTimeIso(departureTime);
    const cacheKey = this.buildRouteCacheKey(origin, destination, departureTimeIso);
    const cachedPreview = this.getCachedValue(this.routePreviewCache, cacheKey);

    if (cachedPreview) {
      return this.cloneRoutePreview(cachedPreview);
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

    if (!apiKey) {
      return null;
    }

    try {
      const [originLocation, destinationLocation] = await Promise.all([
        this.getCachedGeocode(origin, apiKey),
        this.getCachedGeocode(destination, apiKey)
      ]);

      const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "routes.polyline.encodedPolyline"
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: originLocation.lat,
                longitude: originLocation.lng
              }
            }
          },
          destination: {
            location: {
              latLng: {
                latitude: destinationLocation.lat,
                longitude: destinationLocation.lng
              }
            }
          },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          ...(departureTimeIso ? { departureTime: departureTimeIso } : {}),
          polylineQuality: "OVERVIEW",
          languageCode: "pt-BR",
          units: "METRIC"
        })
      });

      const payload = (await response.json().catch(() => ({}))) as {
        routes?: Array<{
          polyline?: {
            encodedPolyline?: string;
          };
        }>;
        error?: {
          message?: string;
        };
      };

      if (!response.ok) {
        const message = payload.error?.message ?? "Falha ao consultar polyline da rota.";
        this.logger.warn(`Route preview error: ${message}`);
        const fallbackPreview: RoutePreview = {
          provider: "fallback",
          origin: originLocation,
          destination: destinationLocation,
          path: [
            { lat: originLocation.lat, lng: originLocation.lng },
            { lat: destinationLocation.lat, lng: destinationLocation.lng }
          ]
        };

        this.setCachedValue(this.routePreviewCache, cacheKey, fallbackPreview, this.routePreviewTtlMs);
        return this.cloneRoutePreview(fallbackPreview);
      }

      const encodedPolyline = payload.routes?.[0]?.polyline?.encodedPolyline;
      const decodedPath =
        typeof encodedPolyline === "string" && encodedPolyline.trim().length > 0
          ? this.decodePolyline(encodedPolyline)
          : [];

      const preview: RoutePreview = {
        provider: decodedPath.length >= 2 ? "google_maps" : "fallback",
        origin: originLocation,
        destination: destinationLocation,
        path:
          decodedPath.length >= 2
            ? decodedPath
            : [
                { lat: originLocation.lat, lng: originLocation.lng },
                { lat: destinationLocation.lat, lng: destinationLocation.lng }
              ]
      };

      this.setCachedValue(this.routePreviewCache, cacheKey, preview, this.routePreviewTtlMs);
      return this.cloneRoutePreview(preview);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao montar preview da rota.";
      this.logger.warn(`Route preview failed for "${origin}" -> "${destination}": ${message}`);
      return null;
    }
  }

  private async geocodeAddress(address: string, apiKey: string): Promise<GeocodedLocation> {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", address);
    url.searchParams.set("key", apiKey);
    url.searchParams.set("region", "br");
    url.searchParams.set("language", "pt-BR");

    const response = await fetch(url);
    const payload = (await response.json().catch(() => ({}))) as {
      status?: string;
      error_message?: string;
      results?: Array<{
        formatted_address?: string;
        geometry?: {
          location?: {
            lat?: number;
            lng?: number;
          };
        };
      }>;
    };

    if (!response.ok) {
      this.logger.error(`Geocoding HTTP error for "${address}": ${response.status}`);
      throw new BadRequestException("Nao foi possivel validar um dos enderecos informados.");
    }

    if (payload.status !== "OK" || !payload.results?.length) {
      const details = payload.error_message ?? payload.status ?? "UNKNOWN_ERROR";
      this.logger.warn(`Geocoding failed for "${address}": ${details}`);
      throw new BadRequestException(`Endereco invalido ou nao localizado: ${address}`);
    }

    const result = payload.results[0];
    const location = result.geometry?.location;
    if (location?.lat === undefined || location.lng === undefined) {
      throw new BadRequestException(`Endereco sem coordenadas validas: ${address}`);
    }

    return {
      lat: location.lat,
      lng: location.lng,
      formattedAddress: result.formatted_address ?? address
    };
  }

  private async getCachedGeocode(address: string, apiKey: string): Promise<GeocodedLocation> {
    const cacheKey = this.normalizeCacheText(address);
    const cachedLocation = this.getCachedValue(this.geocodeCache, cacheKey);

    if (cachedLocation) {
      return { ...cachedLocation };
    }

    const geocoded = await this.geocodeAddress(address, apiKey);
    this.setCachedValue(this.geocodeCache, cacheKey, geocoded, this.geocodeTtlMs);
    return { ...geocoded };
  }

  private buildRouteCacheKey(origin: string, destination: string, departureTimeIso?: string): string {
    return `${this.normalizeCacheText(origin)}__${this.normalizeCacheText(destination)}__${departureTimeIso ?? "no_departure"}`;
  }

  private normalizeCacheText(value: string): string {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
  }

  private resolveDepartureTimeIso(value?: string | Date): string | undefined {
    if (!value) {
      return undefined;
    }

    const departureDate = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(departureDate.getTime())) {
      return undefined;
    }

    const effectiveDate = departureDate.getTime() > Date.now() ? departureDate : new Date();
    effectiveDate.setSeconds(0, 0);
    return effectiveDate.toISOString();
  }

  private getCachedValue<T>(cache: Map<string, { value: T; expiresAt: number }>, key: string): T | null {
    const cached = cache.get(key);

    if (!cached) {
      return null;
    }

    if (cached.expiresAt <= Date.now()) {
      cache.delete(key);
      return null;
    }

    return cached.value;
  }

  private setCachedValue<T>(cache: Map<string, { value: T; expiresAt: number }>, key: string, value: T, ttlMs: number): void {
    cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  private cloneRoutePreview(preview: RoutePreview): RoutePreview {
    return {
      provider: preview.provider,
      origin: { ...preview.origin },
      destination: { ...preview.destination },
      path: preview.path.map((point) => ({ ...point }))
    };
  }

  private parseDurationSeconds(duration: string): number {
    const normalized = duration.trim();

    if (!normalized.endsWith("s")) {
      return 0;
    }

    return Number(normalized.slice(0, -1));
  }

  private decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
    let index = 0;
    let lat = 0;
    let lng = 0;
    const coordinates: Array<{ lat: number; lng: number }> = [];

    while (index < encoded.length) {
      let result = 0;
      let shift = 0;
      let byte: number;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length + 1);

      const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += deltaLat;

      result = 0;
      shift = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < encoded.length + 1);

      const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += deltaLng;

      coordinates.push({
        lat: lat / 1e5,
        lng: lng / 1e5
      });
    }

    return coordinates;
  }
}
