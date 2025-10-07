import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat("en-US").format(num);
}

export function formatDate(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

// Add shared constants
export const EXCLUDED_GUILD_IDS = [
  '752764', '714529', '576376', '322478', '422701', 
  '317508', '659804', '034090', '712589', '743321', '195945'
];

export const EXCLUDED_SERVER_NAMES = ['Competi_Dev'];
