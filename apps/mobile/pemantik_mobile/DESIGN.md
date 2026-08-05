---
name: Pemantik Design System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#43474e'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#456084'
  primary: '#001934'
  on-primary: '#ffffff'
  primary-container: '#102e50'
  on-primary-container: '#7c96be'
  inverse-primary: '#adc8f2'
  secondary: '#805600'
  on-secondary: '#ffffff'
  secondary-container: '#feba48'
  on-secondary-container: '#714b00'
  tertiary: '#3c0000'
  on-tertiary: '#ffffff'
  tertiary-container: '#630000'
  on-tertiary-container: '#fa6350'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d4e3ff'
  primary-fixed-dim: '#adc8f2'
  on-primary-fixed: '#001c39'
  on-primary-fixed-variant: '#2d486b'
  secondary-fixed: '#ffddb0'
  secondary-fixed-dim: '#feba48'
  on-secondary-fixed: '#281800'
  on-secondary-fixed-variant: '#614000'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4a8'
  on-tertiary-fixed: '#410000'
  on-tertiary-fixed-variant: '#8e130b'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Lora
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 60px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Lora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Lora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Lora
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Rubik
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Rubik
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Rubik
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Rubik
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Rubik
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 14px
  headline-lg-mobile:
    fontFamily: Lora
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  margin-mobile: 20px
  margin-desktop: 40px
  gutter: 16px
  stack-sm: 4px
  stack-md: 12px
  stack-lg: 24px
---

## Brand & Style
The design system for this platform centers on the "Clean, Simple, Elegant" narrative, specifically tailored for the Indonesian educational context. It bridges the gap between traditional academic authority and modern digital accessibility.

The aesthetic leans into **Modern Corporate with Tactile Depth**. It avoids the flatness of utility apps in favor of layered surfaces, using soft shadows and subtle gradients to create a sense of physical stacks—mirroring paper assessments or flashcards. The emotional response is one of "Guided Focus": reducing cognitive load for students while maintaining a premium, trustworthy environment for educators. High-quality whitespace and organic "Flame" motifs (4-8% opacity) provide a sense of warmth and energy without distracting from the core assessment tasks.

## Colors
The palette is rooted in a deep **Navy (#102E50)** to establish academic authority, complemented by **Gold (#F2AF3E)** for achievement and **Maroon (#A8281C)** for critical emphasis. 

- **Primary Navy:** Used for top navigation, primary headers, and deep-background surfaces.
- **Secondary Petrol & Orange:** Utilized for secondary actions and specific subject-matter coding (e.g., Literacy vs. Numeracy).
- **Gradients:** Use the "Flame" gradient exclusively for achievement states, progress bars, and high-impact calls to action.
- **Semantic States:** These utilize a "Soft Background + Deep Foreground" pairing to ensure high legibility and a calm UI, preventing "alert fatigue" during assessments.

## Typography
The system uses a pairing of **Lora** and **Rubik**. 

- **Lora (Serif):** Use for all editorial content, question stems, and major section headings. It provides a "literary" feel essential for reading assessments.
- **Rubik (Sans):** Use for UI controls, data entry, numerical values, and labels. Its slightly rounded terminals complement the large corner radii of the components.
- **Hierarchy:** Maintain a clear distinction by keeping Lora for "Content" and Rubik for "Interface."

## Layout & Spacing
This design system utilizes a **Fluid Grid** with fixed outer margins. 

- **Mobile:** 4-column grid with 20px margins. Heavy emphasis on vertical stacking and bottom-sheet expansion for inputs.
- **Desktop:** 12-column grid with 40px margins and a maximum content width of 1280px.
- **Offline-First Indicators:** The top-right corner of the persistent header is reserved for the "Sync Status" indicator.
- **Vertical Rhythm:** Spacing between question blocks should be consistent (stack-lg) to ensure clarity during assessments.

## Elevation & Depth
Hierarchy is established through **Tonal Layering** and **Soft Shadows**.

- **Level 0 (Background):** Neutral light grey or deep Navy.
- **Level 1 (Cards):** Pure white background with a very soft shadow (0px 4px 20px, 5% opacity Navy).
- **Level 2 (Floating/Active):** Slightly higher elevation for the currently active question or focused input (0px 8px 30px, 8% opacity Navy).
- **Bottom Sheets:** Use for secondary information or input selections on mobile to maintain context of the main screen. These should have a backdrop blur of 10px on the obscured content.

## Shapes
Shapes are friendly and highly rounded to appeal to a student demographic and reduce the "formality" of testing.

- **Standard Elements:** 16px radius for buttons and input fields.
- **Large Containers:** 24px radius for main assessment cards and bottom sheets.
- **Badges:** Fully pill-shaped (rounded-full) for achievement tags and status indicators.
- **Motifs:** Speech bubbles should use a 16px radius with a subtle 8px tail, reinforcing the literacy narrative.

## Components

- **Buttons:** 
  - *Primary:* Navy background, white text, 16px radius. 
  - *Secondary:* Gold background or Gold outline. 
  - *Action:* Large, tactile buttons for mobile (minimum 48px height).
- **Sync Status Indicators:** 
  - *Synced:* Green dot + Cloud icon (Rubik Label: "Tersinkron").
  - *Local:* Gold dot + Hourglass icon (Rubik Label: "Tersimpan Lokal").
  - *Failed:* Red dot + Warning icon (Rubik Label: "Gagal Sinkron").
- **Assessment Cards:** 
  - Use Lora for the question text.
  - Options should be large, selectable tiles with 16px radius.
  - Selected state: Petrol border (2px) with a subtle Petrol tint background (5% opacity).
- **Input Fields:** 
  - Soft grey background with a 1px border. 
  - Active state: 2px Navy border.
  - Error state: 1px Maroon border with Maroon helper text.
- **Achievement Badges:** 
  - Circular or shield-shaped with the "Flame" gradient.
  - Utilize 2px white "inner-glow" borders to create a glass-like effect.
- **Iconography:** 
  - Use 2px stroke width for all line icons. 
  - Round all stroke ends and joins to match the Rubik/Shape language.