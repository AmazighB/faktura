import { useNavigate } from 'react-router-dom';
import { Home, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
        <FileQuestion className="h-8 w-8 text-gray-400" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">404</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Cette page n'existe pas ou a été déplacée.</p>
      </div>
      <Button onClick={() => navigate('/dashboard')}>
        <Home className="h-4 w-4" /> Retour au tableau de bord
      </Button>
    </div>
  );
}
