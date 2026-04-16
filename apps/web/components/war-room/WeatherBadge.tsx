'use client';

import { useEffect, useState } from 'react';

interface WeatherForecast {
  tempF: number;
  condition: string;
  windMph: number;
  windDirection: string;
  source: 'nws' | 'openweather';
}

interface WeatherBadgeProps {
  /** ESPN team abbreviation of the home team (stadium location). */
  homeAbbr: string | null | undefined;
  /** Show badge only when status is pre or in. */
  status: string;
}

export function WeatherBadge({ homeAbbr, status }: WeatherBadgeProps) {
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [stadium, setStadium] = useState<string | null>(null);

  useEffect(() => {
    if (!homeAbbr) return;
    if (status === 'FINAL' || status === 'post') return;

    let cancelled = false;
    fetch(`/api/weather/stadium/${encodeURIComponent(homeAbbr)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { forecast: WeatherForecast | null; stadium?: string } | null) => {
        if (cancelled || !data) return;
        setForecast(data.forecast ?? null);
        setStadium(data.stadium ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [homeAbbr, status]);

  if (!forecast) return null;

  return (
    <div className="weather-badge" title={stadium ?? undefined}>
      <span className="weather-badge-temp">{forecast.tempF}&deg;F</span>
      <span className="weather-badge-sep">|</span>
      <span className="weather-badge-cond">{forecast.condition}</span>
      {forecast.windMph > 0 && (
        <>
          <span className="weather-badge-sep">|</span>
          <span className="weather-badge-wind">
            {forecast.windDirection} {forecast.windMph} mph
          </span>
        </>
      )}
    </div>
  );
}
