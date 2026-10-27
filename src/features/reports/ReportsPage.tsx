import { useMemo, useState } from 'react';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Receipt,
  Wallet,
  Users,
  Package,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
  FileText,
} from 'lucide-react';
import { PageHeader, PageContent } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tabs } from '@/components/ui/Tabs';
import { Field, Input, Select } from '@/components/ui/Input';
import { ExportImportButton } from '@/components/ui/ExportImportButton';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastProvider';
import { formatCurrency, formatDate, daysUntil, toISODate, startOfMonth, startOfYear } from '@/utils/format';
import { computeTotals } from '@/utils/calc';
import { expenseCategoryLabels, invoiceStatusLabels } from '@/utils/labels';
import type { Invoice, Client } from '@/types';
import { cn } from '@/utils/cn';
import { Skeleton } from '@/components/feedback/Loading';
import { printDocument } from '@/utils/print';
import { exportData, type ExportColumn } from '@/utils/exportImport';

type ReportTab = 'overview' | 'sales' | 'clients' | 'products' | 'expenses';

interface DateRange {
  from: string;
  to: string;
}

const periodPresets: { label: string; getRange: () => DateRange }[] = [
  {
    label: 'Ce mois',
    getRange: () => ({
      from: toISODate(startOfMonth()),
      to: toISODate(),
    }),
  },
  {
    label: 'Ce trimestre',
    getRange: () => {
      const now = new Date();
      const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return { from: toISODate(qStart), to: toISODate() };
    },
  },
  {
    label: 'Cette année',
    getRange: () => ({ from: toISODate(startOfYear()), to: toISODate() }),
  },
  {
    label: '3 derniers mois',
    getRange: () => {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      return { from: toISODate(d), to: toISODate() };
    },
  },
  {
    label: '12 derniers mois',
    getRange: () => {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      return { from: toISODate(d), to: toISODate() };
    },
  },
];

