import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, Wand2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Affiche un bouton « générer » (création / réinitialisation par un administrateur). */
  onGenerate?: () => void;
}

export function PasswordInput({ onGenerate, className, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);
  const btn = 'rounded p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200';
  return (
    <div className="relative">
      <Input {...props} type={show ? 'text' : 'password'} className={cn(onGenerate ? 'pr-[4.75rem]' : 'pr-10', className)} />
      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
        {onGenerate && (
          <button type="button" onClick={onGenerate} className={btn} aria-label="Générer un mot de passe" title="Générer un mot de passe">
            <Wand2 className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={() => setShow((v) => !v)} className={btn} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}