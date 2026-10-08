import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { IconAlertTriangle, IconPackage, IconPlus, IconArrowsExchange } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import type { EnrichedArtikel } from '@/types/enriched';
import type { Artikel } from '@/types/app';
import { lookupKey, formatDate } from '@/lib/formatters';
import { tx, appLabel, dateFnsLocale } from '@/i18n';
import { useClock, gruss, namen } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { Button } from '@/components/ui/button';
import { ChartWidget, type ChartRow } from '@/components/widgets/ChartWidget';

type StockFilter = 'all' | 'low' | 'empty';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const { bestandsbewegungen } = data;
  const crud = useEntityCrud(data);
  const enrichedArtikel = crud.enriched.artikel;
  const clock = useClock();
  const [filter, setFilter] = useState<StockFilter>('all');
  const [showAll, setShowAll] = useState(false);

  const isLow = (a: Artikel) =>
    a.fields.mindestbestand != null && (a.fields.aktueller_bestand ?? 0) < a.fields.mindestbestand;
  const isEmpty = (a: Artikel) => (a.fields.aktueller_bestand ?? 0) <= 0 && a.fields.mindestbestand != null;
  const isBroken = (a: Artikel) => {
    const z = lookupKey(a.fields.zustand);
    return z === 'defekt' || z === 'reparaturbeduerftig';
  };
  const ratio = (a: Artikel) => {
    const min = a.fields.mindestbestand ?? 0;
    return min > 0 ? (a.fields.aktueller_bestand ?? 0) / min : 99;
  };

  const lowItems = useMemo(() => enrichedArtikel.filter(isLow), [enrichedArtikel]);
  const emptyItems = useMemo(() => enrichedArtikel.filter(isEmpty), [enrichedArtikel]);
  const brokenItems = useMemo(() => enrichedArtikel.filter(isBroken), [enrichedArtikel]);

  const stockList = useMemo(() => {
    const base = filter === 'low' ? lowItems : filter === 'empty' ? emptyItems : enrichedArtikel;
    return [...base].sort((a, b) => {
      const ka = (isLow(a) ? 0 : isBroken(a) ? 1 : 2);
      const kb = (isLow(b) ? 0 : isBroken(b) ? 1 : 2);
      return ka - kb || ratio(a) - ratio(b);
    });
  }, [filter, lowItems, emptyItems, enrichedArtikel]);
  const visible = showAll ? stockList : stockList.slice(0, 10);

  const chartRows = useMemo<ChartRow<EnrichedArtikel>[]>(
    () => enrichedArtikel.map(a => ({ id: `artikel:${a.record_id}`, data: a })),
    [enrichedArtikel],
  );

  const recent = useMemo(
    () => [...crud.enriched.bestandsbewegungen]
      .sort((a, b) => (b.fields.zeitpunkt ?? b.createdat).localeCompare(a.fields.zeitpunkt ?? a.createdat))
      .slice(0, 6),
    [crud.enriched.bestandsbewegungen],
  );
  const todayKey = format(clock, 'yyyy-MM-dd');
  const todayCount = bestandsbewegungen.filter(b => (b.fields.zeitpunkt ?? '').slice(0, 10) === todayKey).length;

  const bookIn = (a: Artikel) => crud.bestandsbewegungen.openCreate({ artikel: a.record_id, bewegungsart: 'zugang' });

  const context = (() => {
    if (enrichedArtikel.length === 0) return tx`Richte dein Lager ein — lege den ersten Artikel an.`;
    const names = namen(lowItems.map(a => a.fields.artikelbezeichnung ?? ''), 3);
    if (lowItems.length > 0 && brokenItems.length > 0)
      return tx`Nachbestellen: ${names} — außerdem ${namen(brokenItems.map(a => a.fields.artikelbezeichnung ?? ''), 2)} defekt oder in Reparatur.`;
    if (lowItems.length > 0) return tx`Nachbestellen: ${names} liegt unter dem Mindestbestand.`;
    if (brokenItems.length > 0)
      return tx`Alle Bestände sind ausreichend — ${namen(brokenItems.map(a => a.fields.artikelbezeichnung ?? ''), 3)} braucht Aufmerksamkeit.`;
    return tx`Alle Bestände sind ausreichend und kein Artikel ist defekt.`;
  })();

  const zustandWord = (a: Artikel) => {
    const z = lookupKey(a.fields.zustand);
    if (z === 'defekt') return <span className="font-medium text-destructive">{a.fields.zustand?.label}</span>;
    if (z === 'reparaturbeduerftig') return <span className="font-medium text-amber-600">{a.fields.zustand?.label}</span>;
    return a.fields.zustand ? <span className="text-muted-foreground">{a.fields.zustand.label}</span> : null;
  };

  const signed = (art?: string, menge?: number) => {
    if (menge == null) return '';
    return art === 'entnahme' || art === 'aussonderung' ? `−${menge}` : art === 'korrektur' ? `${menge}` : `+${menge}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-sm text-muted-foreground">{context}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {crud.bestandsbewegungen.canWrite && (
            <Button variant="outline" onClick={() => crud.bestandsbewegungen.openCreate({})}>
              <IconArrowsExchange size={16} className="shrink-0" />
              {tx('Bewegung erfassen')}
            </Button>
          )}
          {crud.artikel.canWrite && (
            <Button onClick={() => crud.artikel.openCreate({})}>
              <IconPlus size={16} className="shrink-0" />
              {tx('Neuer Artikel')}
            </Button>
          )}
        </div>
      </div>

      <DashboardGrid
        variant="wide"
        kpis={
          enrichedArtikel.length > 0 ? (
            <StatStrip>
              <StatStripItem
                title={tx('Unter Mindestbestand')}
                value={lowItems.length}
                icon={<IconAlertTriangle size={18} className="text-muted-foreground" />}
                tone={lowItems.length > 0 ? 'destructive' : 'default'}
                onClick={() => setFilter(f => (f === 'low' ? 'all' : 'low'))}
                active={filter === 'low'}
              />
              <StatStripItem
                title={tx('Bestand aufgebraucht')}
                value={emptyItems.length}
                icon={<IconPackage size={18} className="text-muted-foreground" />}
                tone={emptyItems.length > 0 ? 'warning' : 'default'}
                onClick={() => setFilter(f => (f === 'empty' ? 'all' : 'empty'))}
                active={filter === 'empty'}
              />
              <StatStripItem
                title={tx('Bewegungen heute')}
                value={todayCount}
                icon={<IconArrowsExchange size={18} className="text-muted-foreground" />}
              />
            </StatStrip>
          ) : undefined
        }
        primary={
          <section className="rounded-[27px] bg-card shadow-lg overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-5">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {tx('Bestand und Mindestbestand')}
              </h2>
              {filter !== 'all' && (
                <Button variant="ghost" size="sm" onClick={() => setFilter('all')}>
                  {tx('Filter zurücksetzen')}
                </Button>
              )}
            </div>
            {visible.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
                <IconPackage size={48} className="text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {enrichedArtikel.length === 0 ? tx('Noch keine Artikel im Lager.') : tx('Nichts in dieser Ansicht — alles im grünen Bereich.')}
                </p>
                {enrichedArtikel.length === 0 && crud.artikel.canWrite && (
                  <Button onClick={() => crud.artikel.openCreate({})}>{tx('Ersten Artikel aufnehmen')}</Button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-border px-3 py-2">
                {visible.map(a => {
                  const bestand = a.fields.aktueller_bestand ?? 0;
                  const min = a.fields.mindestbestand;
                  const low = isLow(a);
                  const pct = min && min > 0 ? Math.min(100, (bestand / min) * 100) : 100;
                  return (
                    <li key={a.record_id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3">
                      <button
                        type="button"
                        className="min-w-0 flex-1 basis-48 text-left"
                        onClick={() => crud.artikel.openDetail(a)}
                      >
                        <span className="block truncate font-medium">{a.fields.artikelbezeichnung ?? tx('Ohne Bezeichnung')}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[a.lagerortName, a.fields.kategorie?.label].filter(Boolean).join(' · ')}
                          {a.fields.zustand ? ' · ' : ''}
                          {zustandWord(a)}
                        </span>
                      </button>
                      <div className="w-full sm:w-56 min-w-0">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className={low ? 'font-semibold text-destructive' : 'font-medium'}>
                            {bestand} {a.fields.einheit?.label ?? ''}
                          </span>
                          <span className="text-muted-foreground">
                            {min != null ? tx`Minimum ${min}` : tx('kein Minimum')}
                          </span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${low ? 'bg-destructive' : pct < 150 && min ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.max(pct, bestand > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                      </div>
                      {crud.bestandsbewegungen.canWrite && (
                        <Button variant={low ? 'default' : 'outline'} size="sm" onClick={() => bookIn(a)}>
                          {tx('Zugang')}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {stockList.length > 10 && (
              <div className="border-t border-border px-6 py-3">
                <Button variant="ghost" size="sm" onClick={() => setShowAll(s => !s)}>
                  {showAll ? tx('Weniger anzeigen') : tx`Alle ${stockList.length} anzeigen`}
                </Button>
              </div>
            )}
          </section>
        }
        aside={
          <>
            <WorkList
              title={tx('Letzte Bestandsbewegungen')}
              items={recent.map(b => ({
                id: b.record_id,
                title: b.artikelName || tx('Unbekannter Artikel'),
                secondLine: (
                  <>
                    <span className="font-medium">{b.fields.bewegungsart?.label}</span>
                    <span className="text-muted-foreground">
                      {` ${signed(lookupKey(b.fields.bewegungsart), b.fields.menge)}`}
                      {b.fields.zeitpunkt ? ` · ${formatDate(b.fields.zeitpunkt)}` : ''}
                      {b.fields.person_nachname ? ` · ${b.fields.person_nachname}` : ''}
                    </span>
                  </>
                ),
              }))}
              onItemClick={id => {
                const b = bestandsbewegungen.find(x => x.record_id === id);
                if (b) crud.bestandsbewegungen.openDetail(b);
              }}
              empty={{
                text: tx('Noch keine Bewegungen erfasst.'),
                action: crud.bestandsbewegungen.canWrite
                  ? { label: tx('Bewegung erfassen'), onClick: () => crud.bestandsbewegungen.openCreate({}) }
                  : undefined,
              }}
            />
            <ChartWidget<EnrichedArtikel>
              title={tx('Artikel nach Zustand')}
              rows={chartRows}
              dimension={{ kind: 'category', accessor: r => r.data.fields.zustand, label: tx('Zustand') }}
              measure={{ aggregate: 'sum', label: tx('Artikel'), value: () => 1, format: 'number' }}
              tone={seg => (seg.key === 'defekt' ? 'destructive' : 'default')}
              interaction={{
                mode: 'drill',
                onSegmentClick: seg => {
                  const id = seg.rowIds[0]?.split(':')[1];
                  const rec = enrichedArtikel.find(a => a.record_id === id);
                  if (rec) crud.artikel.openDetail(rec);
                },
              }}
            />
            <ChartWidget<EnrichedArtikel>
              title={tx('Artikel pro Lagerort')}
              rows={chartRows}
              dimension={{ kind: 'category', accessor: r => r.data.lagerortName || undefined, label: appLabel('lagerorte') }}
              measure={{ aggregate: 'sum', label: tx('Artikel'), value: () => 1, format: 'number' }}
              footer={<>{format(clock, 'EEEE, dd. MMMM', { locale: dateFnsLocale() })}</>}
            />
          </>
        }
      />
      {crud.surfaces}
    </div>
  );
}
