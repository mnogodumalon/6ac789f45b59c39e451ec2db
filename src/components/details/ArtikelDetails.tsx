import type { Artikel, Lagerorte, Bestandsbewegungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface ArtikelDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Artikel;
  /** N:1-Ziel „Lagerorte": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  lagerorteList: Lagerorte[];
  /** Klick auf die Lagerorte-Relation → overlay.push auf dessen Detail. */
  onOpenLagerorte?: (record: Lagerorte) => void;
  /** 1:N „Bestandsbewegungen" (artikel): VOLLE Liste — der Block filtert auf diesen Record. */
  bestandsbewegungenList: Bestandsbewegungen[];
  /** Zeilen-Klick → overlay.push auf das Bestandsbewegungen-Detail (nie der Edit-Dialog). */
  onOpenBestandsbewegungen: (record: Bestandsbewegungen) => void;
  /** Kontextuelles „+": öffnet den Bestandsbewegungen-Dialog mit diesem Record vorgesetzt. */
  onAddBestandsbewegungen?: () => void;
}

export function ArtikelDetails({
  record,
  lagerorteList,
  onOpenLagerorte,
  bestandsbewegungenList,
  onOpenBestandsbewegungen,
  onAddBestandsbewegungen,
}: ArtikelDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const lagerortTarget = lagerorteList.find(r => r.record_id === extractRecordId(record.fields.lagerort));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('artikel', 'artikelbezeichnung')} value={record.fields.artikelbezeichnung} format="text" />
        <RecordField label={fieldLabel('artikel', 'artikelnummer')} value={record.fields.artikelnummer} format="text" />
        <RecordField label={fieldLabel('artikel', 'kategorie')} value={record.fields.kategorie} format="pill" />
        <RecordField label={fieldLabel('artikel', 'hersteller')} value={record.fields.hersteller} format="text" />
        <RecordField label={fieldLabel('artikel', 'seriennummer')} value={record.fields.seriennummer} format="text" />
        <RecordField label={fieldLabel('artikel', 'aktueller_bestand')} value={record.fields.aktueller_bestand} format="text" />
        <RecordField label={fieldLabel('artikel', 'mindestbestand')} value={record.fields.mindestbestand} format="text" />
        <RecordField label={fieldLabel('artikel', 'einheit')} value={record.fields.einheit} format="pill" />
        <RecordField label={fieldLabel('artikel', 'zustand')} value={record.fields.zustand} format="pill" />
        <RecordField label={fieldLabel('artikel', 'anschaffungsdatum')} value={record.fields.anschaffungsdatum} format="date" />
        <RecordField label={fieldLabel('artikel', 'anschaffungspreis')} value={record.fields.anschaffungspreis} format="text" />
        <RecordField label={fieldLabel('artikel', 'bemerkungen')} value={record.fields.bemerkungen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('artikel', 'lagerort')}
          name={lagerortTarget?.fields.bezeichnung ?? '—'}
          meta={undefined}
          onClick={lagerortTarget && onOpenLagerorte ? () => onOpenLagerorte!(lagerortTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('bestandsbewegungen')}
        items={bestandsbewegungenList.filter(r => extractRecordId(r.fields.artikel) === record.record_id)}
        map={r => ({ name: r.fields.person_vorname ?? appLabel('bestandsbewegungen'), meta: r.fields.zeitpunkt })}
        onOpen={onOpenBestandsbewegungen}
        onAdd={onAddBestandsbewegungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.ARTIKEL} recordId={record.record_id} readOnly={!perms.canWrite('artikel')} />
    </>
  );
}
