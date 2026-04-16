// ============================================================
// Weather provider
// Primary: NWS (api.weather.gov) — no key, unlimited, US-only
// Fallback: OpenWeather — requires OPENWEATHER_API_KEY, 1k/day free
// Returns null when both unavailable or when location is unsupported.
// ============================================================

import { getJson } from './http';
import { cached } from './cache';

export interface StadiumForecast {
  tempF: number;
  condition: string;
  windMph: number;
  windDirection: string;
  source: 'nws' | 'openweather';
  forecastedAt: string;
}

const NWS_USER_AGENT = 'cfbsocial/1.0 (https://cfbsocial.app)';

interface NwsPointsResponse {
  properties?: {
    forecast?: string;
    forecastHourly?: string;
  };
}

interface NwsForecastResponse {
  properties?: {
    periods?: Array<{
      temperature?: number;
      temperatureUnit?: string;
      windSpeed?: string;
      windDirection?: string;
      shortForecast?: string;
      startTime?: string;
    }>;
  };
}

async function getNwsForecast(lat: number, lon: number): Promise<StadiumForecast | null> {
  const points = await getJson<NwsPointsResponse>(`https://api.weather.gov/points/${lat},${lon}`, {
    timeoutMs: 5000,
    headers: { 'User-Agent': NWS_USER_AGENT, Accept: 'application/geo+json' },
  });
  const forecastUrl = points?.properties?.forecastHourly ?? points?.properties?.forecast;
  if (!forecastUrl) return null;

  const forecast = await getJson<NwsForecastResponse>(forecastUrl, {
    timeoutMs: 5000,
    headers: { 'User-Agent': NWS_USER_AGENT, Accept: 'application/geo+json' },
  });
  const period = forecast?.properties?.periods?.[0];
  if (!period) return null;

  const tempF = period.temperatureUnit === 'C'
    ? Math.round((period.temperature ?? 0) * 9 / 5 + 32)
    : period.temperature ?? 0;

  // Parse windSpeed like "10 mph" or "5 to 10 mph"
  const windMatch = (period.windSpeed ?? '').match(/(\d+)/);
  const windMph = windMatch ? parseInt(windMatch[1]!, 10) : 0;

  return {
    tempF,
    condition: period.shortForecast ?? 'Unknown',
    windMph,
    windDirection: period.windDirection ?? '',
    source: 'nws',
    forecastedAt: period.startTime ?? new Date().toISOString(),
  };
}

interface OpenWeatherResponse {
  main?: { temp?: number };
  weather?: Array<{ main?: string; description?: string }>;
  wind?: { speed?: number; deg?: number };
}

function degToCompass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8]!;
}

async function getOpenWeatherForecast(lat: number, lon: number): Promise<StadiumForecast | null> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key) return null;
  const data = await getJson<OpenWeatherResponse>(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=imperial`,
    { timeoutMs: 5000 },
  );
  if (!data || data.main?.temp == null) return null;
  return {
    tempF: Math.round(data.main.temp),
    condition: data.weather?.[0]?.description ?? data.weather?.[0]?.main ?? 'Unknown',
    windMph: Math.round(data.wind?.speed ?? 0),
    windDirection: degToCompass(data.wind?.deg ?? 0),
    source: 'openweather',
    forecastedAt: new Date().toISOString(),
  };
}

/**
 * Get a stadium forecast. Tries NWS first (US, no key), then OpenWeather (if key set).
 * Cached 30 min per coordinate pair.
 */
export async function getStadiumForecast(lat: number, lon: number): Promise<StadiumForecast | null> {
  const key = `weather:${lat.toFixed(3)}:${lon.toFixed(3)}`;
  return cached(key, 30 * 60_000, async () => {
    const nws = await getNwsForecast(lat, lon);
    if (nws) return nws;
    return getOpenWeatherForecast(lat, lon);
  });
}
