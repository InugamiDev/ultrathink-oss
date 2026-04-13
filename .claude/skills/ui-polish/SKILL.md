---
name: ui-polish
description: "Unified UI polish toolkit — 18 iteration passes for refining interfaces. Routes between: audit (comprehensive quality check), polish (final alignment/spacing), adapt (responsive scaling), animate (motion design), bolder (amplify contrast), clarify (microcopy), colorize (semantic color), critique (honest eval), delight (personality), distill (simplification), extract (pattern extraction), frontend-design (distinctive aesthetics), harden (error/loading/empty states), normalize (design system consistency), onboard (first-run UX), optimize (perceived performance), quieter (reduce noise), teach-impeccable (one-time setup). Use when iterating on finished UI."
layer: hub
category: design
triggers: ["adapt design", "add animations", "add color", "add delight", "add personality", "amplify design", "animate ui", "before shipping", "better microcopy", "build a form", "build dashboard", "build page", "build ui", "clarify copy", "color palette", "color scheme", "colorize design", "component library from ui", "configure design skills", "create a dashboard", "create form", "create interface", "create page", "critique design", "cross-device design", "design a card", "design audit", "design component", "design consistency", "design feedback", "design layout", "design screen", "design tokens", "distill ui", "edge case design", "empty state copy", "empty state onboard", "empty states", "error states", "evaluate ui", "extract components", "extract patterns", "final pass", "first run experience", "frontend design", "harden ui", "improve error messages", "inconsistent ui", "joyful ui", "less boring ui", "less is more", "less noisy ui", "loading states", "make a page", "make bolder", "make fun", "make responsive", "match design system", "micro animations", "minimal design", "more contrast", "motion to ui", "normalize design", "not generic", "onboarding design", "optimistic ui", "optimize ui performance", "perceived performance", "pixel perfect", "polish ui", "qa design", "quieter design", "reduce visual weight", "remove clutter", "responsive design fix", "review design quality", "robust ui", "setup impeccable", "simplify design", "simplify visually", "skeleton screens", "small details", "standardize ui", "stronger visual", "teach design system", "too much going on", "ui audit", "ui feels slow", "user onboarding", "ux audit", "ux writing", "welcome flow", "what's wrong with design"]
---

# ui-polish

Unified UI polish toolkit — 18 iteration passes for refining interfaces. Routes between: audit (comprehensive quality check), polish (final alignment/spacing), adapt (responsive scaling), animate (motion design), bolder (amplify contrast), clarify (microcopy), colorize (semantic color), critique (honest eval), delight (personality), distill (simplification), extract (pattern extraction), frontend-design (distinctive aesthetics), harden (error/loading/empty states), normalize (design system consistency), onboard (first-run UX), optimize (perceived performance), quieter (reduce noise), teach-impeccable (one-time setup). Use when iterating on finished UI.


## Absorbs

- `impeccable-adapt`
- `impeccable-animate`
- `impeccable-audit`
- `impeccable-bolder`
- `impeccable-clarify`
- `impeccable-colorize`
- `impeccable-critique`
- `impeccable-delight`
- `impeccable-distill`
- `impeccable-extract`
- `impeccable-frontend-design`
- `impeccable-harden`
- `impeccable-normalize`
- `impeccable-onboard`
- `impeccable-optimize`
- `impeccable-polish`
- `impeccable-quieter`
- `impeccable-teach-impeccable`


---

## From `adapt`

> Adapt designs to work across different screen sizes, devices, contexts, or platforms. Ensures consistent experience across varied environments.

Adapt existing designs to work effectively across different contexts - different screen sizes, devices, platforms, or use cases.

## Assess Adaptation Challenge

Understand what needs adaptation and why:

1. **Identify the source context**:
   - What was it designed for originally? (Desktop web? Mobile app?)
   - What assumptions were made? (Large screen? Mouse input? Fast connection?)
   - What works well in current context?

2. **Understand target context**:
   - **Device**: Mobile, tablet, desktop, TV, watch, print?
   - **Input method**: Touch, mouse, keyboard, voice, gamepad?
   - **Screen constraints**: Size, resolution, orientation?
   - **Connection**: Fast wifi, slow 3G, offline?
   - **Usage context**: On-the-go vs desk, quick glance vs focused reading?
   - **User expectations**: What do users expect on this platform?

3. **Identify adaptation challenges**:
   - What won't fit? (Content, navigation, features)
   - What won't work? (Hover states on touch, tiny touch targets)
   - What's inappropriate? (Desktop patterns on mobile, mobile patterns on desktop)

**CRITICAL**: Adaptation is not just scaling - it's rethinking the experience for the new context.

## Plan Adaptation Strategy

Create context-appropriate strategy:

### Mobile Adaptation (Desktop → Mobile)

**Layout Strategy**:
- Single column instead of multi-column
- Vertical stacking instead of side-by-side
- Full-width components instead of fixed widths
- Bottom navigation instead of top/side navigation

**Interaction Strategy**:
- Touch targets 44x44px minimum (not hover-dependent)
- Swipe gestures where appropriate (lists, carousels)
- Bottom sheets instead of dropdowns
- Thumbs-first design (controls within thumb reach)
- Larger tap areas with more spacing

