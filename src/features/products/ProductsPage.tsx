import { useMemo, useState } from 'react';
import { Plus, Package, Edit3, Trash2, Search, Archive, Tag, X, Check } from 'lucide-react';
import { PageHeader, PageContent } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/SearchInput';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/tables/DataTable';
import { EmptyState, ErrorState } from '@/components/feedback/EmptyState';
import { SkeletonRows } from '@/components/feedback/Loading';
import { ExportImportButton } from '@/components/ui/ExportImportButton';
import { Tooltip } from '@/components/ui/Tooltip';
import { useAsync } from '@/hooks/useAsync';
import { services } from '@/services';
import { useToast } from '@/app/providers/ToastProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { formatCurrency } from '@/utils/format';
import { productTypeLabels } from '@/utils/labels';
import { productTypeDot } from '@/utils/styles';
import { cn } from '@/utils/cn';
import type { Product, ProductType, ProductCategory } from '@/types';

const emptyProduct: Omit<Product, 'id' | 'createdAt'> = {
  reference: '', name: '', description: '', priceHT: 0, vatRate: 19,
  unit: 'unité', category: '', type: 'service', stockEnabled: false, stockQuantity: 0, active: true,
};

const colorPalette = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [catForm, setCatForm] = useState({ name: '', color: colorPalette[0], description: '' });
  const [editingCat, setEditingCat] = useState<ProductCategory | null>(null);

  const { push } = useToast();
  const confirm = useConfirm();

  const { data: products, loading, error, reload } = useAsync(() => services.products.list({ search }), [search]);
  const { data: settings, reload: reloadSettings } = useAsync(() => services.settings.get(), []);
  const categories = settings?.productCategories ?? [];
  const currency = settings?.currency ?? 'DA';

  const filtered = useMemo(() => {
    return (products ?? []).filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (!showInactive && !p.active) return false;
      return true;
    });
  }, [products, typeFilter, categoryFilter, showInactive]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyProduct, category: categories[0]?.name ?? '' });
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ ...p });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      push('error', 'Le nom est obligatoire');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await services.products.update(editing.id, form);
        push('success', 'Produit modifié');
      } else {
        await services.products.create(form);
        push('success', 'Produit créé');
      }
      setDialogOpen(false);
      reload();
    } catch {
      push('error', 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) {
      push('error', 'Le nom de la catégorie est obligatoire');
      return;
    }
    try {
      const currentCats = settings?.productCategories ?? [];
      let updatedCats: ProductCategory[];
      if (editingCat) {
        updatedCats = currentCats.map((c) => (c.id === editingCat.id ? { ...c, ...catForm } : c));
      } else {
        updatedCats = [...currentCats, { id: `pc${Date.now()}`, ...catForm }];
      }
      await services.settings.update({ ...settings!, productCategories: updatedCats });
      push('success', editingCat ? 'Catégorie modifiée' : 'Catégorie créée');
      setCatDialogOpen(false);
      setCatForm({ name: '', color: colorPalette[0], description: '' });
      setEditingCat(null);
      reloadSettings();
    } catch {
      push('error', 'Erreur');
    }
  };

  const handleDeleteCategory = async (cat: ProductCategory) => {
    const ok = await confirm({ title: 'Supprimer la catégorie', message: `Supprimer "${cat.name}" ?`, confirmLabel: 'Supprimer', variant: 'danger' });
    if (!ok) return;
    const updatedCats = (settings?.productCategories ?? []).filter((c) => c.id !== cat.id);
    await services.settings.update({ ...settings!, productCategories: updatedCats });
    push('success', 'Catégorie supprimée');
    reloadSettings();
  };

  const handleBulkDelete = async () => {
    const ok = await confirm({ title: 'Supprimer', message: `Supprimer ${selectedKeys.length} produit(s) ?`, confirmLabel: 'Supprimer', variant: 'danger' });
    if (!ok) return;
    for (const id of selectedKeys) {
      await services.products.remove(id);
    }
    push('success', `${selectedKeys.length} produit(s) supprimé(s)`);
    setSelectedKeys([]);
    reload();
  };

  const handleBulkArchive = async (archive: boolean) => {
    for (const id of selectedKeys) {
      await services.products.update(id, { active: !archive });
    }
    push('success', `${selectedKeys.length} produit(s) ${archive ? 'archivé(s)' : 'réactivé(s)'}`);
    setSelectedKeys([]);
    reload();
  };

  const handleImport = async (rows: { [key: string]: string }[]) => {
    let imported = 0;
    for (const row of rows) {
      try {
        const product: Omit<Product, 'id' | 'createdAt'> = {
          reference: row['Référence'] || row['reference'] || '',
          name: row['Nom'] || row['name'] || '',
          description: row['Description'] || row['description'] || '',
          priceHT: Number(row['Prix HT'] || row['priceHT'] || 0),
          vatRate: Number(row['TVA'] || row['vatRate'] || 19),
          unit: row['Unité'] || row['unit'] || 'unité',
          category: row['Catégorie'] || row['category'] || '',
          type: (row['Type'] || row['type'] || 'service') as ProductType,
          stockEnabled: (row['Stock activé'] || row['stockEnabled'] || '').toLowerCase() === 'true' || (row['Stock'] || row['stockQuantity'] || '') !== '',
          stockQuantity: Number(row['Stock'] || row['stockQuantity'] || 0),
          active: true,
        };
        if (product.name.trim()) {
          await services.products.create(product);
          imported++;
        }
      } catch {
        // skip invalid rows
      }
    }
    push('success', 'Import réussi', `${imported} produit(s) importé(s)`);
    reload();
  };

  const exportColumns = [
    { key: 'reference', label: 'Référence', getValue: (p: Product) => p.reference },
    { key: 'name', label: 'Nom', getValue: (p: Product) => p.name },
    { key: 'description', label: 'Description', getValue: (p: Product) => p.description ?? '' },
    { key: 'type', label: 'Type', getValue: (p: Product) => productTypeLabels[p.type] },
    { key: 'category', label: 'Catégorie', getValue: (p: Product) => p.category },
    { key: 'priceHT', label: 'Prix HT', getValue: (p: Product) => p.priceHT },
    { key: 'vatRate', label: 'TVA', getValue: (p: Product) => p.vatRate },
    { key: 'unit', label: 'Unité', getValue: (p: Product) => p.unit },
    { key: 'stockQuantity', label: 'Stock', getValue: (p: Product) => p.stockQuantity ?? 0 },
    { key: 'active', label: 'Actif', getValue: (p: Product) => (p.active ? 'true' : 'false') },
  ];

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Nom',
      sortable: true,
      sortValue: (p) => p.name,
      render: (p) => (
        <div className="flex items-center gap-2.5">
          <span className={cn('h-2 w-2 rounded-full', productTypeDot[p.type])} />
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">{p.name}</p>
            <p className="text-xs text-gray-400">{p.reference}</p>
          </div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', sortable: true, sortValue: (p) => p.type, render: (p) => <Badge>{productTypeLabels[p.type]}</Badge> },
    {
      key: 'category',
      header: 'Catégorie',
      sortable: true,
      sortValue: (p) => p.category,
      render: (p) => {
        const cat = categories.find((c) => c.name === p.category);
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            {cat && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color }} />}
            {p.category || '—'}
          </span>
        );
      },
    },
    { key: 'priceHT', header: 'Prix HT', align: 'right', sortable: true, sortValue: (p) => p.priceHT, render: (p) => <span className="font-medium">{formatCurrency(p.priceHT, currency)}</span> },
    { key: 'vatRate', header: 'TVA', align: 'center', render: (p) => <span>{p.vatRate}%</span> },
    {
      key: 'priceTTC',
      header: 'Prix TTC',
      align: 'right',
      render: (p) => <span className="text-gray-600">{formatCurrency(p.priceHT * (1 + p.vatRate / 100), currency)}</span>,
    },
    { key: 'unit', header: 'Unité', render: (p) => <span className="text-gray-600">{p.unit}</span> },
    {
      key: 'status',
      header: 'Statut',
      render: (p) => (
        p.active ? <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Actif</Badge>
                 : <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500">Archivé</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (p) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Tooltip label="Modifier" side="top">
            <button onClick={() => openEdit(p)} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800" aria-label="Modifier">
              <Edit3 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
          <Tooltip label="Supprimer" side="top">
            <button
              onClick={async () => {
                const ok = await confirm({ title: 'Supprimer', message: `Supprimer "${p.name}" ?`, confirmLabel: 'Supprimer', variant: 'danger' });
                if (ok) {
                  await services.products.remove(p.id);
                  push('success', 'Produit supprimé');
                  reload();
                }
              }}
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
              aria-label="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Produits & Services"
        description={`${filtered.length} article(s)`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setEditingCat(null); setCatForm({ name: '', color: colorPalette[0], description: '' }); setCatDialogOpen(true); }}>
              <Tag className="h-4 w-4" /> Catégories
            </Button>
            <Button onClick={openNew}><Plus className="h-4 w-4" /> Nouveau</Button>
          </div>
        }
      />
      <PageContent>
        <Card>
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-3 dark:border-gray-800">
            <SearchInput value={search} onChange={setSearch} placeholder="Rechercher..." className="max-w-xs" />
            <Tabs active={typeFilter} onChange={setTypeFilter} tabs={['all', 'produit', 'service', 'prestation'].map((t) => ({ key: t, label: t === 'all' ? 'Tous' : productTypeLabels[t as ProductType] }))} />
            {categories.length > 0 && (
              <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-auto text-xs">
                <option value="all">Toutes catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </Select>
            )}
            <div className="ml-auto flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <Switch checked={showInactive} onChange={setShowInactive} />
                Afficher archivés
              </label>
              <ExportImportButton
                data={filtered}
                columns={exportColumns}
                filename="produits"
                onImport={handleImport}
                importLabel="Importer"
              />
            </div>
          </div>

          {/* Bulk action bar */}
          {selectedKeys.length > 0 && (
            <div className="flex items-center justify-between bg-accent-50 px-4 py-2.5 dark:bg-accent-900/20">
              <span className="text-sm font-medium text-accent-700 dark:text-accent-300">{selectedKeys.length} sélectionné(s)</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleBulkArchive(true)}><Archive className="h-3.5 w-3.5" /> Archiver</Button>
                <Button variant="outline" size="sm" onClick={() => handleBulkArchive(false)}><Check className="h-3.5 w-3.5" /> Réactiver</Button>
                <Button variant="danger" size="sm" onClick={handleBulkDelete}><Trash2 className="h-3.5 w-3.5" /> Supprimer</Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedKeys([])}><X className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}

          {loading ? (
            <SkeletonRows />
          ) : error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Aucun produit"
              description="Ajoutez vos produits et services"
              action={<Button onClick={openNew}><Plus className="h-4 w-4" /> Ajouter</Button>}
            />
          ) : (
            <DataTable
              columns={columns}
              data={filtered}
              rowKey={(p) => p.id}
              onRowClick={openEdit}
              defaultSort={{ key: 'name', dir: 'asc' }}
              selectable
              selectedKeys={selectedKeys}
              onSelectionChange={setSelectedKeys}
            />
          )}
        </Card>
      </PageContent>

      {/* Product dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={editing ? 'Modifier' : 'Nouveau produit / service'} size="lg" footer={<><Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button></>}>
        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Référence"><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
            <Field label="Nom" required><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          </div>
          <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Type">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ProductType })}>
                <option value="produit">Produit</option>
                <option value="service">Service</option>
                <option value="prestation">Prestation</option>
              </Select>
            </Field>
            <Field label="Catégorie">
              <div className="flex gap-2">
                <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </Select>
                <Tooltip label="Nouvelle catégorie" side="top">
                  <button
                    type="button"
                    onClick={() => { setEditingCat(null); setCatForm({ name: '', color: colorPalette[0], description: '' }); setCatDialogOpen(true); }}
                    className="shrink-0 rounded-md border border-gray-300 px-2 text-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </Tooltip>
              </div>
            </Field>
            <Field label="Unité">
              <Select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {(settings?.documentFields.invoice.units ?? ['unité', 'heure', 'jour', 'mois', 'mètre', 'forfait']).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Prix HT"><Input type="number" value={form.priceHT} onChange={(e) => setForm({ ...form, priceHT: Number(e.target.value) })} /></Field>
            <Field label="TVA (%)"><Input type="number" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: Number(e.target.value) })} /></Field>
            <Field label="Prix TTC">
              <Input value={formatCurrency(form.priceHT * (1 + form.vatRate / 100), currency)} disabled />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium">Gestion de stock</p>
              <p className="text-xs text-gray-400">Activer le suivi de quantité</p>
            </div>
            <Switch checked={form.stockEnabled} onChange={(v) => setForm({ ...form, stockEnabled: v })} />
          </div>
          {form.stockEnabled && (
            <Field label="Quantité en stock"><Input type="number" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: Number(e.target.value) })} /></Field>
          )}
          <div className="flex items-center justify-between rounded-md border border-gray-200 px-4 py-3 dark:border-gray-800">
            <div>
              <p className="text-sm font-medium">Actif</p>
              <p className="text-xs text-gray-400">Désactiver pour archiver</p>
            </div>
            <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
          </div>
        </div>
      </Dialog>

      {/* Category dialog */}
      <Dialog open={catDialogOpen} onClose={() => setCatDialogOpen(false)} title={editingCat ? 'Modifier la catégorie' : 'Nouvelle catégorie'} size="md" footer={<>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Annuler</Button>
  <Button onClick={handleSaveCategory}>{editingCat ? 'Modifier' : 'Créer'}</Button>
</>}>
        <div className="space-y-4 p-5">
          <Field label="Nom" required><Input value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} placeholder="Ex: Sécurité" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') void handleSaveCategory(); }} /></Field>
          <Field label="Description"><Input value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} /></Field>
          <Field label="Couleur">
            <div className="flex flex-wrap gap-2">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setCatForm({ ...catForm, color })}
                  className={cn('h-8 w-8 rounded-full border-2 transition-all', catForm.color === color ? 'border-gray-900 scale-110 dark:border-white' : 'border-transparent')}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </Field>

          {/* Existing categories list */}
          {categories.length > 0 && (
            <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
              <p className="mb-2 text-[13px] font-medium text-gray-500">Catégories existantes <span className="num text-gray-400">({categories.length})</span></p>
              <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
              {categories.map((cat) => (
                <div key={cat.id} className={cn('flex items-center justify-between rounded-lg border px-3 py-2', editingCat?.id === cat.id ? 'border-accent-400 bg-accent-50/50 dark:bg-accent-500/10' : 'border-gray-200 dark:border-gray-800')}>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-medium">{cat.name}</span>
                    {cat.description && <span className="text-xs text-gray-400">— {cat.description}</span>}
                  </div>
                  <div className="flex gap-1">
                    <button
                      aria-label="Modifier"
                      onClick={() => { setEditingCat(cat); setCatForm({ name: cat.name, color: cat.color, description: cat.description ?? '' }); }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      aria-label="Supprimer"
                      onClick={() => handleDeleteCategory(cat)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}