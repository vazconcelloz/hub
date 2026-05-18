import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function getContrastColor(hexColor: string | null | undefined): "text-white" | "text-black" {
  if (!hexColor) return "text-white";
  
  // Se for uma classe do tailwind, tentamos extrair o nome ou retornamos padrão
  if (hexColor.startsWith("bg-")) {
    const darkColors = ["navy", "azure", "emerald", "ruby", "indigo", "slate", "teal", "copper", "violet", "rose", "fuchsia", "cyan", "red", "zinc", "black", "amber-600", "sky-600", "blue-600", "orange-600"];
    const isDark = darkColors.some(c => hexColor.includes(c)) || hexColor.includes("-700") || hexColor.includes("-800") || hexColor.includes("-900");
    return isDark ? "text-white" : "text-black";
  }

  // Se for hexadecimal
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? "text-black" : "text-white";
}
