---
target: landing page, login and register pages
total_score: 55
max_score: 112
na_heuristics: 7,10
p0_count: 1
p1_count: 3
target_identity: "file:/home/samuel/projects/pessoal/app-car-management/apps/web/src/pages/home-page.tsx"
target_fingerprint: "sha256:6b7f013ecac614825f1fcd8dbb0eac7d05381a3ea6a1e2aa05303257d463994a"
target_path: /home/samuel/projects/pessoal/app-car-management/apps/web/src/pages/home-page.tsx
timestamp: 2026-10-09T18-13-32Z
slug: src-pages-home-page-tsx
closed: true
---
# Impeccable Critique — DrivePluss public surfaces

**Targets:** `/` landing (Persuade) · `/login` (Operate) · `/signup` (Operate)
**Resolved:** `apps/web/src/pages/home-page.tsx`, `apps/web/src/layouts/auth-layout.tsx`, `apps/web/src/components/auth/*`

## Design Health Score

Per-surface. Landing heuristics 7 and 10 are `n/a` (Persuade).

| # | Heuristic | Landing | Login | Register | Key Issue |
|---|-----------|---------|-------|----------|-----------|
| 1 | Visibility of System Status | 2 | 2 | 2 | No active/scroll-spy state on landing nav; auth status ("Signing in…") is visual-only, no `aria-live`. |
| 2 | Match System / Real World | 3 | 2 | 2 | "Professional Email Address" + "Account type: Client" contradict landing's "vehicle owners"; brand spelled 3 ways. |
| 3 | User Control and Freedom | 3 | 2 | 1 | No "Forgot password" anywhere; no home link on auth; Register can be disabled with no escape. |
| 4 | Consistency and Standards | 3 | 1 | 1 | Auth breaks the token system: `blue-600` vs `#0E71AE`, Inter vs Outfit, no dark mode, no chrome. |
| 5 | Error Prevention | 3 | 2 | 1 | Silent disabled submit (register); 6-char vs 12-char policy mismatch; no autofill; fabricated `age`/`sex`. |
| 6 | Recognition Rather Than Recall | 3 | 2 | 2 | Live password rules (good); "Client vs Workshop" unexplained at the decision point. |
| 7 | Flexibility and Efficiency | n/a | 1 | 1 | No `autoComplete` on any input — password managers and browser autofill cannot fill the form. |
| 8 | Aesthetic and Minimalist Design | 3 | 2 | 2 | Landing clean but category-generic; 2.86 MB hero image; auth has no visual tie to the landing. |
| 9 | Error Recovery | 3 | 2 | 2 | No `role="alert"`/`aria-live`/`aria-invalid`; error red ~3.7:1 on white. |
| 10 | Help and Documentation | n/a | 1 | 1 | No help, FAQ, support link, or recovery guidance beyond the password rule rows. |
| **Total** | | **23/32** | **17/40** | **15/40** | |

Bands: Landing 72% → **Good**. Login 43% → **Poor**. Register 38% → **Poor**. Combined 55/112 ≈ **49%, Poor**.

## Design Specificity Verdict

**The landing is category-interchangeable; the auth surface is a different product. This is two products stitched together.**

**LLM assessment** — `/` is a stock SaaS template, executed cleanly: badge → H1 → subhead → two CTAs → 3 checks → 6 feature cards → 2 audience cards → 3-step "how it works" → centered CTA → minimal footer. Swap "car"→"pet" and "workshop"→"salon" and `features.tsx` still reads true. The only automotive artifacts are one `car-chevrolet-tracker.png` and two invented fake-UI chips ("Next service / in 12 days", "Booking / Confirmed") that are not real product UI. No service categories (oil, brakes, alignment, timing belt), no mileage/plates/inspection idioms, no rating counts.

The one place the composition *is* product-specific — the two-sided `audiences.tsx` cards — is abandoned at the finish: `cta.tsx` reverts to "Ready to take care of your car?" with a single generic "Get started", dropping the workshop audience the page just spent a section building.