**Content Strategy**:
- Progressive disclosure (don't show everything at once)
- Prioritize primary content (secondary content in tabs/accordions)
- Shorter text (more concise)
- Larger text (16px minimum)

**Navigation Strategy**:
- Hamburger menu or bottom navigation
- Reduce navigation complexity
- Sticky headers for context
- Back button in navigation flow

### Tablet Adaptation (Hybrid Approach)

**Layout Strategy**:
- Two-column layouts (not single or three-column)
- Side panels for secondary content
- Master-detail views (list + detail)
- Adaptive based on orientation (portrait vs landscape)

**Interaction Strategy**:
- Support both touch and pointer
- Touch targets 44x44px but allow denser layouts than phone
- Side navigation drawers
- Multi-column forms where appropriate

### Desktop Adaptation (Mobile → Desktop)

**Layout Strategy**:
- Multi-column layouts (use horizontal space)
- Side navigation always visible
- Multiple information panels simultaneously
- Fixed widths with max-width constraints (don't stretch to 4K)

**Interaction Strategy**:
- Hover states for additional information
- Keyboard shortcuts
- Right-click context menus
- Drag and drop where helpful
- Multi-select with Shift/Cmd

**Content Strategy**:
- Show more information upfront (less progressive disclosure)
- Data tables with many columns
- Richer visualizations
- More detailed descriptions

### Print Adaptation (Screen → Print)

**Layout Strategy**:
- Page breaks at logical points
- Remove navigation, footer, interactive elements
- Black and white (or limited color)
- Proper margins for binding

**Content Strategy**:
- Expand shortened content (show full URLs, hidden sections)
- Add page numbers, headers, footers
- Include metadata (print date, page title)
- Convert charts to print-friendly versions

### Email Adaptation (Web → Email)

**Layout Strategy**:
- Narrow width (600px max)
- Single column only
- Inline CSS (no external stylesheets)
- Table-based layouts (for email client compatibility)

**Interaction Strategy**:
- Large, obvious CTAs (buttons not text links)
- No hover states (not reliable)
- Deep links to web app for complex interactions

## Implement Adaptations

Apply changes systematically:

### Responsive Breakpoints

Choose appropriate breakpoints:
- Mobile: 320px-767px
- Tablet: 768px-1023px
- Desktop: 1024px+
- Or content-driven breakpoints (where design breaks)

### Layout Adaptation Techniques

- **CSS Grid/Flexbox**: Reflow layouts automatically
- **Container Queries**: Adapt based on container, not viewport
- **`clamp()`**: Fluid sizing between min and max
- **Media queries**: Different styles for different contexts
- **Display properties**: Show/hide elements per context

### Touch Adaptation

- Increase touch target sizes (44x44px minimum)
- Add more spacing between interactive elements
- Remove hover-dependent interactions
- Add touch feedback (ripples, highlights)
- Consider thumb zones (easier to reach bottom than top)

### Content Adaptation

- Use `display: none` sparingly (still downloads)
- Progressive enhancement (core content first, enhancements on larger screens)
- Lazy loading for off-screen content
- Responsive images (`srcset`, `picture` element)

### Navigation Adaptation

- Transform complex nav to hamburger/drawer on mobile
- Bottom nav bar for mobile apps
- Persistent side navigation on desktop
- Breadcrumbs on smaller screens for context

**IMPORTANT**: Test on real devices, not just browser DevTools. Device emulation is helpful but not perfect.

**NEVER**:
- Hide core functionality on mobile (if it matters, make it work)
- Assume desktop = powerful device (consider accessibility, older machines)
- Use different information architecture across contexts (confusing)
- Break user expectations for platform (mobile users expect mobile patterns)
- Forget landscape orientation on mobile/tablet
- Use generic breakpoints blindly (use content-driven breakpoints)
- Ignore touch on desktop (many desktop devices have touch)

## Verify Adaptations

Test thoroughly across contexts:

- **Real devices**: Test on actual phones, tablets, desktops
- **Different orientations**: Portrait and landscape
- **Different browsers**: Safari, Chrome, Firefox, Edge
- **Different OS**: iOS, Android, Windows, macOS
- **Different input methods**: Touch, mouse, keyboard
- **Edge cases**: Very small screens (320px), very large screens (4K)
- **Slow connections**: Test on throttled network

Remember: You're a cross-platform design expert. Make experiences that feel native to each context while maintaining brand and functionality consistency. Adapt intentionally, test thoroughly.


---

## From `animate`

> Review a feature and enhance it with purposeful animations, micro-interactions, and motion effects that improve usability and delight.

Analyze a feature and strategically add animations and micro-interactions that enhance understanding, provide feedback, and create delight.

## MANDATORY PREPARATION

### Context Gathering (Do This First)

You cannot do a great job without having necessary context, such as target audience (critical), desired use-cases (critical), brand personality/tone (playful vs serious, energetic vs calm), and performance constraints.

Attempt to gather these from the current thread or codebase.

1. If you don't find *exact* information and have to infer from existing design and functionality, you MUST STOP and STOP and call the AskUserQuestionTool to clarify. whether you got it right.
2. Otherwise, if you can't fully infer or your level of confidence is medium or lower, you MUST STOP and call the AskUserQuestionTool to clarify. clarifying questions first to complete your context.

Do NOT proceed until you have answers. Guessing leads to inappropriate or excessive animation.

### Use frontend-design skill

Use the frontend-design skill for design principles and anti-patterns. Do NOT proceed until it has executed and you know all DO's and DON'Ts.

---

## Assess Animation Opportunities

Analyze where motion would improve the experience:

1. **Identify static areas**:
   - **Missing feedback**: Actions without visual acknowledgment (button clicks, form submission, etc.)
   - **Jarring transitions**: Instant state changes that feel abrupt (show/hide, page loads, route changes)
   - **Unclear relationships**: Spatial or hierarchical relationships that aren't obvious
   - **Lack of delight**: Functional but joyless interactions
   - **Missed guidance**: Opportunities to direct attention or explain behavior

2. **Understand the context**:
   - What's the personality? (Playful vs serious, energetic vs calm)
   - What's the performance budget? (Mobile-first? Complex page?)
   - Who's the audience? (Motion-sensitive users? Power users who want speed?)
   - What matters most? (One hero animation vs many micro-interactions?)

If any of these are unclear from the codebase, STOP and call the AskUserQuestionTool to clarify.

**CRITICAL**: Respect `prefers-reduced-motion`. Always provide non-animated alternatives for users who need them.

## Plan Animation Strategy

Create a purposeful animation plan:

- **Hero moment**: What's the ONE signature animation? (Page load? Hero section? Key interaction?)
- **Feedback layer**: Which interactions need acknowledgment?
- **Transition layer**: Which state changes need smoothing?
- **Delight layer**: Where can we surprise and delight?

**IMPORTANT**: One well-orchestrated experience beats scattered animations everywhere. Focus on high-impact moments.

## Implement Animations

Add motion systematically across these categories:

### Entrance Animations
- **Page load choreography**: Stagger element reveals (100-150ms delays), fade + slide combinations
- **Hero section**: Dramatic entrance for primary content (scale, parallax, or creative effects)
- **Content reveals**: Scroll-triggered animations using intersection observer
- **Modal/drawer entry**: Smooth slide + fade, backdrop fade, focus management

### Micro-interactions
- **Button feedback**:
  - Hover: Subtle scale (1.02-1.05), color shift, shadow increase
  - Click: Quick scale down then up (0.95 → 1), ripple effect
  - Loading: Spinner or pulse state
- **Form interactions**:
  - Input focus: Border color transition, slight scale or glow
  - Validation: Shake on error, check mark on success, smooth color transitions
- **Toggle switches**: Smooth slide + color transition (200-300ms)
- **Checkboxes/radio**: Check mark animation, ripple effect
- **Like/favorite**: Scale + rotation, particle effects, color transition

### State Transitions
- **Show/hide**: Fade + slide (not instant), appropriate timing (200-300ms)
- **Expand/collapse**: Height transition with overflow handling, icon rotation
- **Loading states**: Skeleton screen fades, spinner animations, progress bars
- **Success/error**: Color transitions, icon animations, gentle scale pulse
- **Enable/disable**: Opacity transitions, cursor changes

### Navigation & Flow
- **Page transitions**: Crossfade between routes, shared element transitions
- **Tab switching**: Slide indicator, content fade/slide
- **Carousel/slider**: Smooth transforms, snap points, momentum
- **Scroll effects**: Parallax layers, sticky headers with state changes, scroll progress indicators

### Feedback & Guidance
- **Hover hints**: Tooltip fade-ins, cursor changes, element highlights
- **Drag & drop**: Lift effect (shadow + scale), drop zone highlights, smooth repositioning
- **Copy/paste**: Brief highlight flash on paste, "copied" confirmation
- **Focus flow**: Highlight path through form or workflow

### Delight Moments
- **Empty states**: Subtle floating animations on illustrations
- **Completed actions**: Confetti, check mark flourish, success celebrations
- **Easter eggs**: Hidden interactions for discovery
- **Contextual animation**: Weather effects, time-of-day themes, seasonal touches

## Technical Implementation

Use appropriate techniques for each animation:

### Timing & Easing

**Durations by purpose:**
- **100-150ms**: Instant feedback (button press, toggle)
- **200-300ms**: State changes (hover, menu open)
- **300-500ms**: Layout changes (accordion, modal)
- **500-800ms**: Entrance animations (page load)

**Easing curves (use these, not CSS defaults):**
```css
/* Recommended - natural deceleration */
--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);    /* Smooth, refined */
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);   /* Slightly snappier */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);     /* Confident, decisive */

/* AVOID - feel dated and tacky */
/* bounce: cubic-bezier(0.34, 1.56, 0.64, 1); */
/* elastic: cubic-bezier(0.68, -0.6, 0.32, 1.6); */
```

**Exit animations are faster than entrances.** Use ~75% of enter duration.

### CSS Animations
```css
/* Prefer for simple, declarative animations */
- transitions for state changes
- @keyframes for complex sequences
- transform + opacity only (GPU-accelerated)
```

### JavaScript Animation
```javascript
/* Use for complex, interactive animations */
- Web Animations API for programmatic control
- Framer Motion for React
- GSAP for complex sequences
```

### Performance
- **GPU acceleration**: Use `transform` and `opacity`, avoid layout properties
- **will-change**: Add sparingly for known expensive animations
- **Reduce paint**: Minimize repaints, use `contain` where appropriate
- **Monitor FPS**: Ensure 60fps on target devices

### Accessibility
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**NEVER**:
- Use bounce or elastic easing curves—they feel dated and draw attention to the animation itself
- Animate layout properties (width, height, top, left)—use transform instead
- Use durations over 500ms for feedback—it feels laggy
- Animate without purpose—every animation needs a reason
- Ignore `prefers-reduced-motion`—this is an accessibility violation
- Animate everything—animation fatigue makes interfaces feel exhausting
- Block interaction during animations unless intentional

## Verify Quality

Test animations thoroughly:

- **Smooth at 60fps**: No jank on target devices
- **Feels natural**: Easing curves feel organic, not robotic
- **Appropriate timing**: Not too fast (jarring) or too slow (laggy)
- **Reduced motion works**: Animations disabled or simplified appropriately
- **Doesn't block**: Users can interact during/after animations
- **Adds value**: Makes interface clearer or more delightful

Remember: Motion should enhance understanding and provide feedback, not just add decoration. Animate with purpose, respect performance constraints, and always consider accessibility. Great animation is invisible - it just makes everything feel right.


---

## From `audit`

> Perform comprehensive audit of interface quality across accessibility, performance, theming, and responsive design. Generates detailed report of issues with severity ratings and recommendations.

Run systematic quality checks and generate a comprehensive audit report with prioritized issues and actionable recommendations. Don't fix issues - document them for other commands to address.

**First**: Use the frontend-design skill for design principles and anti-patterns.

## Diagnostic Scan

Run comprehensive checks across multiple dimensions:

1. **Accessibility (A11y)** - Check for:
   - **Contrast issues**: Text contrast ratios < 4.5:1 (or 7:1 for AAA)
   - **Missing ARIA**: Interactive elements without proper roles, labels, or states
   - **Keyboard navigation**: Missing focus indicators, illogical tab order, keyboard traps
   - **Semantic HTML**: Improper heading hierarchy, missing landmarks, divs instead of buttons
   - **Alt text**: Missing or poor image descriptions
   - **Form issues**: Inputs without labels, poor error messaging, missing required indicators

2. **Performance** - Check for:
   - **Layout thrashing**: Reading/writing layout properties in loops
   - **Expensive animations**: Animating layout properties (width, height, top, left) instead of transform/opacity
   - **Missing optimization**: Images without lazy loading, unoptimized assets, missing will-change
   - **Bundle size**: Unnecessary imports, unused dependencies
   - **Render performance**: Unnecessary re-renders, missing memoization

3. **Theming** - Check for:
   - **Hard-coded colors**: Colors not using design tokens
   - **Broken dark mode**: Missing dark mode variants, poor contrast in dark theme
   - **Inconsistent tokens**: Using wrong tokens, mixing token types
   - **Theme switching issues**: Values that don't update on theme change

4. **Responsive Design** - Check for:
   - **Fixed widths**: Hard-coded widths that break on mobile
   - **Touch targets**: Interactive elements < 44x44px
   - **Horizontal scroll**: Content overflow on narrow viewports
   - **Text scaling**: Layouts that break when text size increases
   - **Missing breakpoints**: No mobile/tablet variants

5. **Anti-Patterns (CRITICAL)** - Check against ALL the **DON'T** guidelines in the frontend-design skill. Look for AI slop tells (AI color palette, gradient text, glassmorphism, hero metrics, card grids, generic fonts) and general design anti-patterns (gray on color, nested cards, bounce easing, redundant copy).

**CRITICAL**: This is an audit, not a fix. Document issues thoroughly with clear explanations of impact. Use other commands (normalize, optimize, harden, etc.) to fix issues after audit.

## Generate Comprehensive Report

Create a detailed audit report with the following structure:

### Anti-Patterns Verdict
**Start here.** Pass/fail: Does this look AI-generated? List specific tells from the skill's Anti-Patterns section. Be brutally honest.

### Executive Summary
- Total issues found (count by severity)
- Most critical issues (top 3-5)
- Overall quality score (if applicable)
- Recommended next steps

### Detailed Findings by Severity

For each issue, document:
- **Location**: Where the issue occurs (component, file, line)
- **Severity**: Critical / High / Medium / Low
- **Category**: Accessibility / Performance / Theming / Responsive
- **Description**: What the issue is
- **Impact**: How it affects users
- **WCAG/Standard**: Which standard it violates (if applicable)
- **Recommendation**: How to fix it
- **Suggested command**: Which command to use (prefer: /animate, /quieter, /optimize, /adapt, /clarify, /distill, /delight, /onboard, /normalize, /audit, /harden, /polish, /extract, /bolder, /critique, /colorize — or other installed skills you're sure exist)

#### Critical Issues
[Issues that block core functionality or violate WCAG A]

#### High-Severity Issues  
[Significant usability/accessibility impact, WCAG AA violations]

#### Medium-Severity Issues
[Quality issues, WCAG AAA violations, performance concerns]

#### Low-Severity Issues
[Minor inconsistencies, optimization opportunities]

### Patterns & Systemic Issues

Identify recurring problems:
- "Hard-coded colors appear in 15+ components, should use design tokens"
- "Touch targets consistently too small (<44px) throughout mobile experience"
- "Missing focus indicators on all custom interactive components"

### Positive Findings

Note what's working well:
- Good practices to maintain
- Exemplary implementations to replicate elsewhere

### Recommendations by Priority

Create actionable plan:
1. **Immediate**: Critical blockers to fix first
2. **Short-term**: High-severity issues (this sprint)
3. **Medium-term**: Quality improvements (next sprint)
4. **Long-term**: Nice-to-haves and optimizations

### Suggested Commands for Fixes

Map issues to available commands. Prefer these: /animate, /quieter, /optimize, /adapt, /clarify, /distill, /delight, /onboard, /normalize, /audit, /harden, /polish, /extract, /bolder, /critique, /colorize. You may also suggest other installed skills you're sure exist, but never invent commands.

Examples:
- "Use `/normalize` to align with design system (addresses N theming issues)"
- "Use `/optimize` to improve performance (addresses N performance issues)"
- "Use `/harden` to improve resilience (addresses N edge cases)"

**IMPORTANT**: Be thorough but actionable. Too many low-priority issues creates noise. Focus on what actually matters.

**NEVER**:
- Report issues without explaining impact (why does this matter?)
- Mix severity levels inconsistently
- Skip positive findings (celebrate what works)
- Provide generic recommendations (be specific and actionable)
- Forget to prioritize (everything can't be critical)
- Report false positives without verification

Remember: You're a quality auditor with exceptional attention to detail. Document systematically, prioritize ruthlessly, and provide clear paths to improvement. A good audit makes fixing easy.


---

## From `bolder`

> Amplify safe or boring designs to make them more visually interesting and stimulating. Increases impact while maintaining usability.

Increase visual impact and personality in designs that are too safe, generic, or visually underwhelming, creating more engaging and memorable experiences.

## MANDATORY PREPARATION

### Context Gathering (Do This First)

You cannot do a great job without having necessary context, such as target audience (critical), desired use-cases (critical), brand personality/tone, and everything else that a great human designer would need as well.

Attempt to gather these from the current thread or codebase.

1. If you don't find *exact* information and have to infer from existing design and functionality, you MUST STOP and STOP and call the AskUserQuestionTool to clarify. whether you got it right.
2. Otherwise, if you can't fully infer or your level of confidence is medium or lower, you MUST STOP and call the AskUserQuestionTool to clarify. clarifying questions first to complete your context.

Do NOT proceed until you have answers. Guessing leads to generic AI slop.

### Use frontend-design skill

Use the frontend-design skill for design principles and anti-patterns. Do NOT proceed until it has executed and you know all DO's and DON'Ts.

---

## Assess Current State

Analyze what makes the design feel too safe or boring:

1. **Identify weakness sources**:
   - **Generic choices**: System fonts, basic colors, standard layouts
   - **Timid scale**: Everything is medium-sized with no drama
   - **Low contrast**: Everything has similar visual weight
   - **Static**: No motion, no energy, no life
   - **Predictable**: Standard patterns with no surprises
   - **Flat hierarchy**: Nothing stands out or commands attention

2. **Understand the context**:
   - What's the brand personality? (How far can we push?)
   - What's the purpose? (Marketing can be bolder than financial dashboards)
   - Who's the audience? (What will resonate?)
   - What are the constraints? (Brand guidelines, accessibility, performance)

If any of these are unclear from the codebase, STOP and call the AskUserQuestionTool to clarify.

**CRITICAL**: "Bolder" doesn't mean chaotic or garish. It means distinctive, memorable, and confident. Think intentional drama, not random chaos.

**WARNING - AI SLOP TRAP**: When making things "bolder," AI defaults to the same tired tricks: cyan/purple gradients, glassmorphism, neon accents on dark backgrounds, gradient text on metrics. These are the OPPOSITE of bold—they're generic. Review ALL the DON'T guidelines in the frontend-design skill before proceeding. Bold means distinctive, not "more effects."

## Plan Amplification

Create a strategy to increase impact while maintaining coherence:

- **Focal point**: What should be the hero moment? (Pick ONE, make it amazing)
- **Personality direction**: Maximalist chaos? Elegant drama? Playful energy? Dark moody? Choose a lane.
- **Risk budget**: How experimental can we be? Push boundaries within constraints.
- **Hierarchy amplification**: Make big things BIGGER, small things smaller (increase contrast)

**IMPORTANT**: Bold design must still be usable. Impact without function is just decoration.

## Amplify the Design

Systematically increase impact across these dimensions:

### Typography Amplification
- **Replace generic fonts**: Swap system fonts for distinctive choices (see frontend-design skill for inspiration)
- **Extreme scale**: Create dramatic size jumps (3x-5x differences, not 1.5x)
- **Weight contrast**: Pair 900 weights with 200 weights, not 600 with 400
- **Unexpected choices**: Variable fonts, display fonts for headlines, condensed/extended widths, monospace as intentional accent (not as lazy "dev tool" default)

### Color Intensification
- **Increase saturation**: Shift to more vibrant, energetic colors (but not neon)
- **Bold palette**: Introduce unexpected color combinations—avoid the purple-blue gradient AI slop
- **Dominant color strategy**: Let one bold color own 60% of the design
- **Sharp accents**: High-contrast accent colors that pop
- **Tinted neutrals**: Replace pure grays with tinted grays that harmonize with your palette
- **Rich gradients**: Intentional multi-stop gradients (not generic purple-to-blue)

### Spatial Drama
- **Extreme scale jumps**: Make important elements 3-5x larger than surroundings
- **Break the grid**: Let hero elements escape containers and cross boundaries
- **Asymmetric layouts**: Replace centered, balanced layouts with tension-filled asymmetry
- **Generous space**: Use white space dramatically (100-200px gaps, not 20-40px)
- **Overlap**: Layer elements intentionally for depth

### Visual Effects
- **Dramatic shadows**: Large, soft shadows for elevation (but not generic drop shadows on rounded rectangles)
- **Background treatments**: Mesh patterns, noise textures, geometric patterns, intentional gradients (not purple-to-blue)
- **Texture & depth**: Grain, halftone, duotone, layered elements—NOT glassmorphism (it's overused AI slop)
- **Borders & frames**: Thick borders, decorative frames, custom shapes (not rounded rectangles with colored border on one side)
- **Custom elements**: Illustrative elements, custom icons, decorative details that reinforce brand

### Motion & Animation
- **Entrance choreography**: Staggered, dramatic page load animations with 50-100ms delays
- **Scroll effects**: Parallax, reveal animations, scroll-triggered sequences
- **Micro-interactions**: Satisfying hover effects, click feedback, state changes
- **Transitions**: Smooth, noticeable transitions using ease-out-quart/quint/expo (not bounce or elastic—they cheapen the effect)

### Composition Boldness
- **Hero moments**: Create clear focal points with dramatic treatment
- **Diagonal flows**: Escape horizontal/vertical rigidity with diagonal arrangements
- **Full-bleed elements**: Use full viewport width/height for impact
- **Unexpected proportions**: Golden ratio? Throw it out. Try 70/30, 80/20 splits

**NEVER**:
- Add effects randomly without purpose (chaos ≠ bold)
- Sacrifice readability for aesthetics (body text must be readable)
- Make everything bold (then nothing is bold - need contrast)
- Ignore accessibility (bold design must still meet WCAG standards)
- Overwhelm with motion (animation fatigue is real)
- Copy trendy aesthetics blindly (bold means distinctive, not derivative)

## Verify Quality

Ensure amplification maintains usability and coherence:

- **NOT AI slop**: Does this look like every other AI-generated "bold" design? If yes, start over.
- **Still functional**: Can users accomplish tasks without distraction?
- **Coherent**: Does everything feel intentional and unified?
- **Memorable**: Will users remember this experience?
- **Performant**: Do all these effects run smoothly?
- **Accessible**: Does it still meet accessibility standards?

**The test**: If you showed this to someone and said "AI made this bolder," would they believe you immediately? If yes, you've failed. Bold means distinctive, not "more AI effects."

Remember: Bold design is confident design. It takes risks, makes statements, and creates memorable experiences. But bold without strategy is just loud. Be intentional, be dramatic, be unforgettable.


---

## From `clarify`

> Improve unclear UX copy, error messages, microcopy, labels, and instructions. Makes interfaces easier to understand and use.

Identify and improve unclear, confusing, or poorly written interface text to make the product easier to understand and use.

## Assess Current Copy

Identify what makes the text unclear or ineffective:

1. **Find clarity problems**:
   - **Jargon**: Technical terms users won't understand
   - **Ambiguity**: Multiple interpretations possible
   - **Passive voice**: "Your file has been uploaded" vs "We uploaded your file"
   - **Length**: Too wordy or too terse
   - **Assumptions**: Assuming user knowledge they don't have
   - **Missing context**: Users don't know what to do or why
   - **Tone mismatch**: Too formal, too casual, or inappropriate for situation

2. **Understand the context**:
   - Who's the audience? (Technical? General? First-time users?)
   - What's the user's mental state? (Stressed during error? Confident during success?)
   - What's the action? (What do we want users to do?)
   - What's the constraint? (Character limits? Space limitations?)

**CRITICAL**: Clear copy helps users succeed. Unclear copy creates frustration, errors, and support tickets.

## Plan Copy Improvements

Create a strategy for clearer communication:

- **Primary message**: What's the ONE thing users need to know?
- **Action needed**: What should users do next (if anything)?
- **Tone**: How should this feel? (Helpful? Apologetic? Encouraging?)
- **Constraints**: Length limits, brand voice, localization considerations

**IMPORTANT**: Good UX writing is invisible. Users should understand immediately without noticing the words.

## Improve Copy Systematically

Refine text across these common areas:

### Error Messages
**Bad**: "Error 403: Forbidden"
**Good**: "You don't have permission to view this page. Contact your admin for access."

**Bad**: "Invalid input"
**Good**: "Email addresses need an @ symbol. Try: name@example.com"

**Principles**:
- Explain what went wrong in plain language
- Suggest how to fix it
- Don't blame the user
- Include examples when helpful
- Link to help/support if applicable

### Form Labels & Instructions
**Bad**: "DOB (MM/DD/YYYY)"
**Good**: "Date of birth" (with placeholder showing format)

**Bad**: "Enter value here"
**Good**: "Your email address" or "Company name"

**Principles**:
- Use clear, specific labels (not generic placeholders)
- Show format expectations with examples
- Explain why you're asking (when not obvious)
- Put instructions before the field, not after
- Keep required field indicators clear

### Button & CTA Text
**Bad**: "Click here" | "Submit" | "OK"
**Good**: "Create account" | "Save changes" | "Got it, thanks"

**Principles**:
- Describe the action specifically
- Use active voice (verb + noun)
- Match user's mental model
- Be specific ("Save" is better than "OK")

### Help Text & Tooltips
**Bad**: "This is the username field"
**Good**: "Choose a username. You can change this later in Settings."

**Principles**:
- Add value (don't just repeat the label)
- Answer the implicit question ("What is this?" or "Why do you need this?")
- Keep it brief but complete
- Link to detailed docs if needed

### Empty States
**Bad**: "No items"
**Good**: "No projects yet. Create your first project to get started."

**Principles**:
- Explain why it's empty (if not obvious)
- Show next action clearly
- Make it welcoming, not dead-end

### Success Messages
**Bad**: "Success"
**Good**: "Settings saved! Your changes will take effect immediately."

**Principles**:
- Confirm what happened
- Explain what happens next (if relevant)
- Be brief but complete
- Match the user's emotional moment (celebrate big wins)

### Loading States
**Bad**: "Loading..." (for 30+ seconds)
**Good**: "Analyzing your data... this usually takes 30-60 seconds"

**Principles**:
- Set expectations (how long?)
- Explain what's happening (when it's not obvious)
- Show progress when possible
- Offer escape hatch if appropriate ("Cancel")

### Confirmation Dialogs
**Bad**: "Are you sure?"
**Good**: "Delete 'Project Alpha'? This can't be undone."

**Principles**:
- State the specific action
- Explain consequences (especially for destructive actions)
- Use clear button labels ("Delete project" not "Yes")
- Don't overuse confirmations (only for risky actions)

### Navigation & Wayfinding
**Bad**: Generic labels like "Items" | "Things" | "Stuff"
**Good**: Specific labels like "Your projects" | "Team members" | "Settings"

**Principles**:
- Be specific and descriptive
- Use language users understand (not internal jargon)
- Make hierarchy clear
- Consider information scent (breadcrumbs, current location)

## Apply Clarity Principles

Every piece of copy should follow these rules:

1. **Be specific**: "Enter email" not "Enter value"
2. **Be concise**: Cut unnecessary words (but don't sacrifice clarity)
3. **Be active**: "Save changes" not "Changes will be saved"
4. **Be human**: "Oops, something went wrong" not "System error encountered"
5. **Be helpful**: Tell users what to do, not just what happened
6. **Be consistent**: Use same terms throughout (don't vary for variety)

**NEVER**:
- Use jargon without explanation
- Blame users ("You made an error" → "This field is required")
- Be vague ("Something went wrong" without explanation)
- Use passive voice unnecessarily
- Write overly long explanations (be concise)
- Use humor for errors (be empathetic instead)
- Assume technical knowledge
- Vary terminology (pick one term and stick with it)
- Repeat information (headers restating intros, redundant explanations)
- Use placeholders as the only labels (they disappear when users type)

## Verify Improvements

Test that copy improvements work:

- **Comprehension**: Can users understand without context?
- **Actionability**: Do users know what to do next?
- **Brevity**: Is it as short as possible while remaining clear?
- **Consistency**: Does it match terminology elsewhere?
- **Tone**: Is it appropriate for the situation?

Remember: You're a clarity expert with excellent communication skills. Write like you're explaining to a smart friend who's unfamiliar with the product. Be clear, be helpful, be human.


---

## From `colorize`

> Add strategic color to features that are too monochromatic or lack visual interest. Makes interfaces more engaging and expressive.

Strategically introduce color to designs that are too monochromatic, gray, or lacking in visual warmth and personality.

## MANDATORY PREPARATION

### Context Gathering (Do This First)

You cannot do a great job without having necessary context, such as target audience (critical), desired use-cases (critical), brand personality/tone, and especially existing brand colors.

Attempt to gather these from the current thread or codebase.

1. If you don't find *exact* information and have to infer from existing design and functionality, you MUST STOP and STOP and call the AskUserQuestionTool to clarify. whether you got it right.
2. Otherwise, if you can't fully infer or your level of confidence is medium or lower, you MUST STOP and call the AskUserQuestionTool to clarify. clarifying questions first to complete your context.

Do NOT proceed until you have answers. Guessing leads to generic AI slop colors.

### Use frontend-design skill

Use the frontend-design skill for design principles and anti-patterns. Do NOT proceed until it has executed and you know all DO's and DON'Ts.

---

## Assess Color Opportunity

Analyze the current state and identify opportunities:

1. **Understand current state**:
   - **Color absence**: Pure grayscale? Limited neutrals? One timid accent?
   - **Missed opportunities**: Where could color add meaning, hierarchy, or delight?
   - **Context**: What's appropriate for this domain and audience?
   - **Brand**: Are there existing brand colors we should use?

2. **Identify where color adds value**:
   - **Semantic meaning**: Success (green), error (red), warning (yellow/orange), info (blue)
   - **Hierarchy**: Drawing attention to important elements
   - **Categorization**: Different sections, types, or states
   - **Emotional tone**: Warmth, energy, trust, creativity
   - **Wayfinding**: Helping users navigate and understand structure
   - **Delight**: Moments of visual interest and personality

If any of these are unclear from the codebase, STOP and call the AskUserQuestionTool to clarify.

**CRITICAL**: More color ≠ better. Strategic color beats rainbow vomit every time. Every color should have a purpose.

## Plan Color Strategy

Create a purposeful color introduction plan:

- **Color palette**: What colors match the brand/context? (Choose 2-4 colors max beyond neutrals)
- **Dominant color**: Which color owns 60% of colored elements?
- **Accent colors**: Which colors provide contrast and highlights? (30% and 10%)
- **Application strategy**: Where does each color appear and why?

**IMPORTANT**: Color should enhance hierarchy and meaning, not create chaos. Less is more when it matters more.

## Introduce Color Strategically

Add color systematically across these dimensions:

### Semantic Color
- **State indicators**:
  - Success: Green tones (emerald, forest, mint)
  - Error: Red/pink tones (rose, crimson, coral)
  - Warning: Orange/amber tones
  - Info: Blue tones (sky, ocean, indigo)
  - Neutral: Gray/slate for inactive states

- **Status badges**: Colored backgrounds or borders for states (active, pending, completed, etc.)
- **Progress indicators**: Colored bars, rings, or charts showing completion or health

### Accent Color Application
- **Primary actions**: Color the most important buttons/CTAs
- **Links**: Add color to clickable text (maintain accessibility)
- **Icons**: Colorize key icons for recognition and personality
- **Headers/titles**: Add color to section headers or key labels
- **Hover states**: Introduce color on interaction

### Background & Surfaces
- **Tinted backgrounds**: Replace pure gray (`#f5f5f5`) with warm neutrals (`oklch(97% 0.01 60)`) or cool tints (`oklch(97% 0.01 250)`)
- **Colored sections**: Use subtle background colors to separate areas
- **Gradient backgrounds**: Add depth with subtle, intentional gradients (not generic purple-blue)
- **Cards & surfaces**: Tint cards or surfaces slightly for warmth

**Use OKLCH for color**: It's perceptually uniform, meaning equal steps in lightness *look* equal. Great for generating harmonious scales.

### Data Visualization
- **Charts & graphs**: Use color to encode categories or values
- **Heatmaps**: Color intensity shows density or importance
- **Comparison**: Color coding for different datasets or timeframes

### Borders & Accents
- **Accent borders**: Add colored left/top borders to cards or sections
- **Underlines**: Color underlines for emphasis or active states
- **Dividers**: Subtle colored dividers instead of gray lines
- **Focus rings**: Colored focus indicators matching brand

### Typography Color
- **Colored headings**: Use brand colors for section headings (maintain contrast)
- **Highlight text**: Color for emphasis or categories
- **Labels & tags**: Small colored labels for metadata or categories

### Decorative Elements
- **Illustrations**: Add colored illustrations or icons
- **Shapes**: Geometric shapes in brand colors as background elements
- **Gradients**: Colorful gradient overlays or mesh backgrounds
- **Blobs/organic shapes**: Soft colored shapes for visual interest

## Balance & Refinement

Ensure color addition improves rather than overwhelms:

### Maintain Hierarchy
- **Dominant color** (60%): Primary brand color or most used accent
- **Secondary color** (30%): Supporting color for variety
- **Accent color** (10%): High contrast for key moments
- **Neutrals** (remaining): Gray/black/white for structure

### Accessibility
- **Contrast ratios**: Ensure WCAG compliance (4.5:1 for text, 3:1 for UI components)
- **Don't rely on color alone**: Use icons, labels, or patterns alongside color
- **Test for color blindness**: Verify red/green combinations work for all users

### Cohesion
- **Consistent palette**: Use colors from defined palette, not arbitrary choices
- **Systematic application**: Same color meanings throughout (green always = success)
- **Temperature consistency**: Warm palette stays warm, cool stays cool

**NEVER**:
- Use every color in the rainbow (choose 2-4 colors beyond neutrals)
- Apply color randomly without semantic meaning
- Put gray text on colored backgrounds—it looks washed out; use a darker shade of the background color or transparency instead
- Use pure gray for neutrals—add subtle color tint (warm or cool) for sophistication
- Use pure black (`#000`) or pure white (`#fff`) for large areas
- Violate WCAG contrast requirements
- Use color as the only indicator (accessibility issue)
- Make everything colorful (defeats the purpose)
- Default to purple-blue gradients (AI slop aesthetic)

## Verify Color Addition

Test that colorization improves the experience:

- **Better hierarchy**: Does color guide attention appropriately?
- **Clearer meaning**: Does color help users understand states/categories?
- **More engaging**: Does the interface feel warmer and more inviting?
- **Still accessible**: Do all color combinations meet WCAG standards?
- **Not overwhelming**: Is color balanced and purposeful?

Remember: Color is emotional and powerful. Use it to create warmth, guide attention, communicate meaning, and express personality. But restraint and strategy matter more than saturation and variety. Be colorful, but be intentional.


---

## From `critique`

> Evaluate design effectiveness from a UX perspective. Assesses visual hierarchy, information architecture, emotional resonance, and overall design quality with actionable feedback.

Conduct a holistic design critique, evaluating whether the interface actually works—not just technically, but as a designed experience. Think like a design director giving feedback.

**First**: Use the frontend-design skill for design principles and anti-patterns.

## Design Critique

Evaluate the interface across these dimensions:

### 1. AI Slop Detection (CRITICAL)

**This is the most important check.** Does this look like every other AI-generated interface from 2024-2025?

Review the design against ALL the **DON'T** guidelines in the frontend-design skill—they are the fingerprints of AI-generated work. Check for the AI color palette, gradient text, dark mode with glowing accents, glassmorphism, hero metric layouts, identical card grids, generic fonts, and all other tells.

**The test**: If you showed this to someone and said "AI made this," would they believe you immediately? If yes, that's the problem.

### 2. Visual Hierarchy
- Does the eye flow to the most important element first?
- Is there a clear primary action? Can you spot it in 2 seconds?
- Do size, color, and position communicate importance correctly?
- Is there visual competition between elements that should have different weights?

### 3. Information Architecture
- Is the structure intuitive? Would a new user understand the organization?
- Is related content grouped logically?
- Are there too many choices at once? (cognitive overload)
- Is the navigation clear and predictable?

### 4. Emotional Resonance
- What emotion does this interface evoke? Is that intentional?
- Does it match the brand personality?
- Does it feel trustworthy, approachable, premium, playful—whatever it should feel?
- Would the target user feel "this is for me"?

### 5. Discoverability & Affordance
- Are interactive elements obviously interactive?
- Would a user know what to do without instructions?
- Are hover/focus states providing useful feedback?
- Are there hidden features that should be more visible?

### 6. Composition & Balance
- Does the layout feel balanced or uncomfortably weighted?
- Is whitespace used intentionally or just leftover?
- Is there visual rhythm in spacing and repetition?
- Does asymmetry feel designed or accidental?

### 7. Typography as Communication
- Does the type hierarchy clearly signal what to read first, second, third?
- Is body text comfortable to read? (line length, spacing, size)
- Do font choices reinforce the brand/tone?
- Is there enough contrast between heading levels?

### 8. Color with Purpose
- Is color used to communicate, not just decorate?
- Does the palette feel cohesive?
- Are accent colors drawing attention to the right things?
- Does it work for colorblind users? (not just technically—does meaning still come through?)

### 9. States & Edge Cases
- Empty states: Do they guide users toward action, or just say "nothing here"?
- Loading states: Do they reduce perceived wait time?
- Error states: Are they helpful and non-blaming?
- Success states: Do they confirm and guide next steps?

### 10. Microcopy & Voice
- Is the writing clear and concise?
- Does it sound like a human (the right human for this brand)?
- Are labels and buttons unambiguous?
- Does error copy help users fix the problem?

## Generate Critique Report

Structure your feedback as a design director would:

### Anti-Patterns Verdict
**Start here.** Pass/fail: Does this look AI-generated? List specific tells from the skill's Anti-Patterns section. Be brutally honest.

### Overall Impression
A brief gut reaction—what works, what doesn't, and the single biggest opportunity.

### What's Working
Highlight 2-3 things done well. Be specific about why they work.

### Priority Issues
The 3-5 most impactful design problems, ordered by importance:

For each issue:
- **What**: Name the problem clearly
- **Why it matters**: How this hurts users or undermines goals
- **Fix**: What to do about it (be concrete)
- **Command**: Which command to use (prefer: /animate, /quieter, /optimize, /adapt, /clarify, /distill, /delight, /onboard, /normalize, /audit, /harden, /polish, /extract, /bolder, /critique, /colorize — or other installed skills you're sure exist)

### Minor Observations
Quick notes on smaller issues worth addressing.

### Questions to Consider
Provocative questions that might unlock better solutions:
- "What if the primary action were more prominent?"
- "Does this need to feel this complex?"
- "What would a confident version of this look like?"

**Remember**:
- Be direct—vague feedback wastes everyone's time
- Be specific—"the submit button" not "some elements"
- Say what's wrong AND why it matters to users
- Give concrete suggestions, not just "consider exploring..."
- Prioritize ruthlessly—if everything is important, nothing is
- Don't soften criticism—developers need honest feedback to ship great design


---

## From `delight`

> Add moments of joy, personality, and unexpected touches that make interfaces memorable and enjoyable to use. Elevates functional to delightful.

Identify opportunities to add moments of joy, personality, and unexpected polish that transform functional interfaces into delightful experiences.

## MANDATORY PREPARATION

### Context Gathering (Do This First)

You cannot do a great job without having necessary context, such as target audience (critical), desired use-cases (critical), brand personality (playful vs professional vs quirky vs elegant), and what's appropriate for the domain.

Attempt to gather these from the current thread or codebase.

1. If you don't find *exact* information and have to infer from existing design and functionality, you MUST STOP and STOP and call the AskUserQuestionTool to clarify. whether you got it right.
2. Otherwise, if you can't fully infer or your level of confidence is medium or lower, you MUST STOP and call the AskUserQuestionTool to clarify. clarifying questions first to complete your context.

Do NOT proceed until you have answers. Delight that's wrong for the context is worse than no delight at all.

### Use frontend-design skill

Use the frontend-design skill for design principles and anti-patterns. Do NOT proceed until it has executed and you know all DO's and DON'Ts.

---

## Assess Delight Opportunities

Identify where delight would enhance (not distract from) the experience:

1. **Find natural delight moments**:
   - **Success states**: Completed actions (save, send, publish)
   - **Empty states**: First-time experiences, onboarding
   - **Loading states**: Waiting periods that could be entertaining
   - **Achievements**: Milestones, streaks, completions
   - **Interactions**: Hover states, clicks, drags
   - **Errors**: Softening frustrating moments
   - **Easter eggs**: Hidden discoveries for curious users

2. **Understand the context**:
   - What's the brand personality? (Playful? Professional? Quirky? Elegant?)
   - Who's the audience? (Tech-savvy? Creative? Corporate?)
   - What's the emotional context? (Accomplishment? Exploration? Frustration?)
   - What's appropriate? (Banking app ≠ gaming app)

3. **Define delight strategy**:
   - **Subtle sophistication**: Refined micro-interactions (luxury brands)
   - **Playful personality**: Whimsical illustrations and copy (consumer apps)
   - **Helpful surprises**: Anticipating needs before users ask (productivity tools)
   - **Sensory richness**: Satisfying sounds, smooth animations (creative tools)

If any of these are unclear from the codebase, STOP and call the AskUserQuestionTool to clarify.

**CRITICAL**: Delight should enhance usability, never obscure it. If users notice the delight more than accomplishing their goal, you've gone too far.

## Delight Principles

Follow these guidelines:

### Delight Amplifies, Never Blocks
- Delight moments should be quick (< 1 second)
- Never delay core functionality for delight
- Make delight skippable or subtle
- Respect user's time and task focus

### Surprise and Discovery
- Hide delightful details for users to discover
- Reward exploration and curiosity
- Don't announce every delight moment
- Let users share discoveries with others

### Appropriate to Context
- Match delight to emotional moment (celebrate success, empathize with errors)
- Respect the user's state (don't be playful during critical errors)
- Match brand personality and audience expectations
- Cultural sensitivity (what's delightful varies by culture)

### Compound Over Time
- Delight should remain fresh with repeated use
- Vary responses (not same animation every time)
- Reveal deeper layers with continued use
- Build anticipation through patterns

## Delight Techniques

Add personality and joy through these methods:

### Micro-interactions & Animation

**Button delight**:
```css
/* Satisfying button press */
.button {
  transition: transform 0.1s, box-shadow 0.1s;
}
.button:active {
  transform: translateY(2px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

/* Ripple effect on click */
/* Smooth lift on hover */
.button:hover {
  transform: translateY(-2px);
  transition: transform 0.2s cubic-bezier(0.25, 1, 0.5, 1); /* ease-out-quart */
}
```

**Loading delight**:
- Playful loading animations (not just spinners)
- Personality in loading messages ("Herding pixels..." "Teaching robots to dance...")
- Progress indication with encouraging messages
- Skeleton screens with subtle animations

**Success animations**:
- Checkmark draw animation
- Confetti burst for major achievements
- Gentle scale + fade for confirmation
- Satisfying sound effects (subtle)

**Hover surprises**:
- Icons that animate on hover
- Color shifts or glow effects
- Tooltip reveals with personality
- Cursor changes (custom cursors for branded experiences)

### Personality in Copy

**Playful error messages**:
```
"Error 404"
"This page is playing hide and seek. (And winning)"

"Connection failed"
"Looks like the internet took a coffee break. Want to retry?"
```

**Encouraging empty states**:
```
"No projects"
"Your canvas awaits. Create something amazing."

"No messages"
"Inbox zero! You're crushing it today."
```

**Playful labels & tooltips**:
```
"Delete"
"Send to void" (for playful brand)

"Help"
"Rescue me" (tooltip)
```

**IMPORTANT**: Match copy personality to brand. Banks shouldn't be wacky, but they can be warm.

### Illustrations & Visual Personality

**Custom illustrations**:
- Empty state illustrations (not stock icons)
- Error state illustrations (friendly monsters, quirky characters)
- Loading state illustrations (animated characters)
- Success state illustrations (celebrations)

**Icon personality**:
- Custom icon set matching brand personality
- Animated icons (subtle motion on hover/click)
- Illustrative icons (more detailed than generic)
- Consistent style across all icons

**Background effects**:
- Subtle particle effects
- Gradient mesh backgrounds
- Geometric patterns
- Parallax depth
- Time-of-day themes (morning vs night)

### Satisfying Interactions

**Drag and drop delight**:
- Lift effect on drag (shadow, scale)
- Snap animation when dropped
- Satisfying placement sound
- Undo toast ("Dropped in wrong place? [Undo]")

**Toggle switches**:
- Smooth slide with spring physics
- Color transition
- Haptic feedback on mobile
- Optional sound effect

**Progress & achievements**:
- Streak counters with celebratory milestones
- Progress bars that "celebrate" at 100%
- Badge unlocks with animation
- Playful stats ("You're on fire! 5 days in a row")

**Form interactions**:
- Input fields that animate on focus
- Checkboxes that bounce when checked
- Success state that celebrates valid input
- Auto-grow textareas

### Sound Design

**Subtle audio cues** (when appropriate):
- Notification sounds (distinctive but not annoying)
- Success sounds (satisfying "ding")
- Error sounds (empathetic, not harsh)
- Typing sounds for chat/messaging
- Ambient background audio (very subtle)

**IMPORTANT**:
- Respect system sound settings
- Provide mute option
- Keep volumes quiet (subtle cues, not alarms)
- Don't play on every interaction (sound fatigue is real)

### Easter Eggs & Hidden Delights

**Discovery rewards**:
- Konami code unlocks special theme
- Hidden keyboard shortcuts (Cmd+K for special features)
- Hover reveals on logos or illustrations
- Alt text jokes on images (for screen reader users too!)
- Console messages for developers ("Like what you see? We're hiring!")

**Seasonal touches**:
- Holiday themes (subtle, tasteful)
- Seasonal color shifts
- Weather-based variations
- Time-based changes (dark at night, light during day)

**Contextual personality**:
- Different messages based on time of day
- Responses to specific user actions
- Randomized variations (not same every time)
- Progressive reveals with continued use

### Loading & Waiting States

**Make waiting engaging**:
- Interesting loading messages that rotate
- Progress bars with personality
- Mini-games during long loads
- Fun facts or tips while waiting
- Countdown with encouraging messages

```
Loading messages rotation:
- "Waking up the servers..."
- "Teaching robots to dance..."
- "Consulting the magic 8-ball..."
- "Counting backwards from infinity..."
```

### Celebration Moments

**Success celebrations**:
- Confetti for major milestones
- Animated checkmarks for completions
- Progress bar celebrations at 100%
- "Achievement unlocked" style notifications
- Personalized messages ("You published your 10th article!")

**Milestone recognition**:
- First-time actions get special treatment
- Streak tracking and celebration
- Progress toward goals
- Anniversary celebrations

## Implementation Patterns

**Animation libraries**:
- Framer Motion (React)
- GSAP (universal)
- Lottie (After Effects animations)
- Canvas confetti (party effects)

**Sound libraries**:
- Howler.js (audio management)
- Use-sound (React hook)

**Physics libraries**:
- React Spring (spring physics)
- Popmotion (animation primitives)

**IMPORTANT**: File size matters. Compress images, optimize animations, lazy load delight features.

**NEVER**:
- Delay core functionality for delight
- Force users through delightful moments (make skippable)
- Use delight to hide poor UX
- Overdo it (less is more)
- Ignore accessibility (animate responsibly, provide alternatives)
- Make every interaction delightful (special moments should be special)
- Sacrifice performance for delight
- Be inappropriate for context (read the room)

## Verify Delight Quality

Test that delight actually delights:

- **User reactions**: Do users smile? Share screenshots?
- **Doesn't annoy**: Still pleasant after 100th time?
- **Doesn't block**: Can users opt out or skip?
- **Performant**: No jank, no slowdown
- **Appropriate**: Matches brand and context
- **Accessible**: Works with reduced motion, screen readers

Remember: Delight is the difference between a tool and an experience. Add personality, surprise users positively, and create moments worth sharing. But always respect usability - delight should enhance, never obstruct.


---

## From `distill`

> Strip designs to their essence by removing unnecessary complexity. Great design is simple, powerful, and clean.

Remove unnecessary complexity from designs, revealing the essential elements and creating clarity through ruthless simplification.

## MANDATORY PREPARATION

### Context Gathering (Do This First)

You cannot do a great job without having necessary context, such as target audience (critical), desired use-cases (critical), and understanding what's truly essential vs nice-to-have for this product.

Attempt to gather these from the current thread or codebase.

1. If you don't find *exact* information and have to infer from existing design and functionality, you MUST STOP and STOP and call the AskUserQuestionTool to clarify. whether you got it right.
2. Otherwise, if you can't fully infer or your level of confidence is medium or lower, you MUST STOP and call the AskUserQuestionTool to clarify. clarifying questions first to complete your context.

Do NOT proceed until you have answers. Simplifying the wrong things destroys usability.

### Use frontend-design skill

Use the frontend-design skill for design principles and anti-patterns. Do NOT proceed until it has executed and you know all DO's and DON'Ts.

---

## Assess Current State

Analyze what makes the design feel complex or cluttered:

1. **Identify complexity sources**:
   - **Too many elements**: Competing buttons, redundant information, visual clutter
   - **Excessive variation**: Too many colors, fonts, sizes, styles without purpose
   - **Information overload**: Everything visible at once, no progressive disclosure
   - **Visual noise**: Unnecessary borders, shadows, backgrounds, decorations
   - **Confusing hierarchy**: Unclear what matters most
   - **Feature creep**: Too many options, actions, or paths forward

2. **Find the essence**:
   - What's the primary user goal? (There should be ONE)
   - What's actually necessary vs nice-to-have?
   - What can be removed, hidden, or combined?
   - What's the 20% that delivers 80% of value?

If any of these are unclear from the codebase, STOP and call the AskUserQuestionTool to clarify.

**CRITICAL**: Simplicity is not about removing features - it's about removing obstacles between users and their goals. Every element should justify its existence.

## Plan Simplification

Create a ruthless editing strategy:

- **Core purpose**: What's the ONE thing this should accomplish?
- **Essential elements**: What's truly necessary to achieve that purpose?
- **Progressive disclosure**: What can be hidden until needed?
- **Consolidation opportunities**: What can be combined or integrated?

**IMPORTANT**: Simplification is hard. It requires saying no to good ideas to make room for great execution. Be ruthless.

## Simplify the Design

Systematically remove complexity across these dimensions:

### Information Architecture
- **Reduce scope**: Remove secondary actions, optional features, redundant information
- **Progressive disclosure**: Hide complexity behind clear entry points (accordions, modals, step-through flows)
- **Combine related actions**: Merge similar buttons, consolidate forms, group related content
- **Clear hierarchy**: ONE primary action, few secondary actions, everything else tertiary or hidden
- **Remove redundancy**: If it's said elsewhere, don't repeat it here

### Visual Simplification
- **Reduce color palette**: Use 1-2 colors plus neutrals, not 5-7 colors
- **Limit typography**: One font family, 3-4 sizes maximum, 2-3 weights
- **Remove decorations**: Eliminate borders, shadows, backgrounds that don't serve hierarchy or function
- **Flatten structure**: Reduce nesting, remove unnecessary containers—never nest cards inside cards
- **Remove unnecessary cards**: Cards aren't needed for basic layout; use spacing and alignment instead
- **Consistent spacing**: Use one spacing scale, remove arbitrary gaps

### Layout Simplification
- **Linear flow**: Replace complex grids with simple vertical flow where possible
- **Remove sidebars**: Move secondary content inline or hide it
- **Full-width**: Use available space generously instead of complex multi-column layouts
- **Consistent alignment**: Pick left or center, stick with it
- **Generous white space**: Let content breathe, don't pack everything tight

### Interaction Simplification
- **Reduce choices**: Fewer buttons, fewer options, clearer path forward (paradox of choice is real)
- **Smart defaults**: Make common choices automatic, only ask when necessary
- **Inline actions**: Replace modal flows with inline editing where possible
- **Remove steps**: Can signup be one step instead of three? Can checkout be simplified?
- **Clear CTAs**: ONE obvious next step, not five competing actions

### Content Simplification
- **Shorter copy**: Cut every sentence in half, then do it again
- **Active voice**: "Save changes" not "Changes will be saved"
- **Remove jargon**: Plain language always wins
- **Scannable structure**: Short paragraphs, bullet points, clear headings
- **Essential information only**: Remove marketing fluff, legalese, hedging
- **Remove redundant copy**: No headers restating intros, no repeated explanations, say it once

### Code Simplification
- **Remove unused code**: Dead CSS, unused components, orphaned files
- **Flatten component trees**: Reduce nesting depth
- **Consolidate styles**: Merge similar styles, use utilities consistently
- **Reduce variants**: Does that component need 12 variations, or can 3 cover 90% of cases?

**NEVER**:
- Remove necessary functionality (simplicity ≠ feature-less)
- Sacrifice accessibility for simplicity (clear labels and ARIA still required)
- Make things so simple they're unclear (mystery ≠ minimalism)
- Remove information users need to make decisions
- Eliminate hierarchy completely (some things should stand out)
- Oversimplify complex domains (match complexity to actual task complexity)

## Verify Simplification

Ensure simplification improves usability:

- **Faster task completion**: Can users accomplish goals more quickly?
- **Reduced cognitive load**: Is it easier to understand what to do?
- **Still complete**: Are all necessary features still accessible?
- **Clearer hierarchy**: Is it obvious what matters most?
- **Better performance**: Does simpler design load faster?

## Document Removed Complexity

If you removed features or options:
- Document why they were removed
- Consider if they need alternative access points
- Note any user feedback to monitor

Remember: You have great taste and judgment. Simplification is an act of confidence - knowing what to keep and courage to remove the rest. As Antoine de Saint-Exupéry said: "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away."


---

## From `extract`

> Extract and consolidate reusable components, design tokens, and patterns into your design system. Identifies opportunities for systematic reuse and enriches your component library.

Identify reusable patterns, components, and design tokens, then extract and consolidate them into the design system for systematic reuse.

## Discover

Analyze the target area to identify extraction opportunities:

1. **Find the design system**: Locate your design system, component library, or shared UI directory (grep for "design system", "ui", "components", etc.). Understand its structure:
   - Component organization and naming conventions
   - Design token structure (if any)
   - Documentation patterns
   - Import/export conventions
   
   **CRITICAL**: If no design system exists, ask before creating one. Understand the preferred location and structure first.

2. **Identify patterns**: Look for:
   - **Repeated components**: Similar UI patterns used multiple times (buttons, cards, inputs, etc.)
   - **Hard-coded values**: Colors, spacing, typography, shadows that should be tokens
   - **Inconsistent variations**: Multiple implementations of the same concept (3 different button styles)
   - **Reusable patterns**: Layout patterns, composition patterns, interaction patterns worth systematizing

3. **Assess value**: Not everything should be extracted. Consider:
   - Is this used 3+ times, or likely to be reused?
   - Would systematizing this improve consistency?
   - Is this a general pattern or context-specific?
   - What's the maintenance cost vs benefit?

## Plan Extraction

Create a systematic extraction plan:

- **Components to extract**: Which UI elements become reusable components?
- **Tokens to create**: Which hard-coded values become design tokens?
- **Variants to support**: What variations does each component need?
- **Naming conventions**: Component names, token names, prop names that match existing patterns
- **Migration path**: How to refactor existing uses to consume the new shared versions

**IMPORTANT**: Design systems grow incrementally. Extract what's clearly reusable now, not everything that might someday be reusable.

## Extract & Enrich

Build improved, reusable versions:

- **Components**: Create well-designed components with:
  - Clear props API with sensible defaults
  - Proper variants for different use cases
  - Accessibility built in (ARIA, keyboard navigation, focus management)
  - Documentation and usage examples
  
- **Design tokens**: Create tokens with:
  - Clear naming (primitive vs semantic)
  - Proper hierarchy and organization
  - Documentation of when to use each token
  
- **Patterns**: Document patterns with:
  - When to use this pattern
  - Code examples
  - Variations and combinations

**NEVER**:
- Extract one-off, context-specific implementations without generalization
- Create components so generic they're useless
- Extract without considering existing design system conventions
- Skip proper TypeScript types or prop documentation
- Create tokens for every single value (tokens should have semantic meaning)

## Migrate

Replace existing uses with the new shared versions:

- **Find all instances**: Search for the patterns you've extracted
- **Replace systematically**: Update each use to consume the shared version
- **Test thoroughly**: Ensure visual and functional parity
- **Delete dead code**: Remove the old implementations

## Document

Update design system documentation:

- Add new components to the component library
- Document token usage and values
- Add examples and guidelines
- Update any Storybook or component catalog

Remember: A good design system is a living system. Extract patterns as they emerge, enrich them thoughtfully, and maintain them consistently.


---

## From `frontend-design`

> Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications. Generates creative, polished code that avoids generic AI aesthetics.

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

## Design Direction

Commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work—the key is intentionality, not intensity.

Then implement working code that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

### Typography
→ *Consult [typography reference](reference/typography.md) for scales, pairing, and loading strategies.*

Choose fonts that are beautiful, unique, and interesting. Pair a distinctive display font with a refined body font.

**DO**: Use a modular type scale with fluid sizing (clamp)
**DO**: Vary font weights and sizes to create clear visual hierarchy
**DON'T**: Use overused fonts—Inter, Roboto, Arial, Open Sans, system defaults
**DON'T**: Use monospace typography as lazy shorthand for "technical/developer" vibes
**DON'T**: Put large icons with rounded corners above every heading—they rarely add value and make sites look templated

### Color & Theme
→ *Consult [color reference](reference/color-and-contrast.md) for OKLCH, palettes, and dark mode.*

Commit to a cohesive palette. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.

**DO**: Use modern CSS color functions (oklch, color-mix, light-dark) for perceptually uniform, maintainable palettes
**DO**: Tint your neutrals toward your brand hue—even a subtle hint creates subconscious cohesion
**DON'T**: Use gray text on colored backgrounds—it looks washed out; use a shade of the background color instead
**DON'T**: Use pure black (#000) or pure white (#fff)—always tint; pure black/white never appears in nature
**DON'T**: Use the AI color palette: cyan-on-dark, purple-to-blue gradients, neon accents on dark backgrounds
**DON'T**: Use gradient text for "impact"—especially on metrics or headings; it's decorative rather than meaningful
**DON'T**: Default to dark mode with glowing accents—it looks "cool" without requiring actual design decisions

### Layout & Space
→ *Consult [spatial reference](reference/spatial-design.md) for grids, rhythm, and container queries.*

Create visual rhythm through varied spacing—not the same padding everywhere. Embrace asymmetry and unexpected compositions. Break the grid intentionally for emphasis.

**DO**: Create visual rhythm through varied spacing—tight groupings, generous separations
**DO**: Use fluid spacing with clamp() that breathes on larger screens
**DO**: Use asymmetry and unexpected compositions; break the grid intentionally for emphasis
**DON'T**: Wrap everything in cards—not everything needs a container
**DON'T**: Nest cards inside cards—visual noise, flatten the hierarchy
**DON'T**: Use identical card grids—same-sized cards with icon + heading + text, repeated endlessly
**DON'T**: Use the hero metric layout template—big number, small label, supporting stats, gradient accent
**DON'T**: Center everything—left-aligned text with asymmetric layouts feels more designed
**DON'T**: Use the same spacing everywhere—without rhythm, layouts feel monotonous

### Visual Details
**DO**: Use intentional, purposeful decorative elements that reinforce brand
**DON'T**: Use glassmorphism everywhere—blur effects, glass cards, glow borders used decoratively rather than purposefully
**DON'T**: Use rounded elements with thick colored border on one side—a lazy accent that almost never looks intentional
**DON'T**: Use sparklines as decoration—tiny charts that look sophisticated but convey nothing meaningful
**DON'T**: Use rounded rectangles with generic drop shadows—safe, forgettable, could be any AI output
**DON'T**: Use modals unless there's truly no better alternative—modals are lazy

### Motion
→ *Consult [motion reference](reference/motion-design.md) for timing, easing, and reduced motion.*

Focus on high-impact moments: one well-orchestrated page load with staggered reveals creates more delight than scattered micro-interactions.

**DO**: Use motion to convey state changes—entrances, exits, feedback
**DO**: Use exponential easing (ease-out-quart/quint/expo) for natural deceleration
**DO**: For height animations, use grid-template-rows transitions instead of animating height directly
**DON'T**: Animate layout properties (width, height, padding, margin)—use transform and opacity only
**DON'T**: Use bounce or elastic easing—they feel dated and tacky; real objects decelerate smoothly

### Interaction
→ *Consult [interaction reference](reference/interaction-design.md) for forms, focus, and loading patterns.*

Make interactions feel fast. Use optimistic UI—update immediately, sync later.

**DO**: Use progressive disclosure—start simple, reveal sophistication through interaction (basic options first, advanced behind expandable sections; hover states that reveal secondary actions)
**DO**: Design empty states that teach the interface, not just say "nothing here"
**DO**: Make every interactive surface feel intentional and responsive
**DON'T**: Repeat the same information—redundant headers, intros that restate the heading
**DON'T**: Make every button primary—use ghost buttons, text links, secondary styles; hierarchy matters

### Responsive
→ *Consult [responsive reference](reference/responsive-design.md) for mobile-first, fluid design, and container queries.*

**DO**: Use container queries (@container) for component-level responsiveness
**DO**: Adapt the interface for different contexts—don't just shrink it
**DON'T**: Hide critical functionality on mobile—adapt the interface, don't amputate it

### UX Writing
→ *Consult [ux-writing reference](reference/ux-writing.md) for labels, errors, and empty states.*

**DO**: Make every word earn its place
**DON'T**: Repeat information users can already see

---

## The AI Slop Test

**Critical quality check**: If you showed this interface to someone and said "AI made this," would they believe you immediately? If yes, that's the problem.

A distinctive interface should make someone ask "how was this made?" not "which AI made this?"

Review the DON'T guidelines above—they are the fingerprints of AI-generated work from 2024-2025.

---

## Implementation Principles

Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices across generations.

Remember: Claude is capable of extraordinary creative work. Don't hold back—show what can truly be created when thinking outside the box and committing fully to a distinctive vision.


---

## From `harden`

> Improve interface resilience through better error handling, i18n support, text overflow handling, and edge case management. Makes interfaces robust and production-ready.

Strengthen interfaces against edge cases, errors, internationalization issues, and real-world usage scenarios that break idealized designs.

## Assess Hardening Needs

Identify weaknesses and edge cases:

1. **Test with extreme inputs**:
   - Very long text (names, descriptions, titles)
   - Very short text (empty, single character)
   - Special characters (emoji, RTL text, accents)
   - Large numbers (millions, billions)
   - Many items (1000+ list items, 50+ options)
   - No data (empty states)

2. **Test error scenarios**:
   - Network failures (offline, slow, timeout)
   - API errors (400, 401, 403, 404, 500)
   - Validation errors
   - Permission errors
   - Rate limiting
   - Concurrent operations

3. **Test internationalization**:
   - Long translations (German is often 30% longer than English)
   - RTL languages (Arabic, Hebrew)
   - Character sets (Chinese, Japanese, Korean, emoji)
   - Date/time formats
   - Number formats (1,000 vs 1.000)
   - Currency symbols

**CRITICAL**: Designs that only work with perfect data aren't production-ready. Harden against reality.

## Hardening Dimensions

Systematically improve resilience:

### Text Overflow & Wrapping

**Long text handling**:
```css
/* Single line with ellipsis */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Multi-line with clamp */
.line-clamp {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Allow wrapping */
.wrap {
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}
```

**Flex/Grid overflow**:
```css
/* Prevent flex items from overflowing */
.flex-item {
  min-width: 0; /* Allow shrinking below content size */
  overflow: hidden;
}

/* Prevent grid items from overflowing */
.grid-item {
  min-width: 0;
  min-height: 0;
}
```

**Responsive text sizing**:
- Use `clamp()` for fluid typography
- Set minimum readable sizes (14px on mobile)
- Test text scaling (zoom to 200%)
- Ensure containers expand with text

### Internationalization (i18n)

**Text expansion**:
- Add 30-40% space budget for translations
- Use flexbox/grid that adapts to content
- Test with longest language (usually German)
- Avoid fixed widths on text containers

```jsx
// ❌ Bad: Assumes short English text
<button className="w-24">Submit</button>

// ✅ Good: Adapts to content
<button className="px-4 py-2">Submit</button>
```

**RTL (Right-to-Left) support**:
```css
/* Use logical properties */
margin-inline-start: 1rem; /* Not margin-left */
padding-inline: 1rem; /* Not padding-left/right */
border-inline-end: 1px solid; /* Not border-right */

/* Or use dir attribute */
[dir="rtl"] .arrow { transform: scaleX(-1); }
```

**Character set support**:
- Use UTF-8 encoding everywhere
- Test with Chinese/Japanese/Korean (CJK) characters
- Test with emoji (they can be 2-4 bytes)
- Handle different scripts (Latin, Cyrillic, Arabic, etc.)

**Date/Time formatting**:
```javascript
// ✅ Use Intl API for proper formatting
new Intl.DateTimeFormat('en-US').format(date); // 1/15/2024
new Intl.DateTimeFormat('de-DE').format(date); // 15.1.2024

new Intl.NumberFormat('en-US', { 
  style: 'currency', 
  currency: 'USD' 
}).format(1234.56); // $1,234.56
```

**Pluralization**:
```javascript
// ❌ Bad: Assumes English pluralization
`${count} item${count !== 1 ? 's' : ''}`

// ✅ Good: Use proper i18n library
t('items', { count }) // Handles complex plural rules
```

### Error Handling

**Network errors**:
- Show clear error messages
- Provide retry button
- Explain what happened
- Offer offline mode (if applicable)
- Handle timeout scenarios

```jsx
// Error states with recovery
{error && (
  <ErrorMessage>
    <p>Failed to load data. {error.message}</p>
    <button onClick={retry}>Try again</button>
  </ErrorMessage>
)}
```

**Form validation errors**:
- Inline errors near fields
- Clear, specific messages
- Suggest corrections
- Don't block submission unnecessarily
- Preserve user input on error

**API errors**:
- Handle each status code appropriately
  - 400: Show validation errors
  - 401: Redirect to login
  - 403: Show permission error
  - 404: Show not found state
  - 429: Show rate limit message
  - 500: Show generic error, offer support

**Graceful degradation**:
- Core functionality works without JavaScript
- Images have alt text
- Progressive enhancement
- Fallbacks for unsupported features

### Edge Cases & Boundary Conditions

**Empty states**:
- No items in list
- No search results
- No notifications
- No data to display
- Provide clear next action

**Loading states**:
- Initial load
- Pagination load
- Refresh
- Show what's loading ("Loading your projects...")
- Time estimates for long operations

**Large datasets**:
- Pagination or virtual scrolling
- Search/filter capabilities
- Performance optimization
- Don't load all 10,000 items at once

**Concurrent operations**:
- Prevent double-submission (disable button while loading)
- Handle race conditions
- Optimistic updates with rollback
- Conflict resolution

**Permission states**:
- No permission to view
- No permission to edit
- Read-only mode
- Clear explanation of why

**Browser compatibility**:
- Polyfills for modern features
- Fallbacks for unsupported CSS
- Feature detection (not browser detection)
- Test in target browsers

### Input Validation & Sanitization

**Client-side validation**:
- Required fields
- Format validation (email, phone, URL)
- Length limits
- Pattern matching
- Custom validation rules

**Server-side validation** (always):
- Never trust client-side only
- Validate and sanitize all inputs
- Protect against injection attacks
- Rate limiting

**Constraint handling**:
```html
<!-- Set clear constraints -->
<input 
  type="text"
  maxlength="100"
  pattern="[A-Za-z0-9]+"
  required
  aria-describedby="username-hint"
/>
<small id="username-hint">
  Letters and numbers only, up to 100 characters
</small>
```

### Accessibility Resilience

**Keyboard navigation**:
- All functionality accessible via keyboard
- Logical tab order
- Focus management in modals
- Skip links for long content

**Screen reader support**:
- Proper ARIA labels
- Announce dynamic changes (live regions)
- Descriptive alt text
- Semantic HTML

**Motion sensitivity**:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**High contrast mode**:
- Test in Windows high contrast mode
- Don't rely only on color
- Provide alternative visual cues

### Performance Resilience

**Slow connections**:
- Progressive image loading
- Skeleton screens
- Optimistic UI updates
- Offline support (service workers)

**Memory leaks**:
- Clean up event listeners
- Cancel subscriptions
- Clear timers/intervals
- Abort pending requests on unmount

**Throttling & Debouncing**:
```javascript
// Debounce search input
const debouncedSearch = debounce(handleSearch, 300);

// Throttle scroll handler
const throttledScroll = throttle(handleScroll, 100);
```

## Testing Strategies

**Manual testing**:
- Test with extreme data (very long, very short, empty)
- Test in different languages
- Test offline
- Test slow connection (throttle to 3G)
- Test with screen reader
- Test keyboard-only navigation
- Test on old browsers

**Automated testing**:
- Unit tests for edge cases
- Integration tests for error scenarios
- E2E tests for critical paths
- Visual regression tests
- Accessibility tests (axe, WAVE)

**IMPORTANT**: Hardening is about expecting the unexpected. Real users will do things you never imagined.

**NEVER**:
- Assume perfect input (validate everything)
- Ignore internationalization (design for global)
- Leave error messages generic ("Error occurred")
- Forget offline scenarios
- Trust client-side validation alone
- Use fixed widths for text
- Assume English-length text
- Block entire interface when one component errors

## Verify Hardening

Test thoroughly with edge cases:

- **Long text**: Try names with 100+ characters
- **Emoji**: Use emoji in all text fields
- **RTL**: Test with Arabic or Hebrew
- **CJK**: Test with Chinese/Japanese/Korean
- **Network issues**: Disable internet, throttle connection
- **Large datasets**: Test with 1000+ items
- **Concurrent actions**: Click submit 10 times rapidly
- **Errors**: Force API errors, test all error states
- **Empty**: Remove all data, test empty states

Remember: You're hardening for production reality, not demo perfection. Expect users to input weird data, lose connection mid-flow, and use your product in unexpected ways. Build resilience into every component.


---

## From `normalize`

> Normalize design to match your design system and ensure consistency

Analyze and redesign the feature to perfectly match our design system standards, aesthetics, and established patterns.

## Plan

Before making changes, deeply understand the context:

1. **Discover the design system**: Search for design system documentation, UI guidelines, component libraries, or style guides (grep for "design system", "ui guide", "style guide", etc.). Study it thoroughly until you understand:
   - Core design principles and aesthetic direction
   - Target audience and personas
   - Component patterns and conventions
   - Design tokens (colors, typography, spacing)
   
   **CRITICAL**: If something isn't clear, ask. Don't guess at design system principles.

2. **Analyze the current feature**: Assess what works and what doesn't:
   - Where does it deviate from design system patterns?
   - Which inconsistencies are cosmetic vs. functional?
   - What's the root cause—missing tokens, one-off implementations, or conceptual misalignment?

3. **Create a normalization plan**: Define specific changes that will align the feature with the design system:
   - Which components can be replaced with design system equivalents?
   - Which styles need to use design tokens instead of hard-coded values?
   - How can UX patterns match established user flows?
   
   **IMPORTANT**: Great design is effective design. Prioritize UX consistency and usability over visual polish alone. Think through the best possible experience for your use case and personas first.

## Execute

Systematically address all inconsistencies across these dimensions:

- **Typography**: Use design system fonts, sizes, weights, and line heights. Replace hard-coded values with typographic tokens or classes.
- **Color & Theme**: Apply design system color tokens. Remove one-off color choices that break the palette.
- **Spacing & Layout**: Use spacing tokens (margins, padding, gaps). Align with grid systems and layout patterns used elsewhere.
- **Components**: Replace custom implementations with design system components. Ensure props and variants match established patterns.
- **Motion & Interaction**: Match animation timing, easing, and interaction patterns to other features.
- **Responsive Behavior**: Ensure breakpoints and responsive patterns align with design system standards.
- **Accessibility**: Verify contrast ratios, focus states, ARIA labels match design system requirements.
- **Progressive Disclosure**: Match information hierarchy and complexity management to established patterns.

**NEVER**:
- Create new one-off components when design system equivalents exist
- Hard-code values that should use design tokens
- Introduce new patterns that diverge from the design system
- Compromise accessibility for visual consistency

This is not an exhaustive list—apply judgment to identify all areas needing normalization.

## Clean Up

After normalization, ensure code quality:

- **Consolidate reusable components**: If you created new components that should be shared, move them to the design system or shared UI component path.
- **Remove orphaned code**: Delete unused implementations, styles, or files made obsolete by normalization.
- **Verify quality**: Lint, type-check, and test according to repository guidelines. Ensure normalization didn't introduce regressions.
- **Ensure DRYness**: Look for duplication introduced during refactoring and consolidate.

Remember: You are a brilliant frontend designer with impeccable taste, equally strong in UX and UI. Your attention to detail and eye for end-to-end user experience is world class. Execute with precision and thoroughness.


---

## From `onboard`

> Design or improve onboarding flows, empty states, and first-time user experiences. Helps users get started successfully and understand value quickly.

Create or improve onboarding experiences that help users understand, adopt, and succeed with the product quickly.

## Assess Onboarding Needs

Understand what users need to learn and why:

1. **Identify the challenge**:
   - What are users trying to accomplish?
   - What's confusing or unclear about current experience?
   - Where do users get stuck or drop off?
   - What's the "aha moment" we want users to reach?

2. **Understand the users**:
   - What's their experience level? (Beginners, power users, mixed?)
   - What's their motivation? (Excited and exploring? Required by work?)
   - What's their time commitment? (5 minutes? 30 minutes?)
   - What alternatives do they know? (Coming from competitor? New to category?)

3. **Define success**:
   - What's the minimum users need to learn to be successful?
   - What's the key action we want them to take? (First project? First invite?)
   - How do we know onboarding worked? (Completion rate? Time to value?)

**CRITICAL**: Onboarding should get users to value as quickly as possible, not teach everything possible.

## Onboarding Principles

Follow these core principles:

### Show, Don't Tell
- Demonstrate with working examples, not just descriptions
- Provide real functionality in onboarding, not separate tutorial mode
- Use progressive disclosure - teach one thing at a time

### Make It Optional (When Possible)
- Let experienced users skip onboarding
- Don't block access to product
- Provide "Skip" or "I'll explore on my own" options

### Time to Value
- Get users to their "aha moment" ASAP
- Front-load most important concepts
- Teach 20% that delivers 80% of value
- Save advanced features for contextual discovery

### Context Over Ceremony
- Teach features when users need them, not upfront
- Empty states are onboarding opportunities
- Tooltips and hints at point of use

### Respect User Intelligence
- Don't patronize or over-explain
- Be concise and clear
- Assume users can figure out standard patterns

## Design Onboarding Experiences

Create appropriate onboarding for the context:

### Initial Product Onboarding

**Welcome Screen**:
- Clear value proposition (what is this product?)
- What users will learn/accomplish
- Time estimate (honest about commitment)
- Option to skip (for experienced users)

**Account Setup**:
- Minimal required information (collect more later)
- Explain why you're asking for each piece of information
- Smart defaults where possible
- Social login when appropriate

**Core Concept Introduction**:
- Introduce 1-3 core concepts (not everything)
- Use simple language and examples
- Interactive when possible (do, don't just read)
- Progress indication (step 1 of 3)

**First Success**:
- Guide users to accomplish something real
- Pre-populated examples or templates
- Celebrate completion (but don't overdo it)
- Clear next steps

### Feature Discovery & Adoption

**Empty States**:
Instead of blank space, show:
- What will appear here (description + screenshot/illustration)
- Why it's valuable
- Clear CTA to create first item
- Example or template option

Example:
```
No projects yet
Projects help you organize your work and collaborate with your team.
[Create your first project] or [Start from template]
```

**Contextual Tooltips**:
- Appear at relevant moment (first time user sees feature)
- Point directly at relevant UI element
- Brief explanation + benefit
- Dismissable (with "Don't show again" option)
- Optional "Learn more" link

**Feature Announcements**:
- Highlight new features when they're released
- Show what's new and why it matters
- Let users try immediately
- Dismissable

**Progressive Onboarding**:
- Teach features when users encounter them
- Badges or indicators on new/unused features
- Unlock complexity gradually (don't show all options immediately)

### Guided Tours & Walkthroughs

**When to use**:
- Complex interfaces with many features
- Significant changes to existing product
- Industry-specific tools needing domain knowledge

**How to design**:
- Spotlight specific UI elements (dim rest of page)
- Keep steps short (3-7 steps max per tour)
- Allow users to click through tour freely
- Include "Skip tour" option
- Make replayable (help menu)

**Best practices**:
- Interactive > passive (let users click real buttons)
- Focus on workflow, not features ("Create a project" not "This is the project button")
- Provide sample data so actions work

### Interactive Tutorials

**When to use**:
- Users need hands-on practice
- Concepts are complex or unfamiliar
- High stakes (better to practice in safe environment)

**How to design**:
- Sandbox environment with sample data
- Clear objectives ("Create a chart showing sales by region")
- Step-by-step guidance
- Validation (confirm they did it right)
- Graduation moment (you're ready!)

### Documentation & Help

**In-product help**:
- Contextual help links throughout interface
- Keyboard shortcut reference
- Search-able help center
- Video tutorials for complex workflows

**Help patterns**:
- `?` icon near complex features
- "Learn more" links in tooltips
- Keyboard shortcut hints (`⌘K` shown on search box)

## Empty State Design

Every empty state needs:

### What Will Be Here
"Your recent projects will appear here"

### Why It Matters  
"Projects help you organize your work and collaborate with your team"

### How to Get Started
[Create project] or [Import from template]

### Visual Interest
Illustration or icon (not just text on blank page)

### Contextual Help
"Need help getting started? [Watch 2-min tutorial]"

**Empty state types**:
- **First use**: Never used this feature (emphasize value, provide template)
- **User cleared**: Intentionally deleted everything (light touch, easy to recreate)
- **No results**: Search or filter returned nothing (suggest different query, clear filters)
- **No permissions**: Can't access (explain why, how to get access)
- **Error state**: Failed to load (explain what happened, retry option)

## Implementation Patterns

### Technical approaches:

**Tooltip libraries**: Tippy.js, Popper.js
**Tour libraries**: Intro.js, Shepherd.js, React Joyride
**Modal patterns**: Focus trap, backdrop, ESC to close
**Progress tracking**: LocalStorage for "seen" states
**Analytics**: Track completion, drop-off points

**Storage patterns**:
```javascript
// Track which onboarding steps user has seen
localStorage.setItem('onboarding-completed', 'true');
localStorage.setItem('feature-tooltip-seen-reports', 'true');
```

**IMPORTANT**: Don't show same onboarding twice (annoying). Track completion and respect dismissals.

**NEVER**:
- Force users through long onboarding before they can use product
- Patronize users with obvious explanations
- Show same tooltip repeatedly (respect dismissals)
- Block all UI during tour (let users explore)
- Create separate tutorial mode disconnected from real product
- Overwhelm with information upfront (progressive disclosure!)
- Hide "Skip" or make it hard to find
- Forget about returning users (don't show initial onboarding again)

## Verify Onboarding Quality

Test with real users:

- **Time to completion**: Can users complete onboarding quickly?
- **Comprehension**: Do users understand after completing?
- **Action**: Do users take desired next step?
- **Skip rate**: Are too many users skipping? (Maybe it's too long/not valuable)
- **Completion rate**: Are users completing? (If low, simplify)
- **Time to value**: How long until users get first value?

Remember: You're a product educator with excellent teaching instincts. Get users to their "aha moment" as quickly as possible. Teach the essential, make it contextual, respect user time and intelligence.


---

## From `optimize`

> Improve interface performance across loading speed, rendering, animations, images, and bundle size. Makes experiences faster and smoother.

Identify and fix performance issues to create faster, smoother user experiences.

## Assess Performance Issues

Understand current performance and identify problems:

1. **Measure current state**:
   - **Core Web Vitals**: LCP, FID/INP, CLS scores
   - **Load time**: Time to interactive, first contentful paint
   - **Bundle size**: JavaScript, CSS, image sizes
   - **Runtime performance**: Frame rate, memory usage, CPU usage
   - **Network**: Request count, payload sizes, waterfall

2. **Identify bottlenecks**:
   - What's slow? (Initial load? Interactions? Animations?)
   - What's causing it? (Large images? Expensive JavaScript? Layout thrashing?)
   - How bad is it? (Perceivable? Annoying? Blocking?)
   - Who's affected? (All users? Mobile only? Slow connections?)

**CRITICAL**: Measure before and after. Premature optimization wastes time. Optimize what actually matters.

## Optimization Strategy

Create systematic improvement plan:

### Loading Performance

**Optimize Images**:
- Use modern formats (WebP, AVIF)
- Proper sizing (don't load 3000px image for 300px display)
- Lazy loading for below-fold images
- Responsive images (`srcset`, `picture` element)
- Compress images (80-85% quality is usually imperceptible)
- Use CDN for faster delivery

```html
<img 
  src="hero.webp"
  srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
  sizes="(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px"
  loading="lazy"
  alt="Hero image"
/>
```

**Reduce JavaScript Bundle**:
- Code splitting (route-based, component-based)
- Tree shaking (remove unused code)
- Remove unused dependencies
- Lazy load non-critical code
- Use dynamic imports for large components

```javascript
// Lazy load heavy component
const HeavyChart = lazy(() => import('./HeavyChart'));
```

**Optimize CSS**:
- Remove unused CSS
- Critical CSS inline, rest async
- Minimize CSS files
- Use CSS containment for independent regions

**Optimize Fonts**:
- Use `font-display: swap` or `optional`
- Subset fonts (only characters you need)
- Preload critical fonts
- Use system fonts when appropriate
- Limit font weights loaded

```css
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap; /* Show fallback immediately */
  unicode-range: U+0020-007F; /* Basic Latin only */
}
```

**Optimize Loading Strategy**:
- Critical resources first (async/defer non-critical)
- Preload critical assets
- Prefetch likely next pages
- Service worker for offline/caching
- HTTP/2 or HTTP/3 for multiplexing

### Rendering Performance

**Avoid Layout Thrashing**:
```javascript
// ❌ Bad: Alternating reads and writes (causes reflows)
elements.forEach(el => {
  const height = el.offsetHeight; // Read (forces layout)
  el.style.height = height * 2; // Write
});

// ✅ Good: Batch reads, then batch writes
const heights = elements.map(el => el.offsetHeight); // All reads
elements.forEach((el, i) => {
  el.style.height = heights[i] * 2; // All writes
});
```

**Optimize Rendering**:
- Use CSS `contain` property for independent regions
- Minimize DOM depth (flatter is faster)
- Reduce DOM size (fewer elements)
- Use `content-visibility: auto` for long lists
- Virtual scrolling for very long lists (react-window, react-virtualized)

**Reduce Paint & Composite**:
- Use `transform` and `opacity` for animations (GPU-accelerated)
- Avoid animating layout properties (width, height, top, left)
- Use `will-change` sparingly for known expensive operations
- Minimize paint areas (smaller is faster)

### Animation Performance

**GPU Acceleration**:
```css
/* ✅ GPU-accelerated (fast) */
.animated {
  transform: translateX(100px);
  opacity: 0.5;
}

/* ❌ CPU-bound (slow) */
.animated {
  left: 100px;
  width: 300px;
}
```

**Smooth 60fps**:
- Target 16ms per frame (60fps)
- Use `requestAnimationFrame` for JS animations
- Debounce/throttle scroll handlers
- Use CSS animations when possible
- Avoid long-running JavaScript during animations

**Intersection Observer**:
```javascript
// Efficiently detect when elements enter viewport
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      // Element is visible, lazy load or animate
    }
  });
});
```

### React/Framework Optimization

**React-specific**:
- Use `memo()` for expensive components
- `useMemo()` and `useCallback()` for expensive computations
- Virtualize long lists
- Code split routes
- Avoid inline function creation in render
- Use React DevTools Profiler

**Framework-agnostic**:
- Minimize re-renders
- Debounce expensive operations
- Memoize computed values
- Lazy load routes and components

### Network Optimization

**Reduce Requests**:
- Combine small files
- Use SVG sprites for icons
- Inline small critical assets
- Remove unused third-party scripts

**Optimize APIs**:
- Use pagination (don't load everything)
- GraphQL to request only needed fields
- Response compression (gzip, brotli)
- HTTP caching headers
- CDN for static assets

**Optimize for Slow Connections**:
- Adaptive loading based on connection (navigator.connection)
- Optimistic UI updates
- Request prioritization
- Progressive enhancement

## Core Web Vitals Optimization

### Largest Contentful Paint (LCP < 2.5s)
- Optimize hero images
- Inline critical CSS
- Preload key resources
- Use CDN
- Server-side rendering

### First Input Delay (FID < 100ms) / INP (< 200ms)
- Break up long tasks
- Defer non-critical JavaScript
- Use web workers for heavy computation
- Reduce JavaScript execution time

### Cumulative Layout Shift (CLS < 0.1)
- Set dimensions on images and videos
- Don't inject content above existing content
- Use `aspect-ratio` CSS property
- Reserve space for ads/embeds
- Avoid animations that cause layout shifts

```css
/* Reserve space for image */
.image-container {
  aspect-ratio: 16 / 9;
}
```

## Performance Monitoring

**Tools to use**:
- Chrome DevTools (Lighthouse, Performance panel)
- WebPageTest
- Core Web Vitals (Chrome UX Report)
- Bundle analyzers (webpack-bundle-analyzer)
- Performance monitoring (Sentry, DataDog, New Relic)

**Key metrics**:
- LCP, FID/INP, CLS (Core Web Vitals)
- Time to Interactive (TTI)
- First Contentful Paint (FCP)
- Total Blocking Time (TBT)
- Bundle size
- Request count

**IMPORTANT**: Measure on real devices with real network conditions. Desktop Chrome with fast connection isn't representative.

**NEVER**:
- Optimize without measuring (premature optimization)
- Sacrifice accessibility for performance
- Break functionality while optimizing
- Use `will-change` everywhere (creates new layers, uses memory)
- Lazy load above-fold content
- Optimize micro-optimizations while ignoring major issues (optimize the biggest bottleneck first)
- Forget about mobile performance (often slower devices, slower connections)

## Verify Improvements

Test that optimizations worked:

- **Before/after metrics**: Compare Lighthouse scores
- **Real user monitoring**: Track improvements for real users
- **Different devices**: Test on low-end Android, not just flagship iPhone
- **Slow connections**: Throttle to 3G, test experience
- **No regressions**: Ensure functionality still works
- **User perception**: Does it *feel* faster?

Remember: Performance is a feature. Fast experiences feel more responsive, more polished, more professional. Optimize systematically, measure ruthlessly, and prioritize user-perceived performance.


---

## From `polish`

> Final quality pass before shipping. Fixes alignment, spacing, consistency, and detail issues that separate good from great.

**First**: Use the frontend-design skill for design principles and anti-patterns.

Perform a meticulous final pass to catch all the small details that separate good work from great work. The difference between shipped and polished.

## Pre-Polish Assessment

Understand the current state and goals:

1. **Review completeness**:
   - Is it functionally complete?
   - Are there known issues to preserve (mark with TODOs)?
   - What's the quality bar? (MVP vs flagship feature?)
   - When does it ship? (How much time for polish?)

2. **Identify polish areas**:
   - Visual inconsistencies
   - Spacing and alignment issues
   - Interaction state gaps
   - Copy inconsistencies
   - Edge cases and error states
   - Loading and transition smoothness

**CRITICAL**: Polish is the last step, not the first. Don't polish work that's not functionally complete.

## Polish Systematically

Work through these dimensions methodically:

### Visual Alignment & Spacing

- **Pixel-perfect alignment**: Everything lines up to grid
- **Consistent spacing**: All gaps use spacing scale (no random 13px gaps)
- **Optical alignment**: Adjust for visual weight (icons may need offset for optical centering)
- **Responsive consistency**: Spacing and alignment work at all breakpoints
- **Grid adherence**: Elements snap to baseline grid

**Check**:
- Enable grid overlay and verify alignment
- Check spacing with browser inspector
- Test at multiple viewport sizes
- Look for elements that "feel" off

### Typography Refinement

- **Hierarchy consistency**: Same elements use same sizes/weights throughout
- **Line length**: 45-75 characters for body text
- **Line height**: Appropriate for font size and context
- **Widows & orphans**: No single words on last line
- **Hyphenation**: Appropriate for language and column width
- **Kerning**: Adjust letter spacing where needed (especially headlines)
- **Font loading**: No FOUT/FOIT flashes

### Color & Contrast

- **Contrast ratios**: All text meets WCAG standards
- **Consistent token usage**: No hard-coded colors, all use design tokens
- **Theme consistency**: Works in all theme variants
- **Color meaning**: Same colors mean same things throughout
- **Accessible focus**: Focus indicators visible with sufficient contrast
- **Tinted neutrals**: No pure gray or pure black—add subtle color tint (0.01 chroma)
- **Gray on color**: Never put gray text on colored backgrounds—use a shade of that color or transparency

### Interaction States

Every interactive element needs all states:

- **Default**: Resting state
- **Hover**: Subtle feedback (color, scale, shadow)
- **Focus**: Keyboard focus indicator (never remove without replacement)
- **Active**: Click/tap feedback
- **Disabled**: Clearly non-interactive
- **Loading**: Async action feedback
- **Error**: Validation or error state
- **Success**: Successful completion

**Missing states create confusion and broken experiences**.

### Micro-interactions & Transitions

- **Smooth transitions**: All state changes animated appropriately (150-300ms)
- **Consistent easing**: Use ease-out-quart/quint/expo for natural deceleration. Never bounce or elastic—they feel dated.
- **No jank**: 60fps animations, only animate transform and opacity
- **Appropriate motion**: Motion serves purpose, not decoration
- **Reduced motion**: Respects `prefers-reduced-motion`

### Content & Copy

- **Consistent terminology**: Same things called same names throughout
- **Consistent capitalization**: Title Case vs Sentence case applied consistently
- **Grammar & spelling**: No typos
- **Appropriate length**: Not too wordy, not too terse
- **Punctuation consistency**: Periods on sentences, not on labels (unless all labels have them)

### Icons & Images

- **Consistent style**: All icons from same family or matching style
- **Appropriate sizing**: Icons sized consistently for context
- **Proper alignment**: Icons align with adjacent text optically
- **Alt text**: All images have descriptive alt text
- **Loading states**: Images don't cause layout shift, proper aspect ratios
- **Retina support**: 2x assets for high-DPI screens

### Forms & Inputs

- **Label consistency**: All inputs properly labeled
- **Required indicators**: Clear and consistent
- **Error messages**: Helpful and consistent
- **Tab order**: Logical keyboard navigation
- **Auto-focus**: Appropriate (don't overuse)
- **Validation timing**: Consistent (on blur vs on submit)

### Edge Cases & Error States

- **Loading states**: All async actions have loading feedback
- **Empty states**: Helpful empty states, not just blank space
- **Error states**: Clear error messages with recovery paths
- **Success states**: Confirmation of successful actions
- **Long content**: Handles very long names, descriptions, etc.
- **No content**: Handles missing data gracefully
- **Offline**: Appropriate offline handling (if applicable)

### Responsiveness

- **All breakpoints**: Test mobile, tablet, desktop
- **Touch targets**: 44x44px minimum on touch devices
- **Readable text**: No text smaller than 14px on mobile
- **No horizontal scroll**: Content fits viewport
- **Appropriate reflow**: Content adapts logically

### Performance

- **Fast initial load**: Optimize critical path
- **No layout shift**: Elements don't jump after load (CLS)
- **Smooth interactions**: No lag or jank
- **Optimized images**: Appropriate formats and sizes
- **Lazy loading**: Off-screen content loads lazily

### Code Quality

- **Remove console logs**: No debug logging in production
- **Remove commented code**: Clean up dead code
- **Remove unused imports**: Clean up unused dependencies
- **Consistent naming**: Variables and functions follow conventions
- **Type safety**: No TypeScript `any` or ignored errors
- **Accessibility**: Proper ARIA labels and semantic HTML

## Polish Checklist

Go through systematically:

- [ ] Visual alignment perfect at all breakpoints
- [ ] Spacing uses design tokens consistently
- [ ] Typography hierarchy consistent
- [ ] All interactive states implemented
- [ ] All transitions smooth (60fps)
- [ ] Copy is consistent and polished
- [ ] Icons are consistent and properly sized
- [ ] All forms properly labeled and validated
- [ ] Error states are helpful
- [ ] Loading states are clear
- [ ] Empty states are welcoming
- [ ] Touch targets are 44x44px minimum
- [ ] Contrast ratios meet WCAG AA
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] No console errors or warnings
- [ ] No layout shift on load
- [ ] Works in all supported browsers
- [ ] Respects reduced motion preference
- [ ] Code is clean (no TODOs, console.logs, commented code)

**IMPORTANT**: Polish is about details. Zoom in. Squint at it. Use it yourself. The little things add up.

**NEVER**:
- Polish before it's functionally complete
- Spend hours on polish if it ships in 30 minutes (triage)
- Introduce bugs while polishing (test thoroughly)
- Ignore systematic issues (if spacing is off everywhere, fix the system)
- Perfect one thing while leaving others rough (consistent quality level)

## Final Verification

Before marking as done:

- **Use it yourself**: Actually interact with the feature
- **Test on real devices**: Not just browser DevTools
- **Ask someone else to review**: Fresh eyes catch things
- **Compare to design**: Match intended design
- **Check all states**: Don't just test happy path

Remember: You have impeccable attention to detail and exquisite taste. Polish until it feels effortless, looks intentional, and works flawlessly. Sweat the details - they matter.


---

## From `quieter`

> Tone down overly bold or visually aggressive designs. Reduces intensity while maintaining design quality and impact.

Reduce visual intensity in designs that are too bold, aggressive, or overstimulating, creating a more refined and approachable aesthetic without losing effectiveness.

## MANDATORY PREPARATION

### Context Gathering (Do This First)

You cannot do a great job without having necessary context, such as target audience (critical), desired use-cases (critical), brand personality/tone, and everything else that a great human designer would need as well.

Attempt to gather these from the current thread or codebase.

1. If you don't find *exact* information and have to infer from existing design and functionality, you MUST STOP and STOP and call the AskUserQuestionTool to clarify. whether you got it right.
2. Otherwise, if you can't fully infer or your level of confidence is medium or lower, you MUST STOP and call the AskUserQuestionTool to clarify. clarifying questions first to complete your context.

Do NOT proceed until you have answers. Guessing leads to generic design.

### Use frontend-design skill

Use the frontend-design skill for design principles and anti-patterns. Do NOT proceed until it has executed and you know all DO's and DON'Ts.

---

## Assess Current State

Analyze what makes the design feel too intense:

1. **Identify intensity sources**:
   - **Color saturation**: Overly bright or saturated colors
   - **Contrast extremes**: Too much high-contrast juxtaposition
   - **Visual weight**: Too many bold, heavy elements competing
   - **Animation excess**: Too much motion or overly dramatic effects
   - **Complexity**: Too many visual elements, patterns, or decorations
   - **Scale**: Everything is large and loud with no hierarchy

2. **Understand the context**:
   - What's the purpose? (Marketing vs tool vs reading experience)
   - Who's the audience? (Some contexts need energy)
   - What's working? (Don't throw away good ideas)
   - What's the core message? (Preserve what matters)

If any of these are unclear from the codebase, STOP and call the AskUserQuestionTool to clarify.

**CRITICAL**: "Quieter" doesn't mean boring or generic. It means refined, sophisticated, and easier on the eyes. Think luxury, not laziness.

## Plan Refinement

Create a strategy to reduce intensity while maintaining impact:

- **Color approach**: Desaturate or shift to more sophisticated tones?
- **Hierarchy approach**: Which elements should stay bold (very few), which should recede?
- **Simplification approach**: What can be removed entirely?
- **Sophistication approach**: How can we signal quality through restraint?

**IMPORTANT**: Great quiet design is harder than great bold design. Subtlety requires precision.

## Refine the Design

Systematically reduce intensity across these dimensions:

### Color Refinement
- **Reduce saturation**: Shift from fully saturated to 70-85% saturation
- **Soften palette**: Replace bright colors with muted, sophisticated tones
- **Reduce color variety**: Use fewer colors more thoughtfully
- **Neutral dominance**: Let neutrals do more work, use color as accent (10% rule)
- **Gentler contrasts**: High contrast only where it matters most
- **Tinted grays**: Use warm or cool tinted grays instead of pure gray—adds sophistication without loudness
- **Never gray on color**: If you have gray text on a colored background, use a darker shade of that color or transparency instead

### Visual Weight Reduction
- **Typography**: Reduce font weights (900 → 600, 700 → 500), decrease sizes where appropriate
- **Hierarchy through subtlety**: Use weight, size, and space instead of color and boldness
- **White space**: Increase breathing room, reduce density
- **Borders & lines**: Reduce thickness, decrease opacity, or remove entirely

### Simplification
- **Remove decorative elements**: Gradients, shadows, patterns, textures that don't serve purpose
- **Simplify shapes**: Reduce border radius extremes, simplify custom shapes
- **Reduce layering**: Flatten visual hierarchy where possible
- **Clean up effects**: Reduce or remove blur effects, glows, multiple shadows

### Motion Reduction
- **Reduce animation intensity**: Shorter distances (10-20px instead of 40px), gentler easing
- **Remove decorative animations**: Keep functional motion, remove flourishes
- **Subtle micro-interactions**: Replace dramatic effects with gentle feedback
- **Refined easing**: Use ease-out-quart for smooth, understated motion—never bounce or elastic
- **Remove animations entirely** if they're not serving a clear purpose

### Composition Refinement
- **Reduce scale jumps**: Smaller contrast between sizes creates calmer feeling
- **Align to grid**: Bring rogue elements back into systematic alignment
- **Even out spacing**: Replace extreme spacing variations with consistent rhythm

**NEVER**:
- Make everything the same size/weight (hierarchy still matters)
- Remove all color (quiet ≠ grayscale)
- Eliminate all personality (maintain character through refinement)
- Sacrifice usability for aesthetics (functional elements still need clear affordances)
- Make everything small and light (some anchors needed)

## Verify Quality

Ensure refinement maintains quality:

- **Still functional**: Can users still accomplish tasks easily?
- **Still distinctive**: Does it have character, or is it generic now?
- **Better reading**: Is text easier to read for extended periods?
- **Sophistication**: Does it feel more refined and premium?

Remember: Quiet design is confident design. It doesn't need to shout. Less is more, but less is also harder. Refine with precision and maintain intentionality.


---

## From `teach-impeccable`

> One-time setup that gathers design context for your project and saves it to your AI config file. Run once to establish persistent design guidelines.

Gather design context for this project, then persist it for all future sessions.

## Step 1: Explore the Codebase

Before asking questions, thoroughly scan the project to discover what you can:

- **README and docs**: Project purpose, target audience, any stated goals
- **Package.json / config files**: Tech stack, dependencies, existing design libraries
- **Existing components**: Current design patterns, spacing, typography in use
- **Brand assets**: Logos, favicons, color values already defined
- **Design tokens / CSS variables**: Existing color palettes, font stacks, spacing scales
- **Any style guides or brand documentation**

Note what you've learned and what remains unclear.

## Step 2: Ask UX-Focused Questions

STOP and call the AskUserQuestionTool to clarify. Focus only on what you couldn't infer from the codebase:

### Users & Purpose
- Who uses this? What's their context when using it?
- What job are they trying to get done?
- What emotions should the interface evoke? (confidence, delight, calm, urgency, etc.)

### Brand & Personality
- How would you describe the brand personality in 3 words?
- Any reference sites or apps that capture the right feel? What specifically about them?
- What should this explicitly NOT look like? Any anti-references?

### Aesthetic Preferences
- Any strong preferences for visual direction? (minimal, bold, elegant, playful, technical, organic, etc.)
- Light mode, dark mode, or both?
- Any colors that must be used or avoided?

### Accessibility & Inclusion
- Specific accessibility requirements? (WCAG level, known user needs)
- Considerations for reduced motion, color blindness, or other accommodations?

Skip questions where the answer is already clear from the codebase exploration.

## Step 3: Write Design Context

Synthesize your findings and the user's answers into a `## Design Context` section:

```markdown
## Design Context

### Users
[Who they are, their context, the job to be done]

### Brand Personality
[Voice, tone, 3-word personality, emotional goals]

### Aesthetic Direction
[Visual tone, references, anti-references, theme]

### Design Principles
[3-5 principles derived from the conversation that should guide all design decisions]
```

Write this section to CLAUDE.md in the project root. If the file exists, append or update the Design Context section.

Confirm completion and summarize the key design principles that will now guide all future work.