function inRange(date: string, range: DateRange) {
  const d = new Date(date);
  return d >= new Date(range.from) && d <= new Date(range.to + 'T23:59:59');
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export default function ReportsPage() {
  const { push } = useToast();
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [range, setRange] = useState<DateRange>(() => periodPresets[4].getRange());
  const [activePreset, setActivePreset] = useState('12 derniers mois');

  const { data: invoices, loading: invLoading } = useAsync(() => services.invoices.list(), []);
  const { data: expenses, loading: expLoading } = useAsync(() => services.expenses.list(), []);
  const { data: clients } = useAsync(() => services.clients.list(), []);
  const { data: settings } = useAsync(() => services.settings.get(), []);
  const currency = settings?.currency ?? 'DA';
  const isLoading = invLoading || expLoading;

  const applyPreset = (preset: (typeof periodPresets)[number]) => {
    setRange(preset.getRange());
    setActivePreset(preset.label);
  };

  const onManualDateChange = (field: 'from' | 'to', value: string) => {
    setRange((prev) => ({ ...prev, [field]: value }));
    setActivePreset('');
  };

  const filteredInvoices = useMemo(
    () => (invoices ?? []).filter((i) => inRange(i.date, range)),
    [invoices, range],
  );
  const filteredExpenses = useMemo(
    () => (expenses ?? []).filter((e) => inRange(e.date, range)),
    [expenses, range],
  );

  const kpis = useMemo(() => {
    const totalBilled = filteredInvoices.reduce((s, i) => s + computeTotals(i.items).totalTTC, 0);
    const totalPaid = filteredInvoices.reduce((s, i) => s + i.paidAmount, 0);
    const totalRemaining = totalBilled - totalPaid;
    const totalOverdue = filteredInvoices
      .filter((i) => daysUntil(i.dueDate) < 0 && i.status !== 'payee' && i.status !== 'annulee')
      .reduce((s, i) => s + (computeTotals(i.items).totalTTC - i.paidAmount), 0);
    const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amountTTC, 0);
    const result = totalPaid - totalExpenses;
    const margin = totalBilled > 0 ? (result / totalBilled) * 100 : 0;
    return { totalBilled, totalPaid, totalRemaining, totalOverdue, totalExpenses, result, margin };
  }, [filteredInvoices, filteredExpenses]);

  const previousRange = useMemo(() => {
    const from = new Date(range.from);
    const to = new Date(range.to);
    const duration = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 86400000);
    const prevFrom = new Date(prevTo.getTime() - duration);
    return { from: toISODate(prevFrom), to: toISODate(prevTo) };
  }, [range]);

  const previousKpis = useMemo(() => {
    const prevInv = (invoices ?? []).filter((i) => inRange(i.date, previousRange));
    const prevExp = (expenses ?? []).filter((e) => inRange(e.date, previousRange));
    const billed = prevInv.reduce((s, i) => s + computeTotals(i.items).totalTTC, 0);
    const paid = prevInv.reduce((s, i) => s + i.paidAmount, 0);
    const exp = prevExp.reduce((s, e) => s + e.amountTTC, 0);
    return { billed, paid, exp, result: paid - exp };
  }, [invoices, expenses, previousRange]);

  const trends = {
    billed: pctChange(kpis.totalBilled, previousKpis.billed),
    paid: pctChange(kpis.totalPaid, previousKpis.paid),
    expenses: pctChange(kpis.totalExpenses, previousKpis.exp),
    result: pctChange(kpis.result, previousKpis.result),
  };

  const monthlyRevenue = useMemo(() => {
    const months: { label: string; revenue: number; collected: number; expenses: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = m.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
      const monthInv = (invoices ?? []).filter((inv) => {
        const d = new Date(inv.date);
        return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
      });
      const monthPay = (invoices ?? []).flatMap((inv) =>
        inv.items
          .filter(() => {
            const d = new Date(inv.date);
            return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
          })
          .map(() => 0),
      );
      const monthExp = (expenses ?? []).filter((e) => {
        const d = new Date(e.date);
        return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
      });
      months.push({
        label,
        revenue: monthInv.reduce((s, inv) => s + computeTotals(inv.items).totalTTC, 0),
        collected: monthPay.reduce((s, v) => s + v, 0),
        expenses: monthExp.reduce((s, e) => s + e.amountTTC, 0),
      });
    }
    return months;
  }, [invoices, expenses]);

  const maxRevenue = Math.max(...monthlyRevenue.map((m) => Math.max(m.revenue, m.expenses)), 1);

  const expensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filteredExpenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amountTTC);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);
  const maxCategoryAmount = Math.max(...expensesByCategory.map((e) => e[1]), 1);

  const topClients = useMemo(() => {
    const map = new Map<string, { billed: number; paid: number; count: number }>();
    for (const i of filteredInvoices) {
      const cur = map.get(i.clientId) ?? { billed: 0, paid: 0, count: 0 };
      cur.billed += computeTotals(i.items).totalTTC;
      cur.paid += i.paidAmount;
      cur.count += 1;
      map.set(i.clientId, cur);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ client: (clients ?? []).find((c) => c.id === id), ...v }))
      .filter((e) => e.client)
      .sort((a, b) => b.billed - a.billed)
      .slice(0, 8);
  }, [filteredInvoices, clients]);

  const clientsWithUnpaid = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of filteredInvoices) {
      if (i.status === 'payee' || i.status === 'annulee' || i.status === 'brouillon') continue;
      const remaining = computeTotals(i.items).totalTTC - i.paidAmount;
      map.set(i.clientId, (map.get(i.clientId) ?? 0) + remaining);
    }
    return Array.from(map.entries())
      .map(([id, total]) => ({ client: (clients ?? []).find((c) => c.id === id), total }))
      .filter((e) => e.client && e.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filteredInvoices, clients]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; total: number }>();
    for (const inv of filteredInvoices) {
      for (const item of inv.items) {
        if (!item.productId) continue;
        const existing = map.get(item.productId) ?? { name: item.designation, qty: 0, total: 0 };
        existing.qty += item.quantity;
        existing.total += item.quantity * item.unitPrice;
        map.set(item.productId, existing);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [filteredInvoices]);

  const invoicesByStatus = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const i of filteredInvoices) {
      const cur = map.get(i.status) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += computeTotals(i.items).totalTTC;
      map.set(i.status, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [filteredInvoices]);

  const handleExport = (format: 'csv' | 'json' | 'xls') => {
    const clientName = (id: string) => clients?.find((c) => c.id === id)?.name ?? id;
    const exportColumns: ExportColumn<Invoice>[] = [
      { key: 'number', label: 'Numéro', getValue: (i: Invoice) => i.number },
      { key: 'date', label: 'Date', getValue: (i: Invoice) => formatDate(i.date) },
      { key: 'client', label: 'Client', getValue: (i: Invoice) => clientName(i.clientId) },
      { key: 'status', label: 'Statut', getValue: (i: Invoice) => invoiceStatusLabels[i.status] ?? i.status },
      { key: 'total', label: 'Total TTC', getValue: (i: Invoice) => computeTotals(i.items).totalTTC },
      { key: 'paid', label: 'Encaissé', getValue: (i: Invoice) => i.paidAmount },
      { key: 'remaining', label: 'Restant', getValue: (i: Invoice) => computeTotals(i.items).totalTTC - i.paidAmount },
    ];
    exportData(filteredInvoices, exportColumns, `rapport_factures_${range.from}_${range.to}`, format);
    push('success', 'Export réussi', `${filteredInvoices.length} facture(s) exportée(s)`);
  };

  const handlePrint = () => {
    const clientName = (id: string) => clients?.find((c) => c.id === id)?.name ?? id;
    const reportHTML = `
      <div style="margin-bottom: 32px;">
        <h1 style="font-size: 24px; font-weight: bold;">Rapport financier</h1>
        <p style="color: #6b7280; font-size: 14px;">Période: ${formatDate(range.from)} au ${formatDate(range.to)}</p>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px;">
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          <p style="font-size: 12px; color: #6b7280;">Chiffre d'affaires</p>
          <p style="font-size: 24px; font-weight: bold; margin-top: 4px;">${formatCurrency(kpis.totalBilled, currency)}</p>
        </div>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          <p style="font-size: 12px; color: #6b7280;">Résultat net</p>
          <p style="font-size: 24px; font-weight: bold; margin-top: 4px; color: ${kpis.result >= 0 ? '#059669' : '#dc2626'};">${formatCurrency(kpis.result, currency)}</p>
        </div>
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          <p style="font-size: 12px; color: #6b7280;">Restant à encaisser</p>
          <p style="font-size: 24px; font-weight: bold; margin-top: 4px;">${formatCurrency(kpis.totalRemaining, currency)}</p>
        </div>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-top: 24px;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e7eb;">
            <th style="text-align: left; padding: 8px; font-size: 12px;">Numéro</th>
            <th style="text-align: left; padding: 8px; font-size: 12px;">Date</th>
            <th style="text-align: left; padding: 8px; font-size: 12px;">Client</th>
            <th style="text-align: left; padding: 8px; font-size: 12px;">Statut</th>
            <th style="text-align: right; padding: 8px; font-size: 12px;">Total TTC</th>
            <th style="text-align: right; padding: 8px; font-size: 12px;">Restant</th>
          </tr>
        </thead>
        <tbody>
          ${filteredInvoices.map((inv) => `
            <tr style="border-bottom: 1px solid #f3f4f6;">
              <td style="padding: 8px; font-size: 13px;">${inv.number}</td>
              <td style="padding: 8px; font-size: 13px;">${formatDate(inv.date)}</td>
              <td style="padding: 8px; font-size: 13px;">${clientName(inv.clientId)}</td>
              <td style="padding: 8px; font-size: 13px;">${invoiceStatusLabels[inv.status as keyof typeof invoiceStatusLabels] ?? inv.status}</td>
              <td style="padding: 8px; font-size: 13px; text-align: right;">${formatCurrency(computeTotals(inv.items).totalTTC, currency)}</td>
              <td style="padding: 8px; font-size: 13px; text-align: right;">${formatCurrency(computeTotals(inv.items).totalTTC - inv.paidAmount, currency)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    printDocument('Rapport financier', reportHTML);
  };

  return (
    <div>
      <PageHeader
        title="Rapports"
        description="Analysez votre activité financière"
        actions={
          <div className="flex gap-2 no-print">
            <Button variant="outline" size="md" onClick={handlePrint}>
              <FileText className="h-4 w-4" /> Imprimer
            </Button>
            <Button variant="primary" size="md" onClick={() => handleExport('csv')}>
              <Download className="h-4 w-4" /> Exporter
            </Button>
          </div>
        }
      />

      <PageContent>
        {/* ── Filter bar ──────────────────────────────────── */}
        <Card className="mb-4">
          <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {periodPresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-xs font-medium transition-all',
                    activePreset === preset.label
                      ? 'bg-accent-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Du" className="w-auto">
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="date"
                    value={range.from}
                    onChange={(e) => onManualDateChange('from', e.target.value)}
                    className="w-40 pl-9"
                  />
                </div>
              </Field>
              <span className="pb-2.5 text-gray-400">→</span>
              <Field label="Au" className="w-auto">
                <div className="relative">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="date"
                    value={range.to}
                    onChange={(e) => onManualDateChange('to', e.target.value)}
                    className="w-40 pl-9"
                  />
                </div>
              </Field>
            </div>
          </div>
        </Card>

        {isLoading ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="mt-3 h-10 w-40" />
                  <Skeleton className="mt-3 h-4 w-32" />
                </Card>
              ))}
            </div>
            <Card className="p-6">
              <Skeleton className="h-5 w-48" />
              <div className="mt-5 flex h-48 items-end justify-between gap-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="flex-1" style={{ height: `${60 + (i % 4) * 20}px` }} />
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <>
            {/* ── Hero KPIs ───────────────────────────────── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <KpiCard
                label="Chiffre d'affaires"
                value={formatCurrency(kpis.totalBilled, currency)}
                icon={Receipt}
                trend={trends.billed}
                accent="accent"
              />
              <KpiCard
                label="Résultat net"
                value={formatCurrency(kpis.result, currency)}
                icon={kpis.result >= 0 ? TrendingUp : TrendingDown}
                trend={trends.result}
                accent={kpis.result >= 0 ? 'emerald' : 'red'}
                subtitle={`Marge: ${kpis.margin.toFixed(1)}%`}
              />
              <KpiCard
                label="Restant à encaisser"
                value={formatCurrency(kpis.totalRemaining, currency)}
                icon={AlertCircle}
                accent="amber"
                subtitle={`${kpis.totalOverdue > 0 ? formatCurrency(kpis.totalOverdue, currency) + ' en retard' : 'Aucun retard'}`}
              />
            </div>

            {/* ── Secondary KPIs ──────────────────────────── */}
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MiniKpi label="Encaissé" value={formatCurrency(kpis.totalPaid, currency)} icon={ArrowUpRight} color="text-emerald-600" trend={trends.paid} />
              <MiniKpi label="Dépenses" value={formatCurrency(kpis.totalExpenses, currency)} icon={ArrowDownRight} color="text-gray-600" trend={trends.expenses} invertTrend />
              <MiniKpi label="Factures émises" value={String(filteredInvoices.length)} icon={FileText} color="text-accent-600" />
              <MiniKpi label="Dépenses enregistrées" value={String(filteredExpenses.length)} icon={Wallet} color="text-gray-600" />
            </div>

            {/* ── Tabs ────────────────────────────────────── */}
            <div className="mt-4">
              <Tabs
                tabs={[
                  { key: 'overview', label: 'Vue d\'ensemble' },
                  { key: 'sales', label: 'Ventes' },
                  { key: 'clients', label: 'Clients' },
                  { key: 'products', label: 'Produits' },
                  { key: 'expenses', label: 'Dépenses' },
                ]}
                active={activeTab}
                onChange={(k) => setActiveTab(k as ReportTab)}
              />
            </div>

            <div className="mt-4">
              {activeTab === 'overview' && (
                <OverviewTab
                  monthlyRevenue={monthlyRevenue}
                  maxRevenue={maxRevenue}
                  currency={currency}
                  invoicesByStatus={invoicesByStatus}
                  clientsWithUnpaid={clientsWithUnpaid}
                  kpis={kpis}
                  range={range}
                />
              )}
              {activeTab === 'sales' && <SalesTab invoicesByStatus={invoicesByStatus} currency={currency} filteredInvoices={filteredInvoices} />}
              {activeTab === 'clients' && (
                <ClientsTab topClients={topClients} clientsWithUnpaid={clientsWithUnpaid} currency={currency} />
              )}
              {activeTab === 'products' && <ProductsTab topProducts={topProducts} currency={currency} />}
              {activeTab === 'expenses' && (
                <ExpensesTab expensesByCategory={expensesByCategory} filteredExpenses={filteredExpenses} currency={currency} maxCategoryAmount={maxCategoryAmount} />
              )}
            </div>
          </>
        )}
      </PageContent>
    </div>
  );
}