The landing and auth surfaces do not read as one product. Concretely: landing buttons are token-driven `bg-primary` = **#0E71AE**; auth submit buttons and focus rings are raw `bg-blue-600` / `focus:ring-blue-500` = **#2563EB / #3B82F6**. Landing headings use `font-display` (**Outfit**); auth headings use Inter. `auth-layout.tsx` hardcodes `#0E71AE` and `#FFFFFF` and contains **zero `dark:` classes** (verified), so a user who toggles dark on the landing and clicks "Log in" lands on a fully white page — and the mobile `BrandLogo`, whose wordmark is `text-slate-900 dark:text-white`, renders **invisible white-on-white** on that hardcoded panel. Auth has no header, footer, theme toggle, or link back to `/`.

**Deterministic scan** — the bundled detector ran across all seven targets and returned **zero findings** (`[]`, exit 0), verified with a passing positive control (synthetic tells fired) and per-file `--no-config` re-scans, so the empty result is a genuine clean scan, not a silent skip. No findings to group; no false positives; no ignore config masking results. **This is the honest nuance: a clean slop scan does not mean good design.** The problems here are structural (system split, missing flows, silent states), not the gradient-text/purple-palette patterns the detector hunts. Do not read `0 findings` as a pass.

**Visual overlays** — **not present.** No browser automation exists in this environment (no browser tool exposed, no chromium/playwright/puppeteer binary), so no live injection occurred and no overlay was created. Source-level evidence only.

## Overall Impression

The landing is a competent, well-tokenized SaaS template that could belong to almost any marketplace; the auth pages are an unstyled scaffold that abandons that system the instant the user commits. The single biggest opportunity is closing that identity gap and making the auth surface behave like the product it already is elsewhere — not adding more marketing sections.

## What's Working

