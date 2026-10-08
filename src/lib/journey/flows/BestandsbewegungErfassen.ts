/**
 * useBestandsbewegungErfassenFlow — the plumbing of the flow « Bestandsbewegung erfassen », generated from the plan.
 *
 * Writes `bestandsbewegungen`: asks `artikel`, `bewegungsart`, `menge`, `person_vorname`, `person_nachname`, `bemerkungen`; sets `zeitpunkt` itself.
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
 *   const flow = useBestandsbewegungErfassenFlow({
 *     steps: { artikel: 1, bewegungsart: 2, menge: 2, person_vorname: 2, person_nachname: 2, bemerkungen: 2 },
 *     items: { artikel: r => ({ id: r.id, title: fieldText(r, 'artikelbezeichnung') }) },
 *   });
 *   <IntentWizardShell forms={flow.forms} draftKey={flow.draftKey} …>
 *     <EntitySelectStep {...flow.picks.artikel.select} {...flow.pick('artikel')} />
 *     <Bound form={flow.forms.bestandsbewegungen} name="bewegungsart" />
 *     <Bound form={flow.forms.bestandsbewegungen} name="menge" />
 *     <Bound form={flow.forms.bestandsbewegungen} name="person_vorname" />
 *     <Bound form={flow.forms.bestandsbewegungen} name="person_nachname" />
 *     <Bound form={flow.forms.bestandsbewegungen} name="bemerkungen" />
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
export type BestandsbewegungErfassenFieldKey = 'artikel' | 'bemerkungen' | 'bewegungsart' | 'menge' | 'person_nachname' | 'person_vorname';

export interface BestandsbewegungErfassenForms {
  bestandsbewegungen: StepForm<'bestandsbewegungen'>;
}

// Alias so the option generics stay readable.
type Key = BestandsbewegungErfassenFieldKey;

export interface BestandsbewegungErfassenFlowOptions {
  /** field → wizard step that asks it; drives „Ändern“ links and answer chips. */
  steps?: Partial<Record<Key, number>>;
  initial?: Partial<Record<Key, unknown>>;
  messages?: Partial<Record<Key, string>>;
  /** How a search hit reads — the card's title/subtitle/status per pick. */
  items?: {
    artikel?: (record: JourneyRecord, ctx: RefContext) => SelectItemLike;
  };
}

const DEFAULT_STEPS: Record<string, number> = {"artikel": 1, "bemerkungen": 2, "bewegungsart": 2, "menge": 2, "person_nachname": 2, "person_vorname": 2};
export const BESTANDSBEWEGUNGERFASSEN_REVIEW_STEP = 3;

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

export function useBestandsbewegungErfassenFlow(options: BestandsbewegungErfassenFlowOptions = {}) {
  const steps = { ...DEFAULT_STEPS, ...(options.steps ?? {}) } as Record<string, number>;
  const bestandsbewegungen = useStepForm('bestandsbewegungen', {
    fields: ["artikel", "bewegungsart", "menge", "person_vorname", "person_nachname", "bemerkungen"],
    steps: only(steps, ["artikel", "bewegungsart", "menge", "person_vorname", "person_nachname", "bemerkungen"]) as Record<string, number>,
    initial: only(options.initial as FormValues | undefined, ["artikel", "bewegungsart", "menge", "person_vorname", "person_nachname", "bemerkungen"]),
    messages: only(options.messages as Record<string, string> | undefined, ["artikel", "bewegungsart", "menge", "person_vorname", "person_nachname", "bemerkungen"]),
  });
  const forms: BestandsbewegungErfassenForms = { bestandsbewegungen };
  const formList: StepForm[] = [bestandsbewegungen];

  // The owner's rules after the build (intent-policies.json): a fixed value
  // for a field this flow sets itself, a narrower or wider pick — read at
  // render time, so a change works on the running application.
  usePolicyVersion();
  const searches = {
    artikel: useRecordSearch(servicePort, 'artikel', withPickPolicy('artikel', {
      searchFields: ["artikelbezeichnung", "artikelnummer"] as never,
      toItem: options.items?.artikel as never,
    })),
  };
  // Whether a pick offers „Neu anlegen“ is the plan's call: off for the record
  // this flow changes, for multi picks, for a catalogue entity and for an
  // entity with its own flow. The page spreads `.select` and writes no `create=`.
  // what the person sees under the search field: the rule that narrows the
  // pick (the owner's, else the plan's) — and the link that changes it
  const hintFor = (key: string, entity: EntityKey, planned: PickWhere | null) => pickHint(key, planned,
    w => whereSentence(w, f => labelOf(entity, f), (f, v) => optionsOf(entity, f).find(o => o.key === String(v))?.label ?? String(v)),
    `#/verwaltung/anwendung?line=intent:bestandsbewegung-erfassen:read:${entity}`);
  const picks = {
    artikel: { ...searches.artikel, select: { ...searches.artikel.select, create: false as boolean, hint: hintFor('artikel', 'artikel', null as PickWhere | null) } },
  };

  const plan: PlanStep[] = [
    {
      key: 'bestandsbewegungen', entity: 'bestandsbewegungen', form: bestandsbewegungen, primary: true,
      values: (): FormValues => ({
        zeitpunkt: policyFixedValue('bestandsbewegungen', 'zeitpunkt') ?? nowIso(),
      }),
    },
  ];

  const submit = useJourneySubmit(servicePort, plan, { draftKey: 'bestandsbewegung-erfassen' });

  /** Props for a single-record pick step: {...flow.picks.x.select} {...flow.pick('x')} */
  const pick = (field: BestandsbewegungErfassenFieldKey) => {
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
  const pickMany = (field: BestandsbewegungErfassenFieldKey) => {
    const owner = formList.find(f => f.keys.includes(field)) ?? formList[0];
    const search = (picks as Record<string, { labelOf(id: string): string | undefined }>)[field];
    return owner.records(field, id => search?.labelOf(id));
  };
  /** Validate every field the wizard asks in step `n` — for StepNav.onNext. */
  const validateStep = (n: number): boolean =>
    formList.every(f => f.validate(f.keys.filter(k => steps[k] === n)));
  const reset = () => { submit.reset(); formList.forEach(f => f.reset()); };

  return {
    slug: 'bestandsbewegung-erfassen' as const,
    draftKey: 'bestandsbewegung-erfassen' as const,
    entity: 'bestandsbewegungen' as const,
    form: bestandsbewegungen,
    forms, formList, picks, submit, steps,    reviewStep: BESTANDSBEWEGUNGERFASSEN_REVIEW_STEP,
    pick, pickMany, validateStep, reset,
    // the door the hook reads through — for what it does not own: availability
    // (useOccupancy(flow.port, …)), a count (useRecordCount(flow.port, …)). A page
    // importing servicePort next to the hook fails gate 3 (fewo 05.10.2026: the
    // gate taught useOccupancy(servicePort, …) and forbade servicePort at once)
    port: servicePort,
  };
}

export type BestandsbewegungErfassenFlow = ReturnType<typeof useBestandsbewegungErfassenFlow>;
