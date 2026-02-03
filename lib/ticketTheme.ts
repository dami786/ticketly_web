/**
 * Event Ticket Theme – types, defaults, presets, and helpers.
 * Used by Event Ticket Theme page and TicketPreview.
 */

export type BackgroundElement =
  | "none"
  | "organic"
  | "fluid"
  | "grid"
  | "geometric"
  | "mesh"
  | "gradient_mesh"
  | "vector"
  | "dynamic";

export type PatternWeight =
  | "sharper"
  | "sharp"
  | "thin"
  | "medium"
  | "thick"
  | "thicker";

export interface TicketTheme {
  gradientStart: string;
  gradientEnd: string;
  primaryTextColor: string;
  accentColor: string;
  brandColor: string;
  gradientDirection: string;
  backgroundElement?: BackgroundElement;
  patternWeight?: PatternWeight;
}

export const DEFAULT_TICKET_THEME: TicketTheme = {
  gradientStart: "#FFFFFF",
  gradientEnd: "#FFFFFF",
  primaryTextColor: "#1F1F1F",
  accentColor: "#DC2626",
  brandColor: "#DC2626",
  gradientDirection: "to right bottom",
  backgroundElement: "none",
  patternWeight: "medium",
};

export const PRESET_THEMES: {
  name: string;
  gradientStart: string;
  gradientEnd: string;
  primaryTextColor: string;
  accentColor: string;
  brandColor: string;
}[] = [
  {
    name: "Sunset",
    gradientStart: "#F59E0B",
    gradientEnd: "#EF4444",
    primaryTextColor: "#FFFFFF",
    accentColor: "#FCD34D",
    brandColor: "#FEE2E2",
  },
  {
    name: "Ocean",
    gradientStart: "#0EA5E9",
    gradientEnd: "#6366F1",
    primaryTextColor: "#FFFFFF",
    accentColor: "#67E8F9",
    brandColor: "#CFFAFE",
  },
  {
    name: "Forest",
    gradientStart: "#22C55E",
    gradientEnd: "#15803D",
    primaryTextColor: "#FFFFFF",
    accentColor: "#86EFAC",
    brandColor: "#DCFCE7",
  },
  {
    name: "Royal",
    gradientStart: "#7C3AED",
    gradientEnd: "#EC4899",
    primaryTextColor: "#FFFFFF",
    accentColor: "#E9D5FF",
    brandColor: "#FCE7F3",
  },
  {
    name: "Midnight",
    gradientStart: "#1E3A5F",
    gradientEnd: "#0F172A",
    primaryTextColor: "#F8FAFC",
    accentColor: "#38BDF8",
    brandColor: "#94A3B8",
  },
];

export const BACKGROUND_ELEMENTS: {
  id: BackgroundElement;
  name: string;
  style: string;
}[] = [
  { id: "none", name: "None", style: "No pattern" },
  { id: "organic", name: "Organic", style: "Music" },
  { id: "fluid", name: "Fluid", style: "Liquid" },
  { id: "grid", name: "Grid", style: "Tech" },
  { id: "geometric", name: "Geometric", style: "Technical" },
  { id: "mesh", name: "Mesh", style: "Art" },
  { id: "gradient_mesh", name: "Gradient Mesh", style: "Aesthetic" },
  { id: "vector", name: "Vector", style: "Sports" },
  { id: "dynamic", name: "Dynamic", style: "Kinetic" },
];

export const PATTERN_WEIGHTS: {
  id: PatternWeight;
  name: string;
  description: string;
}[] = [
  { id: "sharper", name: "Sharper", description: "Thinnest lines" },
  { id: "sharp", name: "Sharp", description: "Thinner, finer lines" },
  { id: "thin", name: "Thin", description: "Thin lines" },
  { id: "medium", name: "Medium", description: "Balanced (default)" },
  { id: "thick", name: "Thick", description: "Bolder lines" },
  { id: "thicker", name: "Thicker", description: "Boldest, thickest lines" },
];

export function mergeTicketTheme(partial: Partial<TicketTheme> | null | undefined): TicketTheme {
  return {
    ...DEFAULT_TICKET_THEME,
    ...partial,
    gradientDirection: partial?.gradientDirection ?? DEFAULT_TICKET_THEME.gradientDirection,
    backgroundElement: (partial?.backgroundElement ?? DEFAULT_TICKET_THEME.backgroundElement) as BackgroundElement,
    patternWeight: (partial?.patternWeight ?? DEFAULT_TICKET_THEME.patternWeight) as PatternWeight,
  };
}

export function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

export function normalizeHex(hex: string): string {
  const trimmed = hex.trim();
  if (!trimmed.startsWith("#")) return trimmed;
  const withoutHash = trimmed.slice(1);
  if (withoutHash.length === 3) {
    const r = withoutHash[0] + withoutHash[0];
    const g = withoutHash[1] + withoutHash[1];
    const b = withoutHash[2] + withoutHash[2];
    return `#${r}${g}${b}`.toLowerCase();
  }
  if (withoutHash.length === 6) return `#${withoutHash}`.toLowerCase();
  return trimmed;
}

/** e.g. "Feb 28, 2026" */
export function formatDateShort(dateString: string): string {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(dateString);
  }
}

/** e.g. "Friday, 30 January 2026 at 19:31:21 pm GMT+5" */
export function formatTimestamp(dateString: string): string {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleString("en-PK", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return String(dateString);
  }
}

/** Status border/text color */
export function getStatusColor(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "confirmed") return "#10B981";
  if (s === "pending_payment") return "#DC2626";
  if (s === "payment_in_review") return "#3B82F6";
  if (s === "used") return "#6B7280";
  if (s === "cancelled") return "#DC2626";
  return "#9CA3AF";
}

/** Status background (~30% opacity) */
export function getStatusBgColor(status: string): string {
  const hex = getStatusColor(status).replace("#", "");
  return `#${hex}4D`;
}

/** Status display text */
export function getStatusText(status: string): string {
  const s = (status || "").toLowerCase();
  if (s === "confirmed") return "CONFIRMED";
  if (s === "pending_payment") return "PENDING PAYMENT";
  if (s === "payment_in_review") return "IN REVIEW";
  if (s === "used") return "USED";
  if (s === "cancelled") return "CANCELLED";
  return (status || "").toUpperCase().replace(/_/g, " ");
}

/** Pattern weight → stroke multiplier for BackgroundPattern */
export const PATTERN_WEIGHT_MULTIPLIER: Record<PatternWeight, number> = {
  sharper: 0.6,
  sharp: 0.8,
  thin: 1.0,
  medium: 1.2,
  thick: 1.5,
  thicker: 1.9,
};
