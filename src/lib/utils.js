import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}


// --- Book Formatting Helpers ---
export const BOOK_COLORS = [
  "bg-red-900", "bg-blue-900", "bg-green-900", "bg-yellow-700",
  "bg-purple-900", "bg-indigo-900", "bg-teal-900", "bg-rose-900",
  "bg-slate-800", "bg-orange-800", "bg-emerald-900", "bg-amber-900",
  "bg-stone-800", "bg-zinc-800", "bg-cyan-900"
];

export const getHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

export const getColorForTitle = (title) => BOOK_COLORS[getHash(title || "") % BOOK_COLORS.length];

export const formatDate = (dateString) => {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString; 
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};
