/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'lagerorte'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.lagerorte.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.lagerorte.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.lagerorte.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.lagerorte              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   lagerorte: bezeichnung, typ, beschreibung, bemerkungen  ·  ← artikel (list + contextual +)
 *   artikel: artikelbezeichnung, artikelnummer, kategorie, hersteller, seriennummer, aktueller_bestand, mindestbestand, einheit, …  ·  → lagerorte · ← bestandsbewegungen (list + contextual +)
 *   bestandsbewegungen: artikel, bewegungsart, zeitpunkt, menge, person_vorname, person_nachname, bemerkungen  ·  → artikel
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Lagerorte, Artikel, Bestandsbewegungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichArtikel, enrichBestandsbewegungen } from '@/lib/enrich';
import type { EnrichedArtikel, EnrichedBestandsbewegungen } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { LagerorteDialog, type LagerorteDialogDefaults } from '@/components/dialogs/LagerorteDialog';
import { LagerorteDetails } from '@/components/details/LagerorteDetails';
import { ArtikelDialog, type ArtikelDialogDefaults } from '@/components/dialogs/ArtikelDialog';
import { ArtikelDetails } from '@/components/details/ArtikelDetails';
import { BestandsbewegungenDialog, type BestandsbewegungenDialogDefaults } from '@/components/dialogs/BestandsbewegungenDialog';
import { BestandsbewegungenDetails } from '@/components/details/BestandsbewegungenDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { usePermissions } from '@/lib/permissions';
import { toast } from 'sonner';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'lagerorte'; record: Lagerorte }
  | { type: 'artikel'; record: EnrichedArtikel }
  | { type: 'bestandsbewegungen'; record: EnrichedBestandsbewegungen };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
  /** May the signed-in user create/change records of this list? (the
   *  platform's rights — show a „+ Neu“ only when true; openCreate/openEdit
   *  refuse with a notice otherwise). */
  canWrite: boolean;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  lagerorte: EntityCrudApi<Lagerorte, LagerorteDialogDefaults>;
  artikel: EntityCrudApi<Artikel, ArtikelDialogDefaults>;
  bestandsbewegungen: EntityCrudApi<Bestandsbewegungen, BestandsbewegungenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { lagerorte: Lagerorte[]; artikel: EnrichedArtikel[]; bestandsbewegungen: EnrichedBestandsbewegungen[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  // the platform's rights of the signed-in user (lib/permissions.ts) — unknown = allowed
  const perms = usePermissions();
  const refuse = () => { toast.error(t('perm_denied_title'), { description: t('perm_denied_desc') }); };
  const [lagerorteDialog, setLagerorteDialog] = useState<{ defaults?: LagerorteDialogDefaults; editing?: Lagerorte } | null>(null);
  const [artikelDialog, setArtikelDialog] = useState<{ defaults?: ArtikelDialogDefaults; editing?: Artikel } | null>(null);
  const [bestandsbewegungenDialog, setBestandsbewegungenDialog] = useState<{ defaults?: BestandsbewegungenDialogDefaults; editing?: Bestandsbewegungen } | null>(null);
  const enrichedArtikel = useMemo(() => enrichArtikel(data.artikel, { lagerorteMap: data.lagerorteMap }), [data.artikel, data.lagerorteMap]);
  const enrichedBestandsbewegungen = useMemo(() => enrichBestandsbewegungen(data.bestandsbewegungen, { artikelMap: data.artikelMap }), [data.bestandsbewegungen, data.artikelMap]);

  function detailLagerorte(record: Lagerorte, push = false) {
    const item: OverlayItem = { type: 'lagerorte', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitLagerorte(fields: Lagerorte['fields']) {
    const editing = lagerorteDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setLagerorte(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateLagerorteEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('lagerorte')} — ${t('crud_updated')}`, async () => {
        data.setLagerorte(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateLagerorteEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createLagerorteEntry(fields);
      undoToast(`${appLabel('lagerorte')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailArtikel(record: Artikel, push = false) {
    const rec = enrichedArtikel.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'artikel', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitArtikel(fields: Artikel['fields']) {
    const editing = artikelDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setArtikel(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateArtikelEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('artikel')} — ${t('crud_updated')}`, async () => {
        data.setArtikel(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateArtikelEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createArtikelEntry(fields);
      undoToast(`${appLabel('artikel')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailBestandsbewegungen(record: Bestandsbewegungen, push = false) {
    const rec = enrichedBestandsbewegungen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'bestandsbewegungen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitBestandsbewegungen(fields: Bestandsbewegungen['fields']) {
    const editing = bestandsbewegungenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setBestandsbewegungen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateBestandsbewegungenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('bestandsbewegungen')} — ${t('crud_updated')}`, async () => {
        data.setBestandsbewegungen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateBestandsbewegungenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createBestandsbewegungenEntry(fields);
      undoToast(`${appLabel('bestandsbewegungen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <LagerorteDialog
        open={lagerorteDialog !== null}
        onClose={() => setLagerorteDialog(null)}
        onSubmit={submitLagerorte}
        defaultValues={lagerorteDialog?.defaults}
        recordId={lagerorteDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Lagerorte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Lagerorte']}
      />
      <ArtikelDialog
        open={artikelDialog !== null}
        onClose={() => setArtikelDialog(null)}
        onSubmit={submitArtikel}
        defaultValues={artikelDialog?.defaults}
        recordId={artikelDialog?.editing?.record_id}
        lagerorteList={data.lagerorte}
        enablePhotoScan={AI_PHOTO_SCAN['Artikel']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Artikel']}
      />
      <BestandsbewegungenDialog
        open={bestandsbewegungenDialog !== null}
        onClose={() => setBestandsbewegungenDialog(null)}
        onSubmit={submitBestandsbewegungen}
        defaultValues={bestandsbewegungenDialog?.defaults}
        recordId={bestandsbewegungenDialog?.editing?.record_id}
        artikelList={data.artikel}
        enablePhotoScan={AI_PHOTO_SCAN['Bestandsbewegungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Bestandsbewegungen']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'lagerorte') {
            return (
              <>
                <RecordHeader title={top.record.fields.bezeichnung ?? appLabel('lagerorte')} subtitle={undefined} />
                <LagerorteDetails
                  record={top.record}
                  artikelList={data.artikel}
                  onOpenArtikel={(r) => detailArtikel(r, true)}
                  onAddArtikel={perms.canWrite('artikel') ? () => setArtikelDialog({ defaults: { lagerort: createRecordUrl(APP_IDS.LAGERORTE, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'artikel') {
            return (
              <>
                <RecordHeader title={top.record.fields.artikelbezeichnung ?? appLabel('artikel')} subtitle={top.record.fields.anschaffungsdatum ? formatDate(top.record.fields.anschaffungsdatum) : undefined} />
                <ArtikelDetails
                  record={top.record}
                  lagerorteList={data.lagerorte}
                  onOpenLagerorte={(r) => detailLagerorte(r, true)}
                  bestandsbewegungenList={data.bestandsbewegungen}
                  onOpenBestandsbewegungen={(r) => detailBestandsbewegungen(r, true)}
                  onAddBestandsbewegungen={perms.canWrite('bestandsbewegungen') ? () => setBestandsbewegungenDialog({ defaults: { artikel: createRecordUrl(APP_IDS.ARTIKEL, top.record.record_id) } }) : undefined}
                />
              </>
            );
          }
          if (top.type === 'bestandsbewegungen') {
            return (
              <>
                <RecordHeader title={top.record.fields.person_vorname ?? appLabel('bestandsbewegungen')} subtitle={top.record.fields.zeitpunkt ? formatDate(top.record.fields.zeitpunkt) : undefined} />
                <BestandsbewegungenDetails
                  record={top.record}
                  artikelList={data.artikel}
                  onOpenArtikel={(r) => detailArtikel(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        canEdit={(top) => {
          if (top.type === 'lagerorte') return perms.canWrite('lagerorte');
          if (top.type === 'artikel') return perms.canWrite('artikel');
          if (top.type === 'bestandsbewegungen') return perms.canWrite('bestandsbewegungen');
          return true;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'lagerorte') setLagerorteDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'artikel') setArtikelDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'bestandsbewegungen') setBestandsbewegungenDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    lagerorte: {
      openCreate: (defaults?: LagerorteDialogDefaults) => (perms.canWrite('lagerorte') ? setLagerorteDialog({ defaults }) : refuse()),
      openEdit: (record: Lagerorte) => (perms.canWrite('lagerorte') ? setLagerorteDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Lagerorte) => detailLagerorte(record, false),
      canWrite: perms.canWrite('lagerorte'),
    },
    artikel: {
      openCreate: (defaults?: ArtikelDialogDefaults) => (perms.canWrite('artikel') ? setArtikelDialog({ defaults }) : refuse()),
      openEdit: (record: Artikel) => (perms.canWrite('artikel') ? setArtikelDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Artikel) => detailArtikel(record, false),
      canWrite: perms.canWrite('artikel'),
    },
    bestandsbewegungen: {
      openCreate: (defaults?: BestandsbewegungenDialogDefaults) => (perms.canWrite('bestandsbewegungen') ? setBestandsbewegungenDialog({ defaults }) : refuse()),
      openEdit: (record: Bestandsbewegungen) => (perms.canWrite('bestandsbewegungen') ? setBestandsbewegungenDialog({ editing: record, defaults: record.fields }) : refuse()),
      openDetail: (record: Bestandsbewegungen) => detailBestandsbewegungen(record, false),
      canWrite: perms.canWrite('bestandsbewegungen'),
    },
    enriched: { lagerorte: data.lagerorte, artikel: enrichedArtikel, bestandsbewegungen: enrichedBestandsbewegungen },
  };
}
