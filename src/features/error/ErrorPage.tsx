import { useNavigate, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { RefreshCw, Home, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/Button';

/** Page d'erreur de l'application : remplace l'écran technique par défaut de React Router. */
export default function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Erreur inconnue';
  const isChunkError = /dynamically imported module|Loading chunk|Failed to fetch/i.test(message);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-card dark:border-gray-800 dark:bg-gray-900">
        <TriangleAlert className="h-5 w-5 text-amber-600" strokeWidth={1.8} />
      </div>
      <div className="max-w-md">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Un problème est survenu</h1>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
          {isChunkError
            ? "Une nouvelle version de l'application est peut-être disponible. Rechargez la page pour continuer."
            : "Cette page n'a pas pu s'afficher. Vos données ne sont pas affectées."}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" />Recharger la page</Button>
        <Button variant="outline" onClick={() => navigate('/dashboard')}><Home className="h-4 w-4" />Tableau de bord</Button>
      </div>
      {import.meta.env.DEV && (
        <pre className="mt-2 max-w-xl overflow-x-auto rounded-lg bg-gray-100 p-3 text-left font-mono text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">{message}</pre>
      )}
    </div>
  );
}