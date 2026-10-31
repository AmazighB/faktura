import { passwordStrength } from '@/utils/password';
import { cn } from '@/utils/cn';

const COLORS = ['bg-gray-300', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600'];

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { score, label } = passwordStrength(password);
  return (
    <div className="mt-1" aria-live="polite">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full', i <= score ? COLORS[score] : 'bg-gray-200 dark:bg-gray-800')} />
        ))}
      </div>
      <p className="mt-1 text-xs text-gray-500">Robustesse : {label}</p>
    </div>
  );
}