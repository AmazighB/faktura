import { useNavigate } from 'react-router-dom';
import { Home, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-4 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-card dark:border-gray-800 dark:bg-gray-900">
        <FileQuestion className="h-5 w-5 text-gray-500" strokeWidth={1.8} />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Page introuvable</h1>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">Cette page n'existe pas ou a été déplacée.</p>
      </div>
      <Button onClick={() => navigate('/dashboard')}><Home className="h-4 w-4" />Retour au tableau de bord</Button>
    </div>
  );
}