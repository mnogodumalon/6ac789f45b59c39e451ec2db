/**
 * useArtikelAnlegenFlow — the plumbing of the flow « Artikel anlegen », generated from the plan.
 *
 * Writes `artikel`: asks `artikelbezeichnung`, `artikelnummer`, `kategorie`, `hersteller`, `seriennummer`, `aktueller_bestand`, `mindestbestand`, `einheit`, `zustand`, `anschaffungsdatum`, `anschaffungspreis`, `lagerort`, `bemerkungen`.
 * The hook OWNS: the form(s) with exactly these fields and the plan's required
 * ingredients, one record search per picked field (columns and filter from
 * the plan), and the submit plan with its fixed and derived values. A page
 * that only calls `flow.submit.run()` cannot write a field the plan does not
 * know — there is no way to spell it.
 *
 * YOU decide what a person notices, through the options:
 *   steps     which wizard step asks which field (default: one step per pick,
 *             then one for the typed fields, then "Prüfen" = step 3)
 *   items     how a search hit is displayed per pick (title, subtitle, status …)
 *   initial   prefills for typed fields
 *   messages  the sentence for an empty required field, per field
 *
 *   const flow = useArtikelAnlegenFlow({
 *     steps: { lagerort: 1, artikelbezeichnung: 2, artikelnummer: 2, kategorie: 2, hersteller: 2, seriennummer: 2, aktueller_bestand: 2, mindestbestand: 2, einheit: 2, zustand: 2, anschaffungsdatum: 2, anschaffungspreis: 2, bemerkungen: 2 },
 *     items: { lagerort: r => ({ id: r.id, title: fieldText(r, 'bezeichnung') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.lagerort.select} {...flow.pick('lagerort')} />
 *     <Bound form={flow.forms.artikel} name="artikelbezeichnung" />
 *     <Bound form={flow.forms.artikel} name="artikelnummer" />
 *     <Bound form={flow.forms.artikel} name="kategorie" />
 *     <Bound form={flow.forms.artikel} name="hersteller" />
 *     <Bound form={flow.forms.artikel} name="seriennummer" />
 *     <Bound form={flow.forms.artikel} name="aktueller_bestand" />
 *     <Bound form={flow.forms.artikel} name="mindestbestand" />
 *     <Bound form={flow.forms.artikel} name="einheit" />
 *     <Bound form={flow.forms.artikel} name="zustand" />
 *     <Bound form={flow.forms.artikel} name="anschaffungsdatum" />
 *     <Bound form={flow.forms.artikel} name="anschaffungspreis" />
 *     <Bound form={flow.forms.artikel} name="bemerkungen" />
 *     <StepNav onNext={() => flow.validateStep(n)} />
 *     {!flow.submit.done && <SummaryStep forms={flow.formList} submit={flow.submit} />}
 *     {flow.submit.result && <SuccessStep result={flow.submit.result} forms={flow.formList} submit={flow.submit} />}
 *   </IntentWizardShell>
 */
import {
  useStepForm, useJourneySubmit, useRecordSearch,
  fieldText, fieldLookup, fieldLookups, fieldNumber, fieldDate, fieldRef,
  todayIso, nowIso, isEmptyValue, policyFixedValue, withPickPolicy, usePolicyVersion,
  type StepForm, type JourneyRecord, type RefContext, type SelectItemLike, type FormValues, type PlanStep,} from '@/lib/journey';
import { servicePort } from '@/services/journeyPort';
import { pickHint, whereSentence, type PickWhere } from '@/lib/journey/policy';
import { labelOf, optionsOf, type EntityKey } from '@/lib/journey/rules';
export type ArtikelAnlegenFieldKey = 'aktueller_bestand' | 'anschaffungsdatum' | 'anschaffungspreis' | 'artikelbezeichnung' | 'artikelnummer' | 'bemerkungen' | 'einheit' | 'hersteller' | 'kategorie' | 'lagerort' | 'mindestbestand' | 'seriennummer' | 'zustand';

export interface ArtikelAnlegenForms {
  artikel: StepForm<'artikel'>;
}

// Alias so the option generics stay readable.
type Key = ArtikelAnlegenFieldKey;

export interface ArtikelAnlegenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    lagerort?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"aktueller_bestand": 2, "anschaffungsdatum": 2, "anschaffungspreis": 2, "artikelbezeichnung": 2, "artikelnummer": 2, "bemerkungen": 2, "einheit": 2, "hersteller": 2, "kategorie": 2, "lagerort": 1, "mindestbestand": 2, "seriennummer": 2, "zustand": 2};
export const ARTIKELANLEGEN_REVIEW_STEP = 3;

function fromPick<T>(pick: { recordOf(id: string): JourneyRecord | undefined }, form: StepForm, field: string, read: (r: JourneyRecord) => T): T | undefined {
  const id = form.get(field);
  const rec = typeof id === 'string' && id ? pick.recordOf(id) : undefined;
  return rec ? read(rec) : undefined;
}
function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Returns T, not Partial<T>: a Record's index signature is already "maybe
// absent", and Partial<Record<string, string>> does not assign to the
// Record<string, string> useStepForm wants (tsc, live 23.09.2026 — eight
// errors, one per hook, caught only in the sandbox build).
function only<T extends Record<string, unknown>>(obj: T | undefined, keys: string[]): T | undefined {
  if (!obj) return undefined;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out as T;
}

function hasValues(form: StepForm): boolean {
  return form.keys.some(k => !isEmptyValue(form.values[k]));
}

export function useArtikelAnlegenFlow(options: ArtikelAnlegenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const artikel = useStepForm('artikel', {
    fields: ["artikelbezeichnung", "artikelnummer", "kategorie", "hersteller", "seriennummer", "aktueller_bestand", "mindestbestand", "einheit", "zustand", "anschaffungsdatum", "anschaffungspreis", "lagerort", "bemerkungen"],
    steps: only(steps, ["artikelbezeichnung", "artikelnummer", "kategorie", "hersteller", "seriennummer", "aktueller_bestand", "mindestbestand", "einheit", "zustand", "anschaffungsdatum", "anschaffungspreis", "lagerort", "bemerkungen"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["artikelbezeichnung", "artikelnummer", "kategorie", "hersteller", "seriennummer", "aktueller_bestand", "mindestbestand", "einheit", "zustand", "anschaffungsdatum", "anschaffungspreis", "lagerort", "bemerkungen"]),
    messages: only(options.messages as Record<string, string> | undefined, ["artikelbezeichnung", "artikelnummer", "kategorie", "hersteller", "seriennummer", "aktueller_bestand", "mindestbestand", "einheit", "zustand", "anschaffungsdatum", "anschaffungspreis", "lagerort", "bemerkungen"]),
  });
  const forms: ArtikelAnlegenForms = { artikel };
  const formList: StepForm[] = [artikel];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    lagerort: useRecordSearch(servicePort, 'lagerorte', withPickPolicy('lagerort', {
      searchFields: ["bezeichnung"] as never,
      toItem: options.items?.lagerort as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:artikel-anlegen:read:${entity}`);
  const picks = {
    lagerort: { ...searches.lagerort, select: { ...searches.lagerort.select, create: false as boolean, hint: hintFor('lagerort', 'lagerorte', null as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'artikel', entity: 'artikel', form: artikel, primary: true,
      // the planner's assumptions that first act here — shown once with „Passt“ / „ändern“
      notices: () => [{"assumed": "direkt am Artikel eingetragen, ohne Zugangsbuchung", "id": "anfangsbestand-buchung", "question": "Soll der Anfangsbestand als Zugang gebucht werden?"}],
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'artikel-anlegen' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: ArtikelAnlegenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return {
      selectedId: (typeof owner.get(field) === 'string' ? (owner.get(field) as string) : null) || null,
      // `field as never` collapsed the conditional SetArgs<E, never> to never and
      // no argument was assignable any more (tsc, live 23.09.2026); widen `set`
      // itself instead — the label stays a required third argument.
      onSelect: (id: string) => (owner.set as (k: string, v: unknown, l?: string) => void)(field, id, search?.labelOf(id)),
    };
  };
  /** Props for a multi-record pick step: {...flow.picks.x.select} {...flow.pickMany('x')} */
  const pickMany = (field: ArtikelAnlegenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'artikel-anlegen' as const,
    draftKey: 'artikel-anlegen' as const,
    entity: 'artikel' as const,
    form: artikel,
    forms, formList, picks, submit, steps,    reviewStep: ARTIKELANLEGEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type ArtikelAnlegenFlow = ReturnType<typeof useArtikelAnlegenFlow>;
