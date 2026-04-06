// ─── Storefront Theme System ─────────────────────────────────────────────────
//
// Visual themes for seller storefronts. Sellers pick a theme during
// onboarding or from their dashboard. Each theme defines colors,
// effects, and photo treatment.

// ─── Types ───────────────────────────────────────────────────────────────────

export type ThemeColors = {
  /** CSS gradient for the storefront background */
  backgroundGradient: string;
  /** Primary accent color (buttons, highlights, borders) */
  accent: string;
  /** Main text color */
  text: string;
  /** Muted/secondary text color */
  textMuted: string;
  /** Card/surface background */
  surface: string;
};

export type StorefrontTheme = {
  /** Unique theme identifier */
  id: string;
  /** Display name shown in theme picker */
  name: string;
  /** Theme colors */
  colors: ThemeColors;
  /** Whether to show animated sparkle/particle effects */
  sparkles: boolean;
  /** Hero photo opacity (0 = fully dimmed, 1 = full brightness) */
  photoOpacity: number;
};

// ─── Theme Definitions ───────────────────────────────────────────────────────

export const THEMES: Record<string, StorefrontTheme> = {
  dark_neon: {
    id: "dark_neon",
    name: "Dark Neon",
    colors: {
      backgroundGradient: "linear-gradient(180deg, #0a0a0f 0%, #1a0a2e 50%, #0a0a0f 100%)",
      accent: "#7c5ce8",
      text: "#f4f4f5",
      textMuted: "#71717a",
      surface: "rgba(124, 92, 232, 0.08)",
    },
    sparkles: true,
    photoOpacity: 0.85,
  },

  warm_cozy: {
    id: "warm_cozy",
    name: "Warm & Cozy",
    colors: {
      backgroundGradient: "linear-gradient(180deg, #1a1008 0%, #2a1a0a 50%, #1a1008 100%)",
      accent: "#f59e0b",
      text: "#fef3c7",
      textMuted: "#a16207",
      surface: "rgba(245, 158, 11, 0.08)",
    },
    sparkles: false,
    photoOpacity: 0.9,
  },

  minimal_studio: {
    id: "minimal_studio",
    name: "Minimal Studio",
    colors: {
      backgroundGradient: "linear-gradient(180deg, #0d0d12 0%, #18181b 50%, #0d0d12 100%)",
      accent: "#e4e4e7",
      text: "#fafafa",
      textMuted: "#52525b",
      surface: "rgba(255, 255, 255, 0.04)",
    },
    sparkles: false,
    photoOpacity: 1.0,
  },

  retro_90s: {
    id: "retro_90s",
    name: "Retro 90s",
    colors: {
      backgroundGradient: "linear-gradient(180deg, #0f0a1a 0%, #1a0f2e 50%, #0a1a1a 100%)",
      accent: "#f472b6",
      text: "#fce7f3",
      textMuted: "#9d174d",
      surface: "rgba(244, 114, 182, 0.08)",
    },
    sparkles: true,
    photoOpacity: 0.75,
  },

  luxury: {
    id: "luxury",
    name: "Luxury",
    colors: {
      backgroundGradient: "linear-gradient(180deg, #0a0a08 0%, #1a1a10 50%, #0a0a08 100%)",
      accent: "#d4a574",
      text: "#f5f0e8",
      textMuted: "#8a7a6a",
      surface: "rgba(212, 165, 116, 0.06)",
    },
    sparkles: false,
    photoOpacity: 0.95,
  },

  hip_hop: {
    id: "hip_hop",
    name: "Hip Hop",
    colors: {
      backgroundGradient: "linear-gradient(180deg, #0a0a0a 0%, #1a0a0a 50%, #0a0a0a 100%)",
      accent: "#ef4444",
      text: "#fafafa",
      textMuted: "#737373",
      surface: "rgba(239, 68, 68, 0.08)",
    },
    sparkles: true,
    photoOpacity: 0.8,
  },

  nature_fresh: {
    id: "nature_fresh",
    name: "Nature Fresh",
    colors: {
      backgroundGradient: "linear-gradient(180deg, #0a1208 0%, #0a1a0f 50%, #0a1208 100%)",
      accent: "#22c55e",
      text: "#ecfdf5",
      textMuted: "#16a34a",
      surface: "rgba(34, 197, 94, 0.06)",
    },
    sparkles: false,
    photoOpacity: 0.9,
  },

  editorial: {
    id: "editorial",
    name: "Editorial",
    colors: {
      backgroundGradient: "linear-gradient(180deg, #121212 0%, #1a1a1a 50%, #121212 100%)",
      accent: "#a78bfa",
      text: "#e8e0f0",
      textMuted: "#6b5b7b",
      surface: "rgba(167, 139, 250, 0.06)",
    },
    sparkles: false,
    photoOpacity: 0.85,
  },

  ocean_blue: {
    id: "ocean_blue",
    name: "Ocean Blue",
    colors: {
      backgroundGradient: "linear-gradient(180deg, #0a0f1a 0%, #0a1a2e 50%, #0a0f1a 100%)",
      accent: "#38bdf8",
      text: "#e0f2fe",
      textMuted: "#0369a1",
      surface: "rgba(56, 189, 248, 0.06)",
    },
    sparkles: true,
    photoOpacity: 0.85,
  },
};

/** All theme IDs in display order */
export const THEME_IDS = Object.keys(THEMES);

/** Get a theme by ID, falling back to dark_neon */
export function getTheme(themeId: string | null | undefined): StorefrontTheme {
  if (themeId && themeId in THEMES) return THEMES[themeId];
  return THEMES.dark_neon;
}
