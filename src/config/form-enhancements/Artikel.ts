// Auto-generated. Per-entity form-enhancements config for "Artikel".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["artikelbezeichnung", {"row": ["artikelnummer", "kategorie"], "cols": "1fr 1fr"}, {"row": ["hersteller", "seriennummer"], "cols": "1fr 1fr"}, {"row": ["aktueller_bestand", "mindestbestand"], "cols": "1fr 1fr"}, {"row": ["einheit", "zustand"], "cols": "1fr 1fr"}, {"row": ["anschaffungsdatum", "anschaffungspreis"], "cols": "1fr 1fr"}, "lagerort", "bemerkungen"],
  defaults: {
    'anschaffungsdatum': { kind: 'today' },
    'zustand': { kind: 'lookup', key: 'neu', label: 'Neu' },
    'einheit': { kind: 'lookup', key: 'stueck', label: 'Stück' },
  },
  computed: {},
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
