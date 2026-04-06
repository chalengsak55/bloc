// ─── Storefront Category Configuration ───────────────────────────────────────
//
// Defines per-category defaults for seller storefronts.
// Each category gets its own CTA buttons, content type, and layout options.

export type ContentType = "clips" | "menu" | "portfolio" | "services";
export type HeroStyle = "fullscreen" | "split" | "compact";

export type CTAButton = {
  label: string;
  icon: string; // emoji or icon name
  action: "message" | "call" | "book" | "order" | "directions" | "link";
};

export type CategoryConfig = {
  /** Primary CTA buttons shown prominently on the storefront */
  primaryCTA: CTAButton[];
  /** Secondary CTA buttons shown below primary */
  secondaryCTA: CTAButton[];
  /** Content tab type — determines how the feed/grid is displayed */
  contentType: ContentType;
  /** Whether to show ride/directions buttons (Uber, Lyft, Maps) */
  showRideButtons: boolean;
  /** Hero section layout style */
  heroStyle: HeroStyle;
};

export const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  singer: {
    primaryCTA: [
      { label: "Book", icon: "🎤", action: "book" },
      { label: "Message", icon: "💬", action: "message" },
    ],
    secondaryCTA: [
      { label: "Call", icon: "📞", action: "call" },
      { label: "Website", icon: "🌐", action: "link" },
    ],
    contentType: "clips",
    showRideButtons: false,
    heroStyle: "fullscreen",
  },

  restaurant: {
    primaryCTA: [
      { label: "Order", icon: "🛒", action: "order" },
      { label: "Reserve", icon: "📅", action: "book" },
    ],
    secondaryCTA: [
      { label: "Call", icon: "📞", action: "call" },
      { label: "Directions", icon: "📍", action: "directions" },
    ],
    contentType: "menu",
    showRideButtons: true,
    heroStyle: "fullscreen",
  },

  barber: {
    primaryCTA: [
      { label: "Book", icon: "✂️", action: "book" },
      { label: "Walk-in", icon: "🚶", action: "message" },
    ],
    secondaryCTA: [
      { label: "Call", icon: "📞", action: "call" },
      { label: "Directions", icon: "📍", action: "directions" },
    ],
    contentType: "portfolio",
    showRideButtons: true,
    heroStyle: "compact",
  },

  food: {
    primaryCTA: [
      { label: "Order", icon: "🛒", action: "order" },
      { label: "Message", icon: "💬", action: "message" },
    ],
    secondaryCTA: [
      { label: "Call", icon: "📞", action: "call" },
      { label: "Directions", icon: "📍", action: "directions" },
    ],
    contentType: "menu",
    showRideButtons: true,
    heroStyle: "fullscreen",
  },

  home: {
    primaryCTA: [
      { label: "Get Quote", icon: "📋", action: "message" },
      { label: "Call", icon: "📞", action: "call" },
    ],
    secondaryCTA: [
      { label: "Book", icon: "📅", action: "book" },
      { label: "Website", icon: "🌐", action: "link" },
    ],
    contentType: "services",
    showRideButtons: false,
    heroStyle: "compact",
  },

  events: {
    primaryCTA: [
      { label: "Book", icon: "🎉", action: "book" },
      { label: "Message", icon: "💬", action: "message" },
    ],
    secondaryCTA: [
      { label: "Call", icon: "📞", action: "call" },
      { label: "Website", icon: "🌐", action: "link" },
    ],
    contentType: "portfolio",
    showRideButtons: false,
    heroStyle: "fullscreen",
  },
};

/** Get config for a category, falling back to a sensible default */
export function getCategoryConfig(category: string | null): CategoryConfig {
  if (category && category.toLowerCase() in CATEGORY_CONFIGS) {
    return CATEGORY_CONFIGS[category.toLowerCase()];
  }
  // Default config for unknown categories
  return {
    primaryCTA: [
      { label: "Message", icon: "💬", action: "message" },
      { label: "Call", icon: "📞", action: "call" },
    ],
    secondaryCTA: [
      { label: "Book", icon: "📅", action: "book" },
      { label: "Website", icon: "🌐", action: "link" },
    ],
    contentType: "services",
    showRideButtons: false,
    heroStyle: "compact",
  };
}
