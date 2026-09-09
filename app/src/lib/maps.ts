import type { Place } from '../types/trip';

const URL_PATTERN = /https?:\/\/[^\s]+/i;

function cleanUrl(raw: string) {
  return raw.match(URL_PATTERN)?.[0]?.replace(/[),。]+$/, '') ?? raw.trim();
}

function decode(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

export function parseGoogleMapsPlace(nameInput: string, urlInput: string): Place {
  const mapUrl = cleanUrl(urlInput);
  const urlName = mapUrl.match(/\/maps\/place\/([^/@?]+)/i)?.[1];
  const decodedUrlName = urlName ? decode(urlName) : '';
  const providedName = nameInput.trim();
  const coords = mapUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,|\/)/);
  const queryPlaceId = mapUrl.match(/[?&](?:query_place_id|destination_place_id|place_id)=([^&]+)/i)?.[1];
  const embeddedPlaceId = mapUrl.match(/!1s(ChI[^!/?&]+)/)?.[1];
  const place: Place = {
    name: providedName || decodedUrlName || nameInput.trim() || urlInput.trim(),
    mapUrl: mapUrl || urlInput.trim(),
  };
  if (providedName && decodedUrlName && providedName !== decodedUrlName) place.localName = decodedUrlName;
  if (coords) {
    place.lat = Number(coords[1]);
    place.lng = Number(coords[2]);
  }
  const placeId = queryPlaceId ?? embeddedPlaceId;
  if (placeId) place.placeId = decode(placeId);
  return place;
}

export function isShortGoogleMapsUrl(value: string) {
  return /https?:\/\/(?:www\.)?maps\.app\.goo\.gl\//i.test(value);
}

export async function importGoogleMapsPlace(name: string, url: string): Promise<Place> {
  let resolvedUrl = cleanUrl(url);
  if (isShortGoogleMapsUrl(resolvedUrl)) {
    const workerUrl = import.meta.env.VITE_MAPS_RESOLVER_URL as string | undefined;
    if (workerUrl) {
      const response = await fetch(`${workerUrl}?url=${encodeURIComponent(resolvedUrl)}`);
      if (!response.ok) throw new Error('MAP_RESOLVE_FAILED');
      const result = await response.json() as { url?: string };
      if (result.url) resolvedUrl = result.url;
    }
  }
  return parseGoogleMapsPlace(name, resolvedUrl);
}