// ── KPI Components ───────────────────────────────────────

function TrendBadge({ value, invert }: { value: number | null; invert?: boolean }) {
  if (value === null) return <span className="text-xs text-gray-400">—</span>;
  const isUp = value >= 0;
  const isGood = invert ? !isUp : isUp;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium',
        isGood ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

const accentStyles: Record<string, { icon: string; bg: string; ring: string }> = {
  accent: { icon: 'text-accent-600', bg: 'bg-accent-50 dark:bg-accent-900/20', ring: 'ring-accent-200 dark:ring-accent-900/40' },
  emerald: { icon: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', ring: 'ring-emerald-200 dark:ring-emerald-900/40' },
  red: { icon: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', ring: 'ring-red-200 dark:ring-red-900/40' },
  amber: { icon: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', ring: 'ring-amber-200 dark:ring-amber-900/40' },
};

function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  accent,
  subtitle,
}: {
  label: string;
  value: string;
  icon: typeof Receipt;
  trend?: number | null;
  accent: keyof typeof accentStyles;
  subtitle?: string;
}) {
  const s = accentStyles[accent];
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', s.bg)}>
          <Icon className={cn('h-4 w-4', s.icon)} />
        </div>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
      <p className="mt-2.5 text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
    </Card>
  );
}

function MiniKpi({
  label,
  value,
  icon: Icon,
  color,
  trend,
  invertTrend,
}: {
  label: string;
  value: string;
  icon: typeof Receipt;
  color: string;
  trend?: number | null;
  invertTrend?: boolean;
}) {
  return (
    <Card className="flex items-center gap-2.5 p-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
        <Icon className={cn('h-3.5 w-3.5', color)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      </div>
      {trend !== undefined && <TrendBadge value={trend} invert={invertTrend} />}
    </Card>
  );
}

// ── Tab: Overview ────────────────────────────────────────

function OverviewTab({
  monthlyRevenue,
  maxRevenue,
  currency,
  invoicesByStatus,
  clientsWithUnpaid,
  kpis,
  range,
}: {
  monthlyRevenue: { label: string; revenue: number; collected: number; expenses: number }[];
  maxRevenue: number;
  currency: string;
  invoicesByStatus: [string, { count: number; total: number }][];
  clientsWithUnpaid: { client: Client | undefined; total: number }[];
  kpis: { totalPaid: number; totalExpenses: number; result: number };
  range: DateRange;
}) {
  return (
    <div className="space-y-5">
      {/* Combined chart */}
      <Card>
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Évolution sur 12 mois</h3>
              <p className="mt-0.5 text-xs text-gray-400">Chiffre d'affaires vs Dépenses</p>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded bg-accent-500" /> CA
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded bg-red-400" /> Dépenses
              </span>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex h-44 items-end justify-between gap-2">
            {monthlyRevenue.map((m) => (
              <div key={m.label} className="group flex flex-1 flex-col items-center gap-2">
                <div className="relative flex h-36 w-full items-end justify-center gap-1">
                  <div
                    className="w-full max-w-[28px] rounded-t bg-accent-500 transition-all group-hover:bg-accent-600"
                    style={{ height: `${(m.revenue / maxRevenue) * 100}%` }}
                    title={`CA: ${formatCurrency(m.revenue, currency)}`}
                  />
                  <div
                    className="w-full max-w-[28px] rounded-t bg-red-400 transition-all group-hover:bg-red-500"
                    style={{ height: `${(m.expenses / maxRevenue) * 100}%` }}
                    title={`Dépenses: ${formatCurrency(m.expenses, currency)}`}
                  />
                  {/* Tooltip on hover */}
                  <div className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-700">
                    <div className="font-medium">{m.label}</div>
                    <div className="mt-1 text-accent-300">CA: {formatCurrency(m.revenue, currency)}</div>
                    <div className="text-red-300">Dép: {formatCurrency(m.expenses, currency)}</div>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status breakdown */}
        <Card>
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Factures par statut</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
            {invoicesByStatus.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">Aucune facture sur cette période</p>
            ) : (
              invoicesByStatus.map(([status, data]) => {
                const totalAll = invoicesByStatus.reduce((s, [, d]) => s + d.total, 0);
                const pct = totalAll > 0 ? (data.total / totalAll) * 100 : 0;
                return (
                  <div key={status} className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {invoiceStatusLabels[status as keyof typeof invoiceStatusLabels] ?? status}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(data.total, currency)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div className="h-full rounded-full bg-accent-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-gray-400">{data.count} facture{data.count > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Top unpaid clients */}
        <Card>
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Impayés par client</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
            {clientsWithUnpaid.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Aucun impayé</p>
                <p className="text-xs text-gray-400">Tout est réglé sur cette période</p>
              </div>
            ) : (
              clientsWithUnpaid.map(({ client, total }) => (
                <div key={client?.id ?? 'unknown'} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{client?.name ?? '—'}</span>
                  <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {formatCurrency(total, currency)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Period summary */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Synthèse de la période</h3>
        <p className="mt-0.5 text-xs text-gray-400">Du {formatDate(range.from)} au {formatDate(range.to)}</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryRow label="Encaissé" value={formatCurrency(kpis.totalPaid, currency)} />
          <SummaryRow label="Dépensé" value={formatCurrency(kpis.totalExpenses, currency)} />
          <SummaryRow
            label="Résultat"
            value={formatCurrency(kpis.result, currency)}
            highlight={kpis.result >= 0 ? 'positive' : 'negative'}
          />
        </div>
      </Card>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: 'positive' | 'negative';
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={cn(
          'mt-1 text-lg font-bold',
          highlight === 'positive' && 'text-emerald-600 dark:text-emerald-400',
          highlight === 'negative' && 'text-red-600 dark:text-red-400',
          !highlight && 'text-gray-900 dark:text-gray-100',
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ── Tab: Sales ───────────────────────────────────────────

function SalesTab({
  invoicesByStatus,
  currency,
  filteredInvoices,
}: {
  invoicesByStatus: [string, { count: number; total: number }][];
  currency: string;
  filteredInvoices: Invoice[];
}) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  const statusOptions = invoicesByStatus.map(([s]) => s);
  const sortedInvoices = useMemo(() => {
    let list = filteredInvoices;
    if (statusFilter !== 'all') list = list.filter((i) => i.status === statusFilter);
    return [...list].sort((a, b) => {
      if (sortBy === 'amount') {
        return computeTotals(b.items as Invoice['items']).totalTTC - computeTotals(a.items as Invoice['items']).totalTTC;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [filteredInvoices, statusFilter, sortBy]);

  return (
    <div className="space-y-5">
      {/* Status cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {invoicesByStatus.map(([status, data]) => (
          <Card key={status} className="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {invoiceStatusLabels[status as keyof typeof invoiceStatusLabels] ?? status}
            </p>
            <p className="mt-1.5 text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(data.total, currency)}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">{data.count} facture{data.count > 1 ? 's' : ''}</p>
          </Card>
        ))}
      </div>

      {/* Invoice breakdown */}
      <Card>
        <div className="flex flex-col gap-4 border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Détail des factures</h3>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto text-xs">
              <option value="all">Tous les statuts</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {invoiceStatusLabels[s as keyof typeof invoiceStatusLabels] ?? s}
                </option>
              ))}
            </Select>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')} className="w-auto text-xs">
              <option value="date">Trier par date</option>
              <option value="amount">Trier par montant</option>
            </Select>
          </div>
        </div>
        <div className="max-h-[400px] divide-y divide-gray-100 overflow-y-auto scrollbar-thin dark:divide-gray-800/50">
          {sortedInvoices.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Aucune facture</p>
          ) : (
            sortedInvoices.map((inv) => {
              const total = computeTotals(inv.items).totalTTC;
              const remaining = total - inv.paidAmount;
              return (
                <div key={inv.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{inv.number}</p>
                    <p className="text-xs text-gray-400">{formatDate(inv.date)} · {invoiceStatusLabels[inv.status as keyof typeof invoiceStatusLabels] ?? inv.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(total, currency)}</p>
                    {remaining > 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">Reste {formatCurrency(remaining, currency)}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

// ── Tab: Clients ─────────────────────────────────────────

function ClientsTab({
  topClients,
  clientsWithUnpaid,
  currency,
}: {
  topClients: { client: Client | undefined; billed: number; paid: number; count: number }[];
  clientsWithUnpaid: { client: Client | undefined; total: number }[];
  currency: string;
}) {
  const maxBilled = Math.max(...topClients.map((c) => c.billed), 1);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Top clients par CA</h3>
          <p className="mt-0.5 text-xs text-gray-400">Sur la période sélectionnée</p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
          {topClients.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">Aucune donnée</p>
          ) : (
            topClients.map(({ client, billed, paid, count }, idx) => {
              const collectionRate = billed > 0 ? (paid / billed) * 100 : 0;
              return (
                <div key={client?.id ?? idx} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{client?.name ?? '—'}</span>
                    </div>
                    <span className="text-base font-bold text-gray-900 dark:text-gray-100">{formatCurrency(billed, currency)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 pl-9">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className="h-full rounded-full bg-accent-500" style={{ width: `${(billed / maxBilled) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {count} facture{count > 1 ? 's' : ''} · {collectionRate.toFixed(0)}% encaissé
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card>
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Clients en attente de paiement</h3>
          <p className="mt-0.5 text-xs text-gray-400">Montants restant à encaisser</p>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
          {clientsWithUnpaid.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Aucun impayé</p>
              <p className="text-xs text-gray-400">Tous les clients sont à jour</p>
            </div>
          ) : (
            clientsWithUnpaid.map(({ client, total }, idx) => (
              <div key={client?.id ?? idx} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{client?.name ?? '—'}</span>
                </div>
                <span className="text-base font-bold text-amber-600 dark:text-amber-400">{formatCurrency(total, currency)}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

// ── Tab: Products ────────────────────────────────────────

function ProductsTab({
  topProducts,
  currency,
}: {
  topProducts: { name: string; qty: number; total: number }[];
  currency: string;
}) {
  const maxTotal = Math.max(...topProducts.map((p) => p.total), 1);
  return (
    <Card>
      <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Produits & services les plus vendus</h3>
        <p className="mt-0.5 text-xs text-gray-400">Classement par chiffre d'affaires généré</p>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
        {topProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
              <Package className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Aucune vente sur cette période</p>
            <p className="text-xs text-gray-400">Les produits vendus apparaîtront ici</p>
          </div>
        ) : (
          topProducts.map((p, idx) => (
            <div key={idx} className="px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-gray-900 dark:text-gray-100">{formatCurrency(p.total, currency)}</span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-3 pl-9">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className="h-full rounded-full bg-accent-500" style={{ width: `${(p.total / maxTotal) * 100}%` }} />
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{p.qty} unité{p.qty > 1 ? 's' : ''} vendue{p.qty > 1 ? 's' : ''}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

// ── Tab: Expenses ────────────────────────────────────────

function ExpensesTab({
  expensesByCategory,
  filteredExpenses,
  currency,
  maxCategoryAmount,
}: {
  expensesByCategory: [string, number][];
  filteredExpenses: { id: string; description: string; amountTTC: number; date: string; category: string; supplierName: string }[];
  currency: string;
  maxCategoryAmount: number;
}) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');

  const categories = expensesByCategory.map(([c]) => c);
  const sortedExpenses = useMemo(() => {
    let list = filteredExpenses;
    if (categoryFilter !== 'all') list = list.filter((e) => e.category === categoryFilter);
    return [...list].sort((a, b) => {
      if (sortBy === 'amount') return b.amountTTC - a.amountTTC;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [filteredExpenses, categoryFilter, sortBy]);

  const totalExpenses = expensesByCategory.reduce((s, [, amt]) => s + amt, 0);

  return (
    <div className="space-y-5">
      {/* Category breakdown */}
      <Card>
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Dépenses par catégorie</h3>
          <p className="mt-0.5 text-xs text-gray-400">Total: {formatCurrency(totalExpenses, currency)}</p>
        </div>
        <div className="space-y-3 p-4">
          {expensesByCategory.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Aucune dépense sur cette période</p>
          ) : (
            expensesByCategory.map(([cat, amount]) => {
              const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {expenseCategoryLabels[cat as keyof typeof expenseCategoryLabels] ?? cat}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{pct.toFixed(0)}%</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(amount, currency)}</span>
                    </div>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-accent-500 transition-all"
                      style={{ width: `${(amount / maxCategoryAmount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Expense list */}
      <Card>
        <div className="flex flex-col gap-4 border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Détail des dépenses</h3>
          <div className="flex flex-wrap gap-2">
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-auto text-xs">
              <option value="all">Toutes les catégories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {expenseCategoryLabels[c as keyof typeof expenseCategoryLabels] ?? c}
                </option>
              ))}
            </Select>
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')} className="w-auto text-xs">
              <option value="date">Trier par date</option>
              <option value="amount">Trier par montant</option>
            </Select>
          </div>
        </div>
        <div className="max-h-[400px] divide-y divide-gray-100 overflow-y-auto scrollbar-thin dark:divide-gray-800/50">
          {sortedExpenses.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Aucune dépense</p>
          ) : (
            sortedExpenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{e.description}</p>
                  <p className="text-xs text-gray-400">
                    {formatDate(e.date)} · {e.supplierName || '—'} · {expenseCategoryLabels[e.category as keyof typeof expenseCategoryLabels] ?? e.category}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(e.amountTTC, currency)}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
