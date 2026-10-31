import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, Eye, EyeOff, Mail, Lock, ArrowRight, Shield, Zap, TrendingUp } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { useApp } from '@/app/providers/AppContext';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

type AuthErrorDetails = {
  code: string;
  message: string;
  retryAfterSeconds?: number;
  remainingAttempts?: number;
};

function isAuthError(err: unknown): err is AuthErrorDetails {
  return typeof err === 'object' && err !== null &&
    'code' in err && typeof err.code === 'string' &&
    'message' in err && typeof err.message === 'string';
}

export default function LoginPage() {
  const { login } = useAuth();
  const { theme } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [retryIn, setRetryIn] = useState(0);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (retryIn <= 0) return;
    const id = setInterval(() => setRetryIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [retryIn > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, remember);
      navigate('/dashboard');
    } catch (err) {
      if (isAuthError(err)) {
        if (err.code === 'too_many_attempts') setRetryIn(err.retryAfterSeconds ?? 60);
        setError(err.code === 'invalid_credentials' && err.remainingAttempts !== undefined && err.remainingAttempts <= 2 ? `${err.message} ${err.remainingAttempts} essai(s) restant(s).` : err.message);
      } else {
        setError('Connexion impossible. Réessayez.');
      }
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Zap, title: 'Facturation rapide', desc: 'Créez factures et devis en quelques clics' },
    { icon: TrendingUp, title: 'Suivi financier', desc: 'Tableaux de bord et rapports en temps réel' },
    { icon: Shield, title: 'Données sécurisées', desc: 'Vos informations restent confidentielles' },
  ];

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-950">
      {/* Left panel — branding */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gray-950 p-12 lg:flex">

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <Receipt className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">Factura</p>
            <p className="text-xs text-gray-400">Facturation Pro</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative">
          <h1 className="text-3xl font-bold leading-tight text-white xl:text-4xl">
            Gérez votre facturation<br />en toute simplicité
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-300">
            La solution complète pour les entreprises algériennes : devis, factures, paiements, dépenses et rapports financiers.
          </p>

          {/* Feature list */}
          <div className="mt-10 space-y-4">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <f.icon className="h-4.5 w-4.5 text-white" style={{ width: 18, height: 18 }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-gray-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative text-xs text-gray-500">
          © 2026 Factura · Conçu pour l'Algérie
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-600 text-white">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900 dark:text-gray-100">Factura</p>
              <p className="text-xs text-gray-400">Facturation Pro</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Connexion</h2>
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Accédez à votre espace de facturation
            </p>
          </div>

          {/* Demo banner */}
          <div className="mb-5 rounded-lg border border-accent-200 bg-accent-50 px-4 py-3 dark:border-accent-900/50 dark:bg-accent-900/20">
            <p className="text-xs font-medium text-accent-700 dark:text-gray-500">
              Mode démonstration
            </p>
            <p className="mt-0.5 text-xs text-accent-600 dark:text-accent-400">
              Utilisez les identifiants pré-remplis pour vous connecter.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full h-10 rounded-lg border border-gray-200 bg-white py-2 shadow-card pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:ring-offset-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                  placeholder="vous@entreprise.dz"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Mot de passe</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full h-10 rounded-lg border border-gray-200 bg-white py-2 shadow-card pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 focus:ring-offset-0 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember + forgot */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-accent-600 focus:ring-accent-500 dark:border-gray-600 dark:bg-gray-800"
                />
                Se souvenir de moi
              </label>
              <button
                type="button"
                onClick={() => setForgotOpen((v) => !v)}
                className="text-sm text-accent-600 hover:text-accent-700 dark:text-accent-400 dark:hover:text-gray-500"
              >
                Mot de passe oublié ?
              </button>
            </div>

            {forgotOpen && (
              <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                Demandez à votre administrateur de réinitialiser votre mot de passe (Administration &gt; Utilisateurs).
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 animate-slide-up">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              disabled={loading || retryIn > 0}
              className="w-full"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Connexion...
                </>
              ) : (
                <>
                  {retryIn > 0 ? `Réessayez dans ${retryIn} s` : 'Se connecter'}
                  {retryIn === 0 && <ArrowRight className="h-4 w-4" />}
                </>
              )}
            </Button>
          </form>

          {/* Compte de démonstration (à retirer avec le backend) */}
          <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-3 text-center text-xs text-gray-500 dark:border-gray-700">
            <p>Compte de démonstration : <span className="font-mono">admin@factura.dz</span> · <span className="font-mono">demo1234</span></p>
            <button type="button" onClick={() => { setEmail('admin@factura.dz'); setPassword('demo1234'); setError(''); }} className="mt-1 font-medium text-accent-600 hover:underline dark:text-accent-400">
              Utiliser ces identifiants
            </button>
          </div>
          <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-600">Votre accès est créé par l'administrateur de votre entreprise.</p>
        </div>
      </div>

      {/* Theme indicator (bottom-right) */}
      <div className="fixed bottom-4 left-4 flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-600">
        <span className={cn('h-1.5 w-1.5 rounded-full', theme === 'dark' ? 'bg-gray-600' : 'bg-accent-400')} />
        {theme === 'dark' ? 'Mode sombre' : 'Mode clair'}
      </div>
    </div>
  );
}