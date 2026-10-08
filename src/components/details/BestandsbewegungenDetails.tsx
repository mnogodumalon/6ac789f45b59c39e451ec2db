import type { Bestandsbewegungen, Artikel } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { usePermissions } from '@/lib/permissions';

export interface BestandsbewegungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Bestandsbewegungen;
  /** N:1-Ziel „Artikel": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  artikelList: Artikel[];
  /** Klick auf die Artikel-Relation → overlay.push auf dessen Detail. */
  onOpenArtikel?: (record: Artikel) => void;
}

export function BestandsbewegungenDetails({
  record,
  artikelList,
  onOpenArtikel,
}: BestandsbewegungenDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  const artikelTarget = artikelList.find(r => r.record_id === extractRecordId(record.fields.artikel));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('bestandsbewegungen', 'bewegungsart')} value={record.fields.bewegungsart} format="pill" />
        <RecordField label={fieldLabel('bestandsbewegungen', 'zeitpunkt')} value={record.fields.zeitpunkt} format="datetime" />
        <RecordField label={fieldLabel('bestandsbewegungen', 'menge')} value={record.fields.menge} format="text" />
        <RecordField label={fieldLabel('bestandsbewegungen', 'person_vorname')} value={record.fields.person_vorname} format="text" />
        <RecordField label={fieldLabel('bestandsbewegungen', 'person_nachname')} value={record.fields.person_nachname} format="text" />
        <RecordField label={fieldLabel('bestandsbewegungen', 'bemerkungen')} value={record.fields.bemerkungen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('bestandsbewegungen', 'artikel')}
          name={artikelTarget?.fields.artikelbezeichnung ?? '—'}
          meta={[artikelTarget?.fields.artikelnummer, artikelTarget?.fields.hersteller].filter(Boolean).join(' · ') || undefined}
          onClick={artikelTarget && onOpenArtikel ? () => onOpenArtikel!(artikelTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.BESTANDSBEWEGUNGEN} recordId={record.record_id} readOnly={!perms.canWrite('bestandsbewegungen')} />
    </>
  );
}
