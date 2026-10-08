import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Lagerorte {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    bezeichnung?: string;
    typ?: LookupValue;
    beschreibung?: string;
    bemerkungen?: string;
  };
}

export interface Artikel {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    artikelbezeichnung?: string;
    artikelnummer?: string;
    kategorie?: LookupValue;
    hersteller?: string;
    seriennummer?: string;
    aktueller_bestand?: number;
    mindestbestand?: number;
    einheit?: LookupValue;
    zustand?: LookupValue;
    anschaffungsdatum?: string; // Format: YYYY-MM-DD oder ISO String
    anschaffungspreis?: number;
    lagerort?: RecordUrl; // applookup -> URL zu 'Lagerorte' Record
    bemerkungen?: string;
  };
}

export interface Bestandsbewegungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    artikel?: RecordUrl; // applookup -> URL zu 'Artikel' Record
    bewegungsart?: LookupValue;
    zeitpunkt?: string; // Format: YYYY-MM-DD oder ISO String
    menge?: number;
    person_vorname?: string;
    person_nachname?: string;
    bemerkungen?: string;
  };
}

export const APP_IDS = {
  LAGERORTE: '6ac789dab459924e79ec2894',
  ARTIKEL: '6ac789e07759bdee0225ad7a',
  BESTANDSBEWEGUNGEN: '6ac789e137d73539d8965323',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'lagerorte': {
    typ: [{ key: "regal", get label() { return lookupLabel('lagerorte', 'typ', "regal") ?? "Regal"; } }, { key: "schrank", get label() { return lookupLabel('lagerorte', 'typ', "schrank") ?? "Schrank"; } }, { key: "werkbank", get label() { return lookupLabel('lagerorte', 'typ', "werkbank") ?? "Werkbank"; } }, { key: "container", get label() { return lookupLabel('lagerorte', 'typ', "container") ?? "Container"; } }, { key: "sonstiges", get label() { return lookupLabel('lagerorte', 'typ', "sonstiges") ?? "Sonstiges"; } }],
  },
  'artikel': {
    kategorie: [{ key: "werkzeug", get label() { return lookupLabel('artikel', 'kategorie', "werkzeug") ?? "Werkzeug"; } }, { key: "maschine", get label() { return lookupLabel('artikel', 'kategorie', "maschine") ?? "Maschine"; } }, { key: "verbrauchsmaterial", get label() { return lookupLabel('artikel', 'kategorie', "verbrauchsmaterial") ?? "Verbrauchsmaterial"; } }, { key: "ersatzteil", get label() { return lookupLabel('artikel', 'kategorie', "ersatzteil") ?? "Ersatzteil"; } }, { key: "sonstiges", get label() { return lookupLabel('artikel', 'kategorie', "sonstiges") ?? "Sonstiges"; } }],
    einheit: [{ key: "stueck", get label() { return lookupLabel('artikel', 'einheit', "stueck") ?? "Stück"; } }, { key: "meter", get label() { return lookupLabel('artikel', 'einheit', "meter") ?? "Meter"; } }, { key: "kilogramm", get label() { return lookupLabel('artikel', 'einheit', "kilogramm") ?? "Kilogramm"; } }, { key: "liter", get label() { return lookupLabel('artikel', 'einheit', "liter") ?? "Liter"; } }, { key: "packung", get label() { return lookupLabel('artikel', 'einheit', "packung") ?? "Packung"; } }],
    zustand: [{ key: "neu", get label() { return lookupLabel('artikel', 'zustand', "neu") ?? "Neu"; } }, { key: "gut", get label() { return lookupLabel('artikel', 'zustand', "gut") ?? "Gut"; } }, { key: "gebraucht", get label() { return lookupLabel('artikel', 'zustand', "gebraucht") ?? "Gebraucht"; } }, { key: "reparaturbeduerftig", get label() { return lookupLabel('artikel', 'zustand', "reparaturbeduerftig") ?? "Reparaturbedürftig"; } }, { key: "defekt", get label() { return lookupLabel('artikel', 'zustand', "defekt") ?? "Defekt"; } }],
  },
  'bestandsbewegungen': {
    bewegungsart: [{ key: "zugang", get label() { return lookupLabel('bestandsbewegungen', 'bewegungsart', "zugang") ?? "Zugang"; } }, { key: "entnahme", get label() { return lookupLabel('bestandsbewegungen', 'bewegungsart', "entnahme") ?? "Entnahme"; } }, { key: "rueckgabe", get label() { return lookupLabel('bestandsbewegungen', 'bewegungsart', "rueckgabe") ?? "Rückgabe"; } }, { key: "korrektur", get label() { return lookupLabel('bestandsbewegungen', 'bewegungsart', "korrektur") ?? "Korrektur"; } }, { key: "aussonderung", get label() { return lookupLabel('bestandsbewegungen', 'bewegungsart', "aussonderung") ?? "Aussonderung"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'lagerorte': {
    'bezeichnung': 'string/text',
    'typ': 'lookup/select',
    'beschreibung': 'string/textarea',
    'bemerkungen': 'string/textarea',
  },
  'artikel': {
    'artikelbezeichnung': 'string/text',
    'artikelnummer': 'string/text',
    'kategorie': 'lookup/select',
    'hersteller': 'string/text',
    'seriennummer': 'string/text',
    'aktueller_bestand': 'number',
    'mindestbestand': 'number',
    'einheit': 'lookup/select',
    'zustand': 'lookup/select',
    'anschaffungsdatum': 'date/date',
    'anschaffungspreis': 'number',
    'lagerort': 'applookup/select',
    'bemerkungen': 'string/textarea',
  },
  'bestandsbewegungen': {
    'artikel': 'applookup/select',
    'bewegungsart': 'lookup/radio',
    'zeitpunkt': 'date/datetimeminute',
    'menge': 'number',
    'person_vorname': 'string/text',
    'person_nachname': 'string/text',
    'bemerkungen': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateLagerorte = StripLookup<Lagerorte['fields']>;
export type CreateArtikel = StripLookup<Artikel['fields']>;
export type CreateBestandsbewegungen = StripLookup<Bestandsbewegungen['fields']>;