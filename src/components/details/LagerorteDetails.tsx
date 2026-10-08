import type { Lagerorte, Artikel } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';
import { usePermissions } from '@/lib/permissions';

export interface LagerorteDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Lagerorte;
  /** 1:N „Artikel" (lagerort): VOLLE Liste — der Block filtert auf diesen Record. */
  artikelList: Artikel[];
  /** Zeilen-Klick → overlay.push auf das Artikel-Detail (nie der Edit-Dialog). */
  onOpenArtikel: (record: Artikel) => void;
  /** Kontextuelles „+": öffnet den Artikel-Dialog mit diesem Record vorgesetzt. */
  onAddArtikel?: () => void;
}

export function LagerorteDetails({
  record,
  artikelList,
  onOpenArtikel,
  onAddArtikel,
}: LagerorteDetailsProps) {
  // attachments are a write to this record — read-only without the platform right
  const perms = usePermissions();
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('lagerorte', 'bezeichnung')} value={record.fields.bezeichnung} format="text" />
        <RecordField label={fieldLabel('lagerorte', 'typ')} value={record.fields.typ} format="pill" />
        <RecordField label={fieldLabel('lagerorte', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('lagerorte', 'bemerkungen')} value={record.fields.bemerkungen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('artikel')}
        items={artikelList.filter(r => extractRecordId(r.fields.lagerort) === record.record_id)}
        map={r => ({ name: r.fields.artikelbezeichnung ?? appLabel('artikel'), meta: r.fields.anschaffungsdatum })}
        onOpen={onOpenArtikel}
        onAdd={onAddArtikel}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.LAGERORTE} recordId={record.record_id} readOnly={!perms.canWrite('lagerorte')} />
    </>
  );
}
