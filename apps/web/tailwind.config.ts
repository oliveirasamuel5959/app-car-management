import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      /*
       * The design system's radius scale is 10 / 16 (see the redesign PDF).
       * `md` is 10px and `xl` is 16px; the remaining steps are the sensible
       * neighbours of those two so small controls and pills stay consistent.
       */
      borderRadius: {
        sm: ".375rem", /* 6px */
        DEFAULT: ".625rem", /* 10px */
        md: ".625rem", /* 10px */
        lg: ".625rem", /* 10px */
        xl: "1rem", /* 16px */
        "2xl": "1.25rem", /* 20px */
      },
      /*
       * Type scale 13 / 15 / 18 / 22 / 30, mapped onto Tailwind's steps at the
       * line heights the design uses (1.4 for body, 1.25 for headings).
       */
      fontSize: {
        xs: ["0.8125rem", { lineHeight: "1.15rem" }], /* 13px */
        sm: ["0.9375rem", { lineHeight: "1.35rem" }], /* 15px */
        base: ["0.9375rem", { lineHeight: "1.5rem" }], /* 15px */
        lg: ["1.125rem", { lineHeight: "1.5rem" }], /* 18px */
        xl: ["1.375rem", { lineHeight: "1.75rem" }], /* 22px */
        "2xl": ["1.375rem", { lineHeight: "1.75rem" }], /* 22px */
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }], /* 30px */
        "4xl": ["1.875rem", { lineHeight: "2.25rem" }], /* 30px */
      },
      /*
       * Spacing scale 4 / 8 / 12 / 16 / 24 / 32. Tailwind's default 4px base
       * already produces every one of these, so only the named steps the design
       * uses repeatedly need an alias.
       */
      spacing: {
        gutter: "2rem", /* 32px — the content band's side gutter */
      },
      maxWidth: {
        /* The content band measured from the design: ~960px. */
        content: "60rem",
      },
      width: {
        /* Sidebar width from the design. */
        sidebar: "16rem", /* 256px */
      },
      screens: {
        /* Below this the sidebar becomes the bottom bar (design: 768px). */
        nav: "768px",
      },
      colors: {
        // Flat / base colors (regular buttons)
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
          border: "hsl(var(--card-border) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
          border: "hsl(var(--popover-border) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          border: "var(--primary-border)",
          text: "hsl(var(--primary-text) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
          border: "var(--secondary-border)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
          border: "var(--muted-border)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
          border: "var(--accent-border)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
          text: "hsl(var(--destructive-text) / <alpha-value>)",
          border: "var(--destructive-border)",
        },
        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
          text: "hsl(var(--success-text) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
        },
        ring: "hsl(var(--ring) / <alpha-value>)",
        /* Brand bar at the top of the shell. */
        header: {
          DEFAULT: "hsl(var(--header) / <alpha-value>)",
          foreground: "hsl(var(--header-foreground) / <alpha-value>)",
        },
        /* Navigation item states. */
        nav: {
          active: "hsl(var(--nav-active) / <alpha-value>)",
          "active-foreground": "hsl(var(--nav-active-foreground) / <alpha-value>)",
          hover: "hsl(var(--nav-hover) / <alpha-value>)",
        },
        /* Progress bar track on the current-service card. */
        track: "hsl(var(--track) / <alpha-value>)",
        /*
         * Status tints, keyed by *semantic role* rather than by status name, so
         * the two status domains — schedules and service orders, which both
         * have a "Pendente" and a "Recusado" with different meanings — cannot
         * collide. See src/pages/client/service-status.ts.
         */
        status: {
          "pending-bg": "hsl(var(--status-pending-bg) / <alpha-value>)",
          "pending-fg": "hsl(var(--status-pending-fg) / <alpha-value>)",
          "confirmed-bg": "hsl(var(--status-confirmed-bg) / <alpha-value>)",
          "confirmed-fg": "hsl(var(--status-confirmed-fg) / <alpha-value>)",
          "progress-bg": "hsl(var(--status-progress-bg) / <alpha-value>)",
          "progress-fg": "hsl(var(--status-progress-fg) / <alpha-value>)",
          "completed-bg": "hsl(var(--status-completed-bg) / <alpha-value>)",
          "completed-fg": "hsl(var(--status-completed-fg) / <alpha-value>)",
          "cancelled-bg": "hsl(var(--status-cancelled-bg) / <alpha-value>)",
          "cancelled-fg": "hsl(var(--status-cancelled-fg) / <alpha-value>)",
        },
        chart: {
          "1": "hsl(var(--chart-1) / <alpha-value>)",
          "2": "hsl(var(--chart-2) / <alpha-value>)",
          "3": "hsl(var(--chart-3) / <alpha-value>)",
          "4": "hsl(var(--chart-4) / <alpha-value>)",
          "5": "hsl(var(--chart-5) / <alpha-value>)",
        },
        sidebar: {
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
          DEFAULT: "hsl(var(--sidebar) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
        },
        "sidebar-primary": {
          DEFAULT: "hsl(var(--sidebar-primary) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          border: "var(--sidebar-primary-border)",
        },
        "sidebar-accent": {
          DEFAULT: "hsl(var(--sidebar-accent) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "var(--sidebar-accent-border)"
        },
        presence: {
          online: "rgb(34 197 94)",
          away: "rgb(245 158 11)",
          busy: "rgb(239 68 68)",
          offline: "rgb(156 163 175)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
        /* One family carries the design; `display` and `body` remain as aliases
           so existing call sites keep working while they are migrated. */
        display: ["var(--font-sans)"],
        body: ["var(--font-sans)"],
      },
      transitionTimingFunction: {
        brand: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
