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
    fontFamily: Noto Serif
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Noto Serif
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: Noto Serif
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Noto Serif
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Rubik
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Rubik
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Rubik
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  number-xl:
    fontFamily: Rubik
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: -0.04em
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
  margin-desktop: 40px
  margin-mobile: 20px
---

## Brand & Style

The design system is built on the philosophy of "Clean, Simple, Elegant," balancing the gravity of educational assessment with a warm, human-centric touch. The aesthetic direction is **Modern-Tactile**, utilizing layered surfaces, soft depth, and organic geometry to create an inviting environment for both students and administrators.

The visual narrative centers on "The Spark" (Pemantik)—represented through flame motifs and organic blob shapes that break the rigidity of traditional testing software. By mixing high-contrast Navy structural elements with warm Gold and Maroon accents, the UI achieves a sense of academic prestige that remains accessible and encouraging.

## Colors

This design system uses a sophisticated palette where **Navy (#102E50)** serves as the foundation for high-level structure, navigation, and primary text. **Gold (#F2AF3E)** is reserved for the student experience—guiding the eye toward active tasks and high-priority interactions. **Maroon (#A8281C)** provides a dignified accent for achievement states and secondary structural highlights.

For status indicators specifically related to data synchronization:
- **Green (#10B981):** All data is safely synced to the cloud.
- **Yellow (#F59E0B):** Data is saved locally but pending upload.
- **Red (#EF4444):** Sync failure requiring user intervention.

Use subtle Navy-to-Teal mesh gradients in headers and hero sections to provide visual depth and a sense of "The Spark" without distracting from the content.

## Typography

The typography system pairs the literary authority of **Noto Serif** (substitute for Lora) with the modern, friendly legibility of **Rubik**. 

- **Serif Headers:** Used for page titles, section headers, and important prompts to provide a warm, "book-like" feel that honors literacy.
- **Sans-serif Body/Labels:** Used for all assessment questions, instructions, data inputs, and UI labels. Rubik’s slightly rounded terminals ensure that even dense numeracy data feels approachable.
- **Numeracy:** Large numbers (scores, timers, question counts) should always use Rubik Bold to ensure maximum clarity.

## Layout & Spacing

This design system employs a **Fluid-Fixed Hybrid Grid**. Content is housed within a 12-column grid that scales fluidly until it reaches a maximum width of 1280px, at which point it centers.

- **Vertical Rhythm:** Built on an 8px baseline. All components (buttons, inputs) should have heights that are multiples of 8.
- **Content Density:** In student assessment views, maximize whitespace to reduce cognitive load. In administrative dashboards, density can be increased, reducing margins and gutters to 16px to allow for data-rich tables.
- **Mobile Reflow:** On screens smaller than 768px, the 12-column grid collapses to a 4-column grid with 20px side margins.

## Elevation & Depth

Visual hierarchy is achieved through a **Layered Surface** approach rather than harsh lines. 

- **Level 0 (Background):** Soft off-white or very light gray (#F8FAFC).
- **Level 1 (Cards/Containers):** Pure white surfaces with a "Floating" shadow (0px 10px 30px rgba(16, 46, 80, 0.08)). These should feel light and airy.
- **Level 2 (Modals/Popovers):** Higher elevation with a more pronounced, diffused shadow (0px 20px 50px rgba(16, 46, 80, 0.15)).
- **Subtle Depth:** Use very soft gradients (e.g., White to #F1F5F9) on large surfaces to mimic the slight curvature of physical paper or high-quality screens.

## Shapes

The shape language differentiates the user's context through corner radii:

- **Professional/Admin Context:** Uses `rounded-md` (8px) for buttons, data tables, and input fields to maintain a focused, efficient atmosphere.
- **Student/Learning Context:** Uses `rounded-xl` (16px) or `rounded-2xl` (24px) for cards, progress bars, and high-level containers to create a soft, playful, and safe environment.
- **Decorative Elements:** Use organic, asymmetrical "blobs" and speech-bubble motifs behind text or in the background of headers to break the linear grid and add a human touch.

## Components

### Buttons
- **Primary:** Solid Navy with white text for structural actions. Rounded 8px for admin, 24px for student.
- **Highlight (Secondary):** Solid Gold with Navy text. Used exclusively for "Start Test," "Submit," or "Next" in student views.
- **Tertiary:** Outline Maroon with 2px stroke for secondary actions (e.g., "Save Draft," "View Details").

### Cards
- White background, no border, soft Level 1 shadow. 
- In student views, include a 4px top-border accent in Teal or Gold to differentiate subjects.

### Input Fields
- 2px outline in Light Navy (#CBD5E1). On focus, the border transitions to Primary Navy with a 4px soft outer glow.

### Sync Status Indicator
- A small pill-shaped chip containing a 6px dot (status color) and text. Background should be a very pale version of the status color (e.g., pale green background for a green dot).

### Icons
- 24px grid, consistent 1.5px stroke weight. Avoid solid fills unless used for an "Active" state in navigation.

### Progress Bars
- Large, 12px height with fully rounded (pill) ends. Use a background of Light Gold and a fill of primary Gold for active progress.