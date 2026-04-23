# Font Bolder Product Roadmap

## Goal

Build Font Bolder from a simple font-weight enhancer into a focused readability and accessibility extension for users who struggle with light, blurry, or low-contrast text on the web.

## Product Principles

- Keep the core experience simple: open, adjust, readable.
- Prioritize real reading comfort over flashy controls.
- Avoid breaking site layout, icons, code blocks, and interactive UI.
- Ship features that clearly improve accessibility for weak-vision users first.

## v2.1

### Priority

High

### Focus

Reduce friction and improve day-to-day usefulness for the widest group of users.

### Features

1. Per-site settings
   Save different boldness and darkness preferences for different domains.
2. Quick presets
   Add presets such as `Comfort Reading`, `High Contrast`, and `Heavy Bold`.
3. Temporary boost mode
   Let users apply stronger styling only for the current tab or session.
4. Better popup preview
   Show a small live preview sentence inside the popup while sliders move.

### Why first

These features make the extension immediately more practical without changing the core architecture too much.

## v2.2

### Priority

Medium

### Focus

Improve compatibility and reduce unwanted styling side effects on complex websites.

### Features

1. Smarter targeting modes
   Support options like `Body text only`, `Body + headings`, and `All text`.
2. Exclusion rules
   Skip code blocks, icon fonts, math formulas, buttons, and navigation UI when needed.
3. Domain exceptions list
   Allow users to disable the extension on selected sites.
4. Keyboard shortcuts
   Add a shortcut to toggle the extension or cycle through presets.

### Why second

This phase improves trust and compatibility, which matters once more people start using the extension on diverse sites.

## v3.0

### Priority

Strategic

### Focus

Evolve Font Bolder into a more intelligent reading accessibility product.

### Features

1. Smart readability mode
   Detect weak contrast, very light text, or overly thin fonts and auto-adjust intensity.
2. Reading enhancement pack
   Add optional line height, letter spacing, paragraph spacing, and font size improvements.
3. Guided onboarding
   Offer first-run setup with language, reading profile, and recommended preset.
4. Accessibility profile system
   Support saved profiles for different needs, such as mild blur reduction or high-contrast reading.

### Why third

These ideas have the biggest product upside, but they also need more testing, heuristics, and UX refinement to avoid over-correcting pages.

## Success Metrics

- More repeat usage per user
- Fewer sites where users disable the extension
- Higher preset usage and lower manual tuning friction
- Better store reviews mentioning readability and comfort