1. **The two-audience split in `audiences.tsx`.** Side-by-side "For vehicle owners" / "For workshops" cards with distinct benefit bullets correctly model a two-sided marketplace — the one structural place the IA reflects *this* product. The idea is right; it just isn't carried to the CTA or signup.
2. **The landing's token discipline and dark mode.** `index.css` defines a coherent HSL token set; the landing consumes `bg-background`/`text-foreground`/`bg-primary` throughout, and `ThemeToggle` has a real state-aware `aria-label`. Because it is token-based, the landing holds up in dark mode — proving the system works where the auth pages collapse.
3. **Live password rules + post-signup handoff.** `signup-form.tsx` shows all four requirements with pass/fail icons before submit (and icons mean state isn't conveyed by color alone); after `register()` it routes to `/login` with a role-aware success message and a prefilled email. That is the one genuinely warm moment in the auth flow.

## Priority Issues

### [P0] The auth surfaces are a different product
- **What:** `/login` and `/signup` use `bg-blue-600` (#2563EB) and raw `text-gray-*`; the landing uses `bg-primary` (#0E71AE) and tokens. Auth headings are Inter, landing headings Outfit. `auth-layout.tsx` hardcodes `#0E71AE`/`#FFFFFF` and ignores the `dark` class entirely; the mobile `BrandLogo` wordmark is invisible white-on-white on that panel. Auth has no header, footer, theme toggle, or link back to `/`.
- **Why it matters:** The moment the user commits, the product visibly changes identity — reading as an unreleased or untrustworthy build at the exact point trust is required. Dark-mode users hit a broken-looking page and an invisible logo.
- **Fix:** Rebuild `auth-layout.tsx` and both forms on the shared tokens — `bg-primary text-primary-foreground`, `bg-background text-foreground`, `border-border`, `text-destructive`, `text-muted-foreground`; give auth headings `font-display`; make the panel dark-aware; fix the `BrandLogo` mobile contrast; wrap the logo in a `Link to="/"` and add a `ThemeToggle`.
- **Suggested command:** `/impeccable adapt`

### [P1] Register is disabled with no explanation
- **What:** `signup-form.tsx` sets `disabled={!isFormValid || isLoading}`. The only prerequisite not surfaced live on the Client path is `acceptTerms`, whose error is written only inside `handleSubmit`'s `setTouched` — which never runs, because the button is disabled. Miss the checkbox and the button is dead with no message.
- **Why it matters:** The primary conversion action becomes an unexplained wall. Users conclude the site is broken and leave.
- **Fix:** Stop gating submit on `disabled`. Keep the button enabled, validate on click, focus/scroll to the first error, and set `aria-invalid`. At minimum, surface the terms error live once any field is touched, plus a persistent hint near the button.
- **Suggested command:** `/impeccable clarify`

### [P1] Recovery is impossible and efficiency is broken
- **What:** No "Forgot password" path exists anywhere (grep-verified). No input in either form sets `autoComplete` (verified), so autofill and password managers cannot populate email/name/password/tel. `login-form.tsx` requires 6 chars while `signup-form.tsx` requires 12 + lower + upper + special — an inconsistent policy. Workshop signup hard-depends on `api.location.searchAddress` with no manual coordinate fallback.
- **Why it matters:** A returning user who cannot recall a password has no way back in. A strict 12-char special-character policy with no autofill is self-inflicted abandonment on the highest-intent surface, and the 6-vs-12 mismatch generates support tickets.
- **Fix:** Add "Forgot password?" beside the Password label → `/forgot-password`; add correct `autoComplete` to every field; align the policy; allow manual lat/long entry as a lookup fallback.
- **Suggested command:** `/impeccable harden`

### [P1] The landing has no trust proof and drops the two-sided promise at conversion
- **What:** Zero testimonials, ratings, counts, workshop logos, or real product screenshots (the hero chips are invented). `cta.tsx` addresses only car owners, collapsing both audiences into one generic "Get started" → `/signup`, and `/signup` has no role preselection, so "Register your workshop" lands on a form where the user must hunt for "Account type: Workshop".
- **Why it matters:** A marketplace's landing job is manufacturing trust in unknown workshops, and the workshop funnel's job is making supply-side onboarding obvious. The page builds neither, and the final CTA alienates the paying supply side.
- **Fix:** Add a proof band (workshop count, average rating, services completed, one named testimonial per side); give the hero a real product shot or a service-category strip; carry the audience split into the final CTA as two paths routing to `/signup?role=workshop` / `?role=client`, with `signup-form.tsx` reading the param to preset `form.role`.
- **Suggested command:** `/impeccable bolder` (proof/character) then `/impeccable layout` (dual-path CTA + role preset)

### [P2] Accessibility gaps across both auth forms
- **What:** `<label>` in `login-form.tsx` and the `Input` in `signup-form.tsx` are siblings of their inputs with no `htmlFor`/`id` (grep-verified: zero `htmlFor` in `src/components/auth`), so labels don't focus fields and AT association is broken. The `Eye`/`EyeOff` toggle buttons have no `aria-label` and no `aria-pressed` (verified: zero `aria-label` in the auth folder). Error containers and inline error `<p>`s have no `role="alert"`/`aria-live`; inputs lack `aria-invalid`/`aria-describedby`. Error red `#EF4444` ≈ 3.7:1 and `green-600` ≈ 3.3:1 on white both fail 4.5:1 for small text.
- **Why it matters:** A screen-reader or keyboard user cannot reliably identify fields, hear validation results, or operate the password toggle — the signup surface is effectively unusable for them.
- **Fix:** Wire every `<label htmlFor>` to an input `id`; add `aria-label`+`aria-pressed` to the toggles; add `role="alert"` to error regions and `aria-invalid`/`aria-describedby` to inputs; darken error text to a 4.5:1 red.
- **Suggested command:** `/impeccable harden`

## Persona Red Flags

**Jordan (first-timer — "Get started" as a vehicle owner):** Reads "Keep every vehicle on the road", then meets "Sign up to **Drive Pluss**" — a third spelling after the wordmark "DrivePluss" and footer "© DrivePluss". "Professional Email Address" with placeholder `jean.dupont@company.com` makes a personal-Gmail car owner think the form isn't for him. "Account type: Client / Workshop" doesn't match the landing's "vehicle owners / workshops". He is warned about a 12-char special-character password only after arriving, having been promised "No credit card required". Then he misses the Terms box and **Register is greyed out with no message**.

**Riley (stress tester — break both signup paths):** Kills the geocoder and finds the workshop path has **no manual coordinate fallback** — registration is impossible. Selects Workshop, doesn't click "Add workshop info", and hits a disabled Register whose explaining error "Add workshop information to continue" only appears after a blur/submit he cannot trigger. Notices `age: 25, sex: 'M'` are sent though never entered. Tab-navigates login: the eye toggle is an unlabeled button and the labels don't focus their fields. Toggles dark mode, opens `/login`, gets a blinding white page and an invisible mobile wordmark.

**Casey (distracted mobile — sign up one-handed):** `auth-layout.tsx` hides the entire left branding panel at `xs`, so she loses the only brand context. The workshop path is one long undifferentiated scroll with a `grid-cols-2` name row leaving tight tap targets. The primary "Register" is right-aligned and small (`flex justify-end`, `px-10`) instead of full-width — under her weakest thumb reach. With no `autoComplete`, she must hand-type a 12-char special-character password on a soft keyboard.

**Sam (accessibility-dependent — log in with a screen reader):** Form fields announce without names (no `htmlFor`/`id`); the password toggle has no accessible name or pressed state; validation banners are silent (no `aria-live`); error and success text fail 4.5:1 contrast.

**Mariana (vehicle owner, project-specific):** The landing promises "Never miss a service again" but no screen shows a vehicle, a service record, or a real dashboard — the hero chip is decorative. She can't see what she's signing up for, and after signup learns no pricing ("Book and pay securely online" with no cost shown).

**Carlos (workshop owner, project-specific):** "Register your workshop" goes to the same generic `/signup` with no role preselection. Selecting Workshop unveils a 9-field block plus a mandatory external geocode mid-form, behind an "Add workshop info" button that looks like a submit. The page's closing line — "Ready to take care of **your car**?" — isn't addressed to him at all, and no business reassurance (fees, payouts, Stripe split, client volume) appears before he's asked to register his business.

## Minor Observations

- **`login-image.jpg` is 2.86 MB**, loaded on every `/login` and `/signup` render, with no `width`/`height`/`srcset` — the heaviest asset on the site sits on the Operate surfaces where load speed matters most.
- **Brand spelled three ways:** "DrivePluss" (wordmark, footer) vs "Drive Plus" / "Drive Pluss" (auth headings).
- **Locale incoherence:** phone defaults to 🇧🇷 +55 with a Brazilian placeholder, name/email placeholders are French ("Dupont", "Jean"), workshop placeholder is "Drive Pluss Garage".
- **Terms/Privacy links are `href="#"`** in `signup-form.tsx` — the user must "read, understand and agree" to dead links before Register unlocks.
- **`index.html` requests ~25 Google font families** in one stylesheet while the app uses only Inter and Outfit — large dead weight on public pages.
- **`index.css` sets `body { font-family: Arial, sans-serif }`**, a latent override fighting both Tailwind `font-sans` and the MUI theme; it currently loses to `CssBaseline` but is a fragile floor that could surface Arial on auth.
- **Undeclared tokens:** `secondary-border`, `muted-border`, `accent-border`, `destructive-border` are referenced in `tailwind.config.ts` but never defined in `index.css`, so those variants resolve to nothing.
- **`type="submit"` is right-aligned** in both forms; a full-width primary action would strengthen hierarchy and mobile reach.
- **Landing nav is raw `<a href="#…">`** with no active-section highlight and no smooth scroll.
- **[P3] Workshop onboarding + fabricated data:** `signup-form.tsx` sends `age: 25, sex: 'M'` never collected from the user, and the "Add workshop info" control reads like a submit but only expands fields. Remove the invented demographics or collect them properly; restyle the reveal as an `aria-expanded`/chevron disclosure or auto-expand on Workshop; split workshop onboarding into a labelled second step. — `/impeccable onboard`
