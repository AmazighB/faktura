export type ClassValue = string | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}

export function cx(...classes: (ClassValue | ClassValue[])[]): string {
  return classes.flat().filter(Boolean).join(' ');
}
