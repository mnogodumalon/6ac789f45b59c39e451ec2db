/**
 * Bestandsbewegung erfassen — 4-Schritt-Wizard.
 * Steps: 1) Artikel wählen (mit aktuellem Bestand) → 2) Art der Bewegung → 3) Menge & Person → 4) Prüfen & speichern.
 * Reads: artikel (Bestand, Einheit, Lagerort). Writes: bestandsbewegungen (via useBestandsbewegungErfassenFlow).
 * Composes: IntentWizardShell, EntitySelectStep, ChoiceGroup, Bound, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { ChoiceGroup } from '@/components/blocks/ChoiceGroup';
import { Field } from '@/components/blocks/Field';
import { Bound } from '@/components/blocks/Bound';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldNumber, fieldLookup } from '@/lib/journey';
import { useBestandsbewegungErfassenFlow } from '@/lib/journey/flows/BestandsbewegungErfassen';
import { tx } from '@/i18n';

const OUTGOING = ['entnahme', 'aussonderung'];

export default function BestandsbewegungErfassenPage() {
  const [step, setStep] = useState(1);
  const flow = useBestandsbewegungErfassenFlow({
    steps: { artikel: 1, bewegungsart: 2, menge: 3, person_vorname: 3, person_nachname: 3, bemerkungen: 3 },
    items: {
      artikel: r => {
        const einheit = fieldLookup(r, 'einheit')?.label ?? '';
        const bestand = fieldNumber(r, 'aktueller_bestand') ?? 0;
        return {
          id: r.id,
          title: fieldText(r, 'artikelbezeichnung'),
          subtitle: fieldText(r, 'artikelnummer') || undefined,
          stats: [{ label: tx('Bestand'), value: `${bestand} ${einheit}`.trim() }],
        };
      },
    },
  });

  const f = flow.forms.bestandsbewegungen;
  const artikelId = f.get('artikel') as string | undefined;
  const artikel = artikelId ? flow.picks.artikel.recordOf(artikelId) : undefined;
  const bestand = artikel ? fieldNumber(artikel, 'aktueller_bestand') ?? 0 : null;
  const einheit = artikel ? fieldLookup(artikel, 'einheit')?.label ?? '' : '';
  const art = f.get('bewegungsart') as string | undefined;
  const mengeRaw = f.get('menge');
  const menge = Number(mengeRaw ?? 0);
  const outgoing = !!art && OUTGOING.includes(art);
  const overshoot = outgoing && bestand !== null && menge > bestand;
  const sign = outgoing ? -1 : 1;
  const neuerBestand = bestand !== null && art && art !== 'korrektur' && menge > 0 ? bestand + sign * menge : null;

  const checkMenge = () => {
    if (!flow.validateStep(3)) return false;
    if (overshoot) return tx('Der Bestand reicht für diese Menge nicht aus.');
    return true;
  };

  return (
    <IntentWizardShell
      title={tx('Bestandsbewegung erfassen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Entnahme, Rückgabe, Zugang, Korrektur oder Aussonderung festhalten.'),
        needs: [tx('Artikel'), tx('Menge'), tx('Name der ausführenden Person')],
      }}
    >
      <WizardStep label={tx('Artikel')} description={tx('Wähle den Artikel — sein aktueller Bestand wird angezeigt.')}>
        <EntitySelectStep
          {...flow.picks.artikel.select}
          {...flow.pick('artikel')}
          searchPlaceholder={tx('Bezeichnung oder Nummer …')}
        />
      </WizardStep>

      <WizardStep label={tx('Bewegung')} description={tx('Was passiert mit dem Artikel?')} needs={['artikel']}>
        <div className="space-y-4">
          {bestand !== null && (
            <p className="rounded-xl bg-secondary px-4 py-3 text-sm">
              {tx`${fieldText(artikel!, 'artikelbezeichnung')}: aktuell ${bestand} ${einheit} auf Lager`}
            </p>
          )}
          <Field form={f} name="bewegungsart">
            <ChoiceGroup {...f.choice('bewegungsart')} />
          </Field>
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Menge & Person')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Menge')} description={tx('Wie viel und wer führt die Bewegung aus?')} needs={['artikel', 'bewegungsart']}>
        <div className="space-y-4">
          {bestand !== null && (
            <p className="rounded-xl bg-secondary px-4 py-3 text-sm">
              {tx`Aktueller Bestand: ${bestand} ${einheit}`}
              {neuerBestand !== null && <span className="text-muted-foreground">{tx` → danach ${neuerBestand} ${einheit}`}</span>}
            </p>
          )}
          <Bound form={f} name="menge" />
          {overshoot && (
            <p className="text-xs text-destructive" role="alert">
              {tx`Der Bestand reicht für diese Menge nicht aus (verfügbar: ${bestand ?? 0} ${einheit}).`}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Bound form={f} name="person_vorname" />
            <Bound form={f} name="person_nachname" />
          </div>
          <Bound form={f} name="bemerkungen" rows={3} />
          <StepNav onBack={() => setStep(2)} onNext={checkMenge} nextStepLabel={tx('Prüfen')} />
        </div>
      </WizardStep>

      <WizardStep label={tx('Prüfen')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            items={[
              ...(neuerBestand !== null
                ? [{ key: 'neuer_bestand', label: tx('Bestand danach'), value: `${neuerBestand} ${einheit}`.trim() }]
                : []),
            ]}
            whatHappensNext={tx('Die Bewegung wird gespeichert und der Bestand des Artikels vom System angepasst.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          facts={[
            ...(artikel ? [{ label: tx('Artikel'), value: fieldText(artikel, 'artikelbezeichnung') }] : []),
            { label: tx('Menge'), value: `${menge} ${einheit}`.trim() },
            ...(neuerBestand !== null ? [{ label: tx('Aktueller Bestand'), value: `${neuerBestand} ${einheit}`.trim() }] : []),
          ]}
          whatHappensNext={tx('Der Bestand des Artikels wird vom System angepasst.')}
          next={[
            { label: tx('Weitere Bewegung erfassen'), onClick: () => { flow.reset(); setStep(1); } },
            { label: tx('Artikel anlegen'), href: '#/intents/artikel-anlegen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
