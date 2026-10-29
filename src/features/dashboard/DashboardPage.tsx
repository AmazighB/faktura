import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Plus, FileText, UserPlus, CreditCard, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { PageContent } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/feedback/Loading';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/app/providers/AuthContext';
import { services } from '@/services';
import { computeTotals } from '@/utils/calc';
import { formatCurrency, formatDate, formatRelative, daysUntil } from '@/utils/format';
import { cn } from '@/utils/cn';
import { amountDue } from '@/utils/invoice';

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'quarter', label: 'Trimestre' },
  { key: 'year', label: 'Année' },
];

/** Bornes [début, fin[ de la période courante et de la précédente (même durée / même rang). */
function ranges(period: Period) {
  const n = new Date();
  const d0 = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  const add = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);
  let start: Date, end: Date, pStart: Date;
  if (period === 'today') { start = d0; end = add(d0, 1); pStart = add(d0, -1); }
  else if (period === 'week') { end = add(d0, 1); start = add(end, -7); pStart = add(start, -7); }
  else if (period === 'month') { start = new Date(n.getFullYear(), n.getMonth(), 1); end = new Date(n.getFullYear(), n.getMonth() + 1, 1); pStart = new Date(n.getFullYear(), n.getMonth() - 1, 1); }
  else if (period === 'quarter') { const q = Math.floor(n.getMonth() / 3) * 3; start = new Date(n.getFullYear(), q, 1); end = new Date(n.getFullYear(), q + 3, 1); pStart = new Date(n.getFullYear(), q - 3, 1); }
  else { start = new Date(n.getFullYear(), 0, 1); end = new Date(n.getFullYear() + 1, 0, 1); pStart = new Date(n.getFullYear() - 1, 0, 1); }
  return { start, end, prev: { start: pStart, end: start } };
}

