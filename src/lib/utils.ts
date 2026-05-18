import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
export const money = (value?: number | null) => typeof value === 'number' ? new Intl.NumberFormat('tr-TR').format(value) + ' ₺' : 'Bütçe açık';
export const go = (path: string) => { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); };
