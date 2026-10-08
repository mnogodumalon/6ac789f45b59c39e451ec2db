/**
 * Artikel anlegen — 4-Schritt-Wizard.
 * Steps: 1) Artikeldaten eintragen → 2) Lagerort wählen → 3) Bestand & Mindestbestand → 4) Prüfen & speichern.
 * Reads: lagerorte. Writes: artikel (über den Flow-Hook useArtikelAnlegenFlow).
 * Composes: IntentWizardShell, Bound, EntitySelectStep, StepNav, SummaryStep, SuccessStep.
 */
import { useState } from 'react';
import { IntentWizardShell, WizardStep } from '@/components/blocks/IntentWizardShell';
import { Bound } from '@/components/blocks/Bound';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StepNav } from '@/components/blocks/StepNav';
import { SummaryStep } from '@/components/blocks/SummaryStep';
import { SuccessStep } from '@/components/blocks/SuccessStep';
import { fieldText, fieldLookup } from '@/lib/journey';
import { useArtikelAnlegenFlow } from '@/lib/journey/flows/ArtikelAnlegen';
import { tx } from '@/i18n';

export default function ArtikelAnlegenPage() {
  const [step, setStep] = useState(1);
  const flow = useArtikelAnlegenFlow({
    steps: {
      artikelbezeichnung: 1, artikelnummer: 1, kategorie: 1, hersteller: 1, seriennummer: 1,
      zustand: 1, anschaffungsdatum: 1, anschaffungspreis: 1, bemerkungen: 1,
      lagerort: 2,
      aktueller_bestand: 3, mindestbestand: 3, einheit: 3,
    },
    items: {
      lagerort: r => ({
        id: r.id,
        title: fieldText(r, 'bezeichnung'),
        subtitle: fieldLookup(r, 'typ')?.label,
      }),
    },
  });

  const artikel = flow.forms.artikel;
  const bestand = Number(artikel.get('aktueller_bestand'));
  const minimum = Number(artikel.get('mindestbestand'));
  const hasBestand = artikel.get('aktueller_bestand') !== undefined && artikel.get('aktueller_bestand') !== '' && !Number.isNaN(bestand);
  const hasMin = artikel.get('mindestbestand') !== undefined && artikel.get('mindestbestand') !== '' && !Number.isNaN(minimum);
  const belowMin = hasBestand && hasMin && bestand < minimum;

  return (
    <IntentWizardShell
      title={tx('Artikel anlegen')}
      currentStep={step}
      onStepChange={setStep}
      forms={flow.formList}
      draftKey={flow.draftKey}
      intro={{
        description: tx('Einen neuen Artikel mit Lagerort und Bestand erfassen.'),
        needs: [tx('Artikelbezeichnung und Kategorie'), tx('Aktueller Bestand')],
      }}
    >
      <WizardStep label={tx('Artikeldaten')} description={tx('Wie heißt der Artikel und was ist es?')}>
        <div className="space-y-4">
          <Bound form={artikel} name="artikelbezeichnung" />
          <Bound form={artikel} name="kategorie" />
          <Bound form={artikel} name="artikelnummer" />
          <Bound form={artikel} name="hersteller" />
          <Bound form={artikel} name="seriennummer" />
          <Bound form={artikel} name="zustand" allowClear />
          <Bound form={artikel} name="anschaffungsdatum" />
          <Bound form={artikel} name="anschaffungspreis" />
          <Bound form={artikel} name="bemerkungen" />
          <StepNav
            hideBack
            onNext={() => flow.validateStep(1)}
            nextStepLabel={tx('Lagerort')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Lagerort')} description={tx('Wo wird der Artikel aufbewahrt? Du kannst den Schritt auch überspringen.')}>
        <div className="space-y-4">
          <EntitySelectStep
            {...flow.picks.lagerort.select}
            {...flow.pick('lagerort')}
            searchPlaceholder={tx('Lagerort suchen …')}
          />
          <StepNav
            onBack={() => setStep(1)}
            onNext={() => flow.validateStep(2)}
            nextStepLabel={tx('Bestand')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Bestand')} description={tx('Wie viel ist da und ab wann soll nachbestellt werden?')}>
        <div className="space-y-4">
          <Bound form={artikel} name="aktueller_bestand" />
          <Bound form={artikel} name="mindestbestand" />
          <Bound form={artikel} name="einheit" allowClear />
          {belowMin && (
            <p className="text-xs text-destructive">
              {tx`Der aktuelle Bestand (${bestand}) liegt unter dem Mindestbestand (${minimum}).`}
            </p>
          )}
          <StepNav
            onBack={() => setStep(2)}
            onNext={() => flow.validateStep(3)}
            nextStepLabel={tx('Prüfen')}
          />
        </div>
      </WizardStep>

      <WizardStep label={tx('Speichern')}>
        {!flow.submit.done && (
          <SummaryStep
            forms={flow.formList}
            submit={flow.submit}
            whatHappensNext={tx('Der Artikel erscheint sofort im Bestand und kann Bewegungen erhalten.')}
          />
        )}
      </WizardStep>

      {flow.submit.result && (
        <SuccessStep
          result={flow.submit.result}
          forms={flow.formList}
          submit={flow.submit}
          next={[
            { label: tx('Bestandsbewegung erfassen'), href: '#/intents/bestandsbewegung-erfassen' },
            { label: tx('Zum Dashboard'), href: '#/' },
          ]}
        />
      )}
    </IntentWizardShell>
  );
}