function Delta({ value, goodWhenUp = true }: { value: number | null; goodWhenUp?: boolean }) {
  if (value === null) return <span className="text-xs text-gray-400">Pas de période de comparaison</span>;
  const up = value >= 0;
  const good = up === goodWhenUp;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('num inline-flex items-center gap-0.5 text-xs font-medium', good ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(Math.round(value))} % <span className="font-normal text-gray-400">vs période précédente</span>
    </span>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('month');

  const { data: invoices, loading } = useAsync(() => services.invoices.list(), []);
  const { data: quotes } = useAsync(() => services.quotes.list(), []);
  const { data: payments } = useAsync(() => services.payments.list(), []);
  const { data: expenses } = useAsync(() => services.expenses.list(), []);
  const { data: settings } = useAsync(() => services.settings.get(), []);
  const { data: activityLogs } = useAsync(() => services.activityLogs.list(), []);
  const { data: clients } = useAsync(() => services.clients.list(), []);

  const currency = settings?.currency ?? 'DA';
  const money = (v: number) => formatCurrency(v, currency);
  const firstName = (user?.name ?? '').split(' ')[0] || 'vous';

  const data = useMemo(() => {
    const inv = invoices ?? [];
    const real = inv.filter((i) => i.status !== 'brouillon' && i.status !== 'annulee');
    const remaining = amountDue;
    const isLate = (i: (typeof inv)[number]) => i.status === 'retard';

    const { start, end, prev } = ranges(period);
    const within = (date: string, a: Date, b: Date) => { const t = new Date(date); return t >= a && t < b; };
    const sum = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((s, x) => s + f(x), 0);
    const pct = (cur: number, old: number) => (old > 0 ? ((cur - old) / old) * 100 : null);

    const billed = sum(real.filter((i) => within(i.date, start, end)), (i) => computeTotals(i.items).totalTTC);
    const billedPrev = sum(real.filter((i) => within(i.date, prev.start, prev.end)), (i) => computeTotals(i.items).totalTTC);
    const collected = sum((payments ?? []).filter((p) => within(p.date, start, end)), (p) => p.amount);
    const collectedPrev = sum((payments ?? []).filter((p) => within(p.date, prev.start, prev.end)), (p) => p.amount);
    const spent = sum((expenses ?? []).filter((e) => within(e.date, start, end)), (e) => e.amountTTC);
    // Résultat hors taxes : la TVA collectée ou payée n'est ni un produit ni une charge
    const billedHT = sum(real.filter((i) => within(i.date, start, end)), (i) => computeTotals(i.items).netHT);
    const spentHT = sum((expenses ?? []).filter((e) => within(e.date, start, end)), (e) => e.amountHT);
    const spentPrev = sum((expenses ?? []).filter((e) => within(e.date, prev.start, prev.end)), (e) => e.amountTTC);

    const open = real.filter((i) => i.status !== 'payee' && remaining(i) > 0);
    const late = open.filter(isLate);
    const owed = sum(open, remaining);
    const lateTotal = sum(late, remaining);

    const todo = [...open]
      .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))
      .slice(0, 6)
      .map((i) => ({ inv: i, left: remaining(i), days: daysUntil(i.dueDate) }));

    const pending = sum(open.filter((i) => !isLate(i)), remaining);
    const paidTotal = sum(real, (i) => Math.min(i.paidAmount + (i.creditNotesApplied ?? 0), computeTotals(i.items).totalTTC));
    const split = { paid: paidTotal, pending, late: lateTotal };

    const months = Array.from({ length: 6 }, (_, k) => {
      const m = new Date(new Date().getFullYear(), new Date().getMonth() - (5 - k), 1);
      const nx = new Date(m.getFullYear(), m.getMonth() + 1, 1);
      return {
        label: formatDate(m, { month: 'short' }).replace('.', ''),
        billed: sum(real.filter((i) => within(i.date, m, nx)), (i) => computeTotals(i.items).totalTTC),
        collected: sum((payments ?? []).filter((p) => within(p.date, m, nx)), (p) => p.amount),
      };
    });

    return {
      billed, collected, spent, owed, resultHT: billedHT - spentHT, lateTotal, lateCount: late.length, openCount: open.length,
      dBilled: pct(billed, billedPrev), dCollected: pct(collected, collectedPrev), dSpent: pct(spent, spentPrev),
      pendingQuotes: (quotes ?? []).filter((q) => q.status === 'envoye' || q.status === 'attente').length,
      todo, split, months,
    };
  }, [invoices, quotes, payments, expenses, period]);

  const maxBar = Math.max(...data.months.flatMap((m) => [m.billed, m.collected]), 1);
  const splitTotal = Math.max(data.split.paid + data.split.pending + data.split.late, 1);
  const clientName = (id: string) => (clients ?? []).find((c) => c.id === id)?.name ?? '—';
  const result = data.resultHT;

  const kpis = [
    { label: 'Facturé', value: data.billed, delta: <Delta value={data.dBilled} /> },
    { label: 'Encaissé', value: data.collected, delta: <Delta value={data.dCollected} /> },
    { label: 'On vous doit', value: data.owed, delta: <span className="text-xs text-gray-400">{data.openCount} facture{data.openCount > 1 ? 's' : ''} ouverte{data.openCount > 1 ? 's' : ''}</span>, tone: data.lateCount > 0 ? 'warn' : undefined },
    { label: 'Dépensé', value: data.spent, delta: <Delta value={data.dSpent} goodWhenUp={false} /> },
  ];

  return (
    <PageContent className="pt-7">
      {/* En-tête : salutation + actions rapides */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold leading-tight">Bonjour {firstName}</h1>
          <p className="mt-1 text-sm capitalize text-gray-500 dark:text-gray-400">{formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/clients/new')}><UserPlus className="h-4 w-4" />Client</Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/payments/new')}><CreditCard className="h-4 w-4" />Paiement</Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/quotes/new')}><FileText className="h-4 w-4" />Devis</Button>
          <Button size="sm" onClick={() => navigate('/invoices/new')}><Plus className="h-4 w-4" />Nouvelle facture</Button>
        </div>
      </div>

      {loading && !invoices ? (
        <div className="mt-6 space-y-4">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* Ce qui compte maintenant : une phrase, une action */}
          <div className={cn('mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3',
            data.lateCount > 0 ? 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10')}>
            <p className="flex items-center gap-2.5 text-sm font-medium text-gray-800 dark:text-gray-100">
              {data.lateCount > 0
                ? <><AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" /><span><span className="num-amount">{money(data.lateTotal)}</span> en retard sur {data.lateCount} facture{data.lateCount > 1 ? 's' : ''}. À encaisser en priorité.</span></>
                : <><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />Aucun retard de paiement. {data.pendingQuotes > 0 ? `${data.pendingQuotes} devis attend${data.pendingQuotes > 1 ? 'ent' : ''} une réponse.` : 'Tout est à jour.'}</>}
            </p>
            {data.lateCount > 0 && <Button size="sm" variant="outline" onClick={() => navigate('/unpaid')}>Voir les impayés</Button>}
          </div>

          {/* Les 4 questions du CDC, une seule surface */}
          <div className="mt-5 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Votre activité</h2>
            <Tabs tabs={PERIODS} active={period} onChange={(k) => setPeriod(k as Period)} />
          </div>
          <Card className="mt-3 grid grid-cols-2 divide-x divide-y divide-gray-200 overflow-hidden dark:divide-gray-800 lg:grid-cols-4 lg:divide-y-0">
            {kpis.map((k) => (
              <div key={k.label} className="p-5">
                <p className="label-quiet">{k.label}</p>
                <p className={cn('num mt-2 text-[26px] font-semibold leading-none', k.tone === 'warn' && 'text-amber-600 dark:text-amber-400')}>{money(k.value)}</p>
                <div className="mt-2.5">{k.delta}</div>
              </div>
            ))}
          </Card>
          <p className="mt-2 px-1 text-xs text-gray-500">
            Résultat de la période (HT) : <span className={cn('num font-medium', result >= 0 ? 'text-emerald-600' : 'text-red-600')}>{result >= 0 ? '+' : '−'}{money(Math.abs(result))}</span> (facturé − dépensé, hors TVA)
          </p>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {/* À traiter : l'action est dans la ligne */}
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>À encaisser</CardTitle><button onClick={() => navigate('/unpaid')} className="text-[13px] font-medium text-accent-600 hover:underline dark:text-accent-400">Tout voir</button></CardHeader>
              {data.todo.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-gray-500">Rien à encaisser. Créez une facture pour démarrer.</p>
              ) : (
                <ul className="mt-2 divide-y divide-gray-100 pb-2 dark:divide-gray-800">
                  {data.todo.map(({ inv, left, days }) => (
                    <li key={inv.id} className="group flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <button onClick={() => navigate(`/invoices/${inv.id}`)} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-medium">{clientName(inv.clientId)}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500"><span className="font-mono">{inv.number}</span> · échéance {formatDate(inv.dueDate)}</p>
                      </button>
                      <span className={cn('hidden text-xs font-medium sm:block', days < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500')}>
                        {days < 0 ? `${-days} j de retard` : days === 0 ? "Aujourd'hui" : `dans ${days} j`}
                      </span>
                      <span className="num-amount w-28 text-right text-sm font-semibold">{money(left)}</span>
                      <Button size="sm" variant="secondary" className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100" onClick={() => navigate(`/payments/new/${inv.id}`)}>Encaisser</Button>
                      <ChevronRight className="hidden h-4 w-4 text-gray-300 sm:block" />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Répartition */}
            <Card>
              <CardHeader><CardTitle>Où en sont vos factures</CardTitle></CardHeader>
              <div className="p-5 pt-4">
                <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" role="img" aria-label="Répartition payé, en attente, en retard">
                  <div className="origin-left animate-grow-x bg-emerald-500" style={{ width: `${(data.split.paid / splitTotal) * 100}%` }} />
                  <div className="origin-left animate-grow-x bg-accent-400" style={{ width: `${(data.split.pending / splitTotal) * 100}%` }} />
                  <div className="origin-left animate-grow-x bg-red-500" style={{ width: `${(data.split.late / splitTotal) * 100}%` }} />
                </div>
                <dl className="mt-4 space-y-2.5 text-sm">
                  {[
                    ['Payé', data.split.paid, 'bg-emerald-500'],
                    ['En attente', data.split.pending, 'bg-accent-400'],
                    ['En retard', data.split.late, 'bg-red-500'],
                  ].map(([l, v, c]) => (
                    <div key={l as string} className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><span className={cn('h-2 w-2 rounded-full', c as string)} />{l}</dt>
                      <dd className="num-amount font-medium">{money(v as number)}</dd>
                    </div>
                  ))}
                </dl>
                <button onClick={() => navigate('/quotes')} className="mt-5 flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/40">
                  <span><span className="num-amount font-semibold">{data.pendingQuotes}</span> devis en attente de réponse</span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              </div>
            </Card>

            {/* Tendance */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Facturé et encaissé</CardTitle>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-accent-500" />Facturé</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-500" />Encaissé</span>
                </div>
              </CardHeader>
              <div className="flex h-52 items-end gap-3 p-5 pt-4">
                {data.months.map((m) => (
                  <div key={m.label} className="group flex h-full flex-1 flex-col justify-end gap-2">
                    <div className="relative flex flex-1 items-end justify-center gap-1">
                      <div className="w-full max-w-[18px] rounded-t bg-accent-500 transition-opacity group-hover:opacity-80" style={{ height: `${Math.max((m.billed / maxBar) * 100, m.billed ? 2 : 0)}%` }} />
                      <div className="w-full max-w-[18px] rounded-t bg-emerald-500 transition-opacity group-hover:opacity-80" style={{ height: `${Math.max((m.collected / maxBar) * 100, m.collected ? 2 : 0)}%` }} />
                      <div className="num-amount pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-pop group-hover:block dark:bg-gray-100 dark:text-gray-900">
                        {money(m.billed)} · {money(m.collected)}
                      </div>
                    </div>
                    <span className="text-center text-xs text-gray-400">{m.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Activité */}
            <Card>
              <CardHeader><CardTitle>Activité récente</CardTitle></CardHeader>
              <ul className="mt-2 divide-y divide-gray-100 pb-2 dark:divide-gray-800">
                {(activityLogs ?? []).slice(0, 5).map((log) => (
                  <li key={log.id} className="px-5 py-2.5">
                    <p className="text-[13px] leading-snug text-gray-700 dark:text-gray-300"><span className="font-medium">{log.userName}</span> {log.action} {log.details && <span className="font-medium">{log.details}</span>}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{formatRelative(log.timestamp)}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </PageContent>
  );
}