import type { EnrichedArtikel, EnrichedBestandsbewegungen } from '@/types/enriched';
import type { Artikel, Bestandsbewegungen, Lagerorte } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface ArtikelMaps {
  lagerorteMap: Map<string, Lagerorte>;
}

export function enrichArtikel(
  artikel: Artikel[],
  maps: ArtikelMaps
): EnrichedArtikel[] {
  return artikel.map(r => ({
    ...r,
    lagerortName: resolveDisplay(r.fields.lagerort, maps.lagerorteMap, 'bezeichnung'),
  }));
}

interface BestandsbewegungenMaps {
  artikelMap: Map<string, Artikel>;
}

export function enrichBestandsbewegungen(
  bestandsbewegungen: Bestandsbewegungen[],
  maps: BestandsbewegungenMaps
): EnrichedBestandsbewegungen[] {
  return bestandsbewegungen.map(r => ({
    ...r,
    artikelName: resolveDisplay(r.fields.artikel, maps.artikelMap, 'artikelbezeichnung'),
  }));
}
