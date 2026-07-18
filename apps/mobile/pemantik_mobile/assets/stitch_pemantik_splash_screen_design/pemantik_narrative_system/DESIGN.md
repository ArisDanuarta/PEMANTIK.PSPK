---
name: Pemantik Narrative System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#43474e'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#456084'
  primary: '#001934'
  on-primary: '#ffffff'
  primary-container: '#102e50'
  on-primary-container: '#7c96be'
  inverse-primary: '#adc8f2'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#3c0000'
  on-tertiary: '#ffffff'
  tertiary-container: '#630000'
  on-tertiary-container: '#fd614d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d4e3ff'
  primary-fixed-dim: '#adc8f2'
  on-primary-fixed: '#001c39'
  on-primary-fixed-variant: '#2d486b'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#ffdad4'
  tertiary-fixed-dim: '#ffb4a8'
  on-tertiary-fixed: '#410000'
  on-tertiary-fixed-variant: '#8f0f07'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Lora
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Lora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Lora
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
  title-md:
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
  label-md:
    fontFamily: Rubik
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  caption:
    fontFamily: Rubik
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system is built on the philosophy of **#BerpihakKepadaAnak** (Side with the Child). It balances professional academic assessment with a warm, storytelling atmosphere. The aesthetic is **Minimalist-Professional**, utilizing generous whitespace to reduce cognitive load for assessors while maintaining an air of authoritative elegance.

The emotional response should be one of "Structured Warmth"-feeling like a premium educational journal that is nonetheless accessible and child-centric. The visual narrative leverages subtle "ignition" metaphors (flame/sparks) to symbolize the sparking of a child's potential.

- **Primary Style:** Minimalism with an Editorial lean.
- **Visual Cues:** High-quality serif typography, soft transitions, and meaningful iconography.
- **Philosophy:** Clear hierarchies that prioritize the child's data and story over complex UI chrome.

## Colors

The palette is anchored in **Navy (#102E50)** to convey institutional trust and depth. **Yellow-Gold** is used strategically to highlight "moments of ignition" or progress, while **Maroon** serves as a sophisticated accent for critical data points or specific assessment categories.

- **Surface:** Pure white (#FFFFFF) for primary work areas to maintain a clean, "paper-like" feel.
- **Background:** Subtle off-white (#F8F9FA) for grouping secondary containers.
- **Accents:** Use Maroon sparingly for alerts or high-importance metrics. Use Gold for celebratory elements like completed milestones.

## Typography

The typography strategy creates a "Newsroom-meets-Classroom" feel. **Lora** (Serif) is reserved for storytelling elements, student names, and section headings to evoke elegance and respect for the child's journey. **Rubik** (Sans-serif) provides a friendly, highly legible contrast for data entry, labels, and functional interface components.

- **Hierarchy:** Large display titles in Lora should be used for assessment titles or welcome screens.
- **Readability:** Body text in Rubik should maintain a minimum size of 16px to ensure accessibility during active assessment sessions.
- **Labels:** Use Rubik Medium for all form labels and button text to maintain a modern, professional tone.

## Layout & Spacing

The layout follows a **Fluid Grid** model with generous inner margins to prevent content from feeling cramped. The design uses an 8px base unit for all spatial relationships.

- **Assessment View:** 12-column grid for desktop with wide gutters (24px) to allow for "chat bubble" assessment metaphors to sit comfortably.
- **Mobile:** Single column with 16px side margins. Horizontal swiping is encouraged for multi-step assessments.
- **White Space:** At least 40px of vertical space should exist between major assessment sections to help the user focus on one task at a time.

## Elevation & Depth

This design system uses **Tonal Layers** rather than heavy shadows to maintain a minimalist aesthetic. Depth is communicated through subtle contrast and border-radius changes.

- **Base Layer:** Pure white background for the main canvas.
- **Surface Layer:** Soft, light-gray backgrounds (#F1F3F5) for secondary tools or sidebars.
- **Overlays:** Cards use a very soft, high-diffusion shadow (0px 4px 20px rgba(16, 46, 80, 0.05)) to appear lifted without looking heavy.
- **Active State:** Elements being interacted with may gain a thin, 1px Navy border to signal focus.

## Shapes

The shape language is **Rounded**, favoring friendliness over sharp academic rigidity. 

- **Primary Radius:** 0.5rem (8px) for cards, input fields, and standard buttons.
- **Interactive Elements:** Buttons utilize the standard 8px radius to feel modern yet professional.
- **Narrative Elements:** Chat bubbles used for assessment prompts should have a larger 1.5rem (24px) radius on three corners to reinforce the friendly "metaphor" of dialogue.

## Components

### Buttons & Inputs
- **Primary Action:** Solid Navy background with White text (Rubik Medium). 
- **Secondary Action:** Ghost style with Navy border and text.
- **Input Fields:** Minimalist design with a 1px bottom-border or a light grey stroke; focus state shifts to a 2px Navy bottom-border.

### Specialized Icons
- **Literacy:** A stylized open book icon, using the Maroon accent for the bookmark.
- **Numeracy:** Geometric "a+b" blocks in Navy or Gold to represent foundational building blocks.
- **The "Pemantik" Motif:** A stylized spark or flame icon used as a progress indicator or "Complete" badge.

### Assessment Cards
- Cards feature a high-diffusion shadow and are used to group questions.
- Header of the card should use Lora for the question title.
- Incorporate "Chat Bubble" metaphors for prompts, where the assessor's instructions appear in a Navy-tinted bubble and the child's response area in a clear white space.

### Progress & Status
- Use the **Yellow-Gold** for progress bars to symbolize "light" and growth.
- Checkboxes and Radios use the Navy color for the selected state, ensuring high contrast and clarity.