import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Check, ArrowRight, ArrowLeft, Building2, Package, Users, BarChart3, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/app/providers/ToastProvider';
import { useApp } from '@/app/providers/AppProvider';
import { ALL_MODULES, getDefaultModules, saveModuleConfig, setOnboardingComplete, type ModuleConfig } from '@/utils/modules';
import { services } from '@/services';
import { cn } from '@/utils/cn';

const steps = [
  { key: 'welcome', label: 'Bienvenue' },
  { key: 'company', label: 'Entreprise' },
  { key: 'modules', label: 'Modules' },
  { key: 'finish', label: 'Terminé' },
];

const colorOptions = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const { setModuleConfig: setAppModuleConfig } = useApp();
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    nif: '',
    currency: 'DA',
  });
  const [moduleConfig, setModuleConfigState] = useState<ModuleConfig>(() => getDefaultModules());

  const toggleModule = (key: string, enabled: boolean) => {
    setModuleConfigState((prev) => ({ ...prev, [key]: enabled }));
  };

  const handleFinish = async () => {
    saveModuleConfig(moduleConfig);
    setAppModuleConfig(moduleConfig);
    setOnboardingComplete(true);

    if (company.name.trim()) {
      try {
        const settings = await services.settings.get();
        await services.settings.update({
          ...settings,
          company: { ...settings.company, name: company.name, address: company.address, phone: company.phone, email: company.email, nif: company.nif },
          currency: company.currency,
        });
      } catch {
        // ignore
      }
    }

    push('success', 'Configuration terminée', 'Bienvenue sur Factura');
    navigate('/dashboard');
  };

  const canProceed = step === 0 || step === 2 || step === 3 || (step === 1 && company.name.trim().length > 0);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900 text-white dark:bg-white dark:text-gray-900">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Factura</h1>
            <p className="text-xs text-gray-400">Configuration de votre espace</p>
          </div>
        </div>

        <Card className="overflow-hidden">
          {/* Progression : une barre fine et l'étape en cours */}
          <div className="px-6 pt-5 sm:px-8">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-900 dark:text-gray-100">{steps[step]?.label}</span>
              <span className="num text-gray-400">Étape {step + 1} sur {steps.length}</span>
            </div>
            <div className="mt-2 flex gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}>
              {steps.map((st, idx) => (
                <div key={st.key} className={cn('h-1 flex-1 rounded-full transition-colors duration-300', idx <= step ? 'bg-accent-600' : 'bg-gray-200 dark:bg-gray-800')} />
              ))}
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {step === 0 && (
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-card dark:border-gray-800 dark:bg-gray-900">
                  <Sparkles className="h-7 w-7 text-accent-600" />
                </div>
                <h2 className="mt-5 text-xl font-semibold text-gray-900 dark:text-gray-100">Bienvenue sur Factura</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Votre logiciel de facturation professionnel. Configurons ensemble votre espace de travail en quelques étapes.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { icon: Building2, label: 'Configurez votre entreprise' },
                    { icon: Package, label: 'Choisissez vos modules' },
                    { icon: BarChart3, label: 'Commencez à facturer' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                        <Icon className="mx-auto h-5 w-5 text-accent-600" />
                        <p className="mt-2 text-xs text-gray-500">{item.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Informations de votre entreprise</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ces informations apparaîtront sur vos factures et devis.</p>
                <div className="mt-5 space-y-4">
                  <Field label="Nom de l'entreprise" required>
                    <Input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} placeholder="Ex: Mon Entreprise SARL" />
                  </Field>
                  <Field label="Adresse">
                    <Textarea className="min-h-[60px]" value={company.address} onChange={(e) => setCompany({ ...company, address: e.target.value })} placeholder="Adresse complète" />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Téléphone"><Input value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} /></Field>
                    <Field label="Email"><Input type="email" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} /></Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="NIF"><Input value={company.nif} onChange={(e) => setCompany({ ...company, nif: e.target.value })} /></Field>
                    <Field label="Devise"><Input value={company.currency} onChange={(e) => setCompany({ ...company, currency: e.target.value })} /></Field>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Choisissez vos modules</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Activez uniquement ce dont vous avez besoin. Vous pourrez changer plus tard dans les paramètres.</p>
                <div className="mt-5 space-y-2">
                  {(['core', 'sales', 'finance', 'system'] as const).map((group) => {
                    const groupModules = ALL_MODULES.filter((m) => m.group === group);
                    const groupLabels: Record<string, string> = { core: 'Principal', sales: 'Ventes', finance: 'Finances', system: 'Système' };
                    return (
                      <div key={group}>
                        <p className="px-1 pb-1 pt-3 text-xs font-medium uppercase tracking-wider text-gray-400">{groupLabels[group]}</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {groupModules.map((mod) => {
                            const enabled = moduleConfig[mod.key] ?? mod.defaultEnabled;
                            const Icon = mod.icon;
                            return (
                              <div
                                key={mod.key}
                                className={cn(
                                  'flex items-start gap-3 rounded-lg border p-3 transition-all',
                                  enabled
                                    ? 'border-accent-300 bg-accent-50/50 dark:border-accent-900/40 dark:bg-accent-900/10'
                                    : 'border-gray-200 dark:border-gray-800',
                                )}
                              >
                                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', enabled ? 'bg-accent-100 text-accent-600 dark:bg-accent-900/30 dark:text-accent-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800')}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{mod.label}</p>
                                    <Switch checked={enabled} onChange={(v) => toggleModule(mod.key, v)} />
                                  </div>
                                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{mod.description}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-900/20">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-gray-900 dark:text-gray-100">Tout est prêt !</h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Votre espace est configuré. Vous pouvez maintenant créer vos premiers clients, produits et factures.
                </p>
                <div className="mt-6 rounded-lg bg-gray-50 p-4 text-left dark:bg-gray-800/50">
                  <p className="text-xs font-medium text-gray-500">Récapitulatif</p>
                  <div className="mt-2 space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Entreprise</span><span className="font-medium">{company.name || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Modules activés</span><span className="font-medium">{Object.values(moduleConfig).filter(Boolean).length} / {ALL_MODULES.length}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => (step === 0 ? handleFinish() : setStep((s) => s - 1))}
              >
                {step === 0 ? 'Passer' : <><ArrowLeft className="h-4 w-4" /> Précédent</>}
              </Button>
              {step < 3 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed}>
                  Suivant <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleFinish}>
                  Commencer <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}