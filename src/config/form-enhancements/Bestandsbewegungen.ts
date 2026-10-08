// Auto-generated. Per-entity form-enhancements config for "Bestandsbewegungen".
// Written by the backend form polish (app/services/form_polish.py) from the
// generator's manifest; scripts/parse-formulas.mjs expands the formula strings.
// Schema: see ./types.ts.

import type { FormEnhancements } from './types';

export const formEnhancements: FormEnhancements = {
  fieldOrder: ["artikel", "bewegungsart", {"row": ["zeitpunkt", "menge"], "cols": "2fr 1fr"}, {"row": ["person_vorname", "person_nachname"]}, "bemerkungen"],
  defaults: {
    'zeitpunkt': { kind: 'today', withTime: true },
    'menge': { kind: 'literal', value: 1 },
    'bewegungsart': { kind: 'lookup', key: 'entnahme', label: 'Entnahme' },
  },
  computed: {},
  numberFields: {
    'menge': { allowNegative: true },
  },
};

export const computedDeps: Record<string, string[]> = {};
export const computedApplookupRefs: Record<string, {lookupKey: string}[]> = {};
