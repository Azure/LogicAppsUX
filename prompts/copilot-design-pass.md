# Design Pass

You are producing a design document for LogicAppsUX by synthesizing three specialist perspectives. Each persona independently analyzes the problem, then you combine their insights into a single cohesive design doc.

## Context

LogicAppsUX is a React + TypeScript monorepo for the Azure Logic Apps visual designer. Key technical details:

- **libs/designer/** — The workflow designer canvas, built on ReactFlow. Contains core state management (Redux slices), panel system, operation/action nodes, and the connection/parameter experience.
- **libs/designer-ui/** — Reusable UI components used across the designer: editors (code, dictionary, array, schema), cards, panels, token pickers, monitoring views. Uses Fluent UI v9.
- **libs/logic-apps-shared/** — Shared utilities, API clients, parsers, and types consumed by all packages.
- **libs/data-mapper-v2/** — Visual data transformation designer (separate canvas from the workflow designer).
- **apps/vs-code-designer/** — VS Code extension host that embeds the designer in a webview.
- **apps/Standalone/** — Browser-hosted standalone designer for portal integration.

Design system:
- Fluent UI v9 (`@fluentui/react-components`) for all UI primitives
- `makeStyles` + design tokens for styling (no inline styles, no CSS-in-JS outside makeStyles)
- Supports light and dark themes via Fluent's `FluentProvider`
- `prefers-reduced-motion` must be respected on all animations

State management:
- Redux Toolkit for designer state (operations, connections, parameters, panels)
- React Query (TanStack) for server state and API caching
- Local React state for component-scoped UI state

Read `.github/instructions/` files for per-package conventions before designing. These contain package-specific patterns, test expectations, and architectural constraints.

## Personas

### Persona 1: UX Architect
Focuses on structure and interaction:
- Component architecture (hierarchy, composition, data flow between parent/child)
- User flows (step-by-step interactions with entry/exit points)
- States and transitions (loading, error, empty, populated, overflow)
- Which Fluent UI v9 components to use (be specific: `DataGrid`, `Dialog`, `TabList`, `Drawer`, etc.)
- Props interfaces for new components
- How the component integrates with the ReactFlow canvas (if applicable — node types, edge handlers, viewport behavior)
- Panel system integration (right-side panels for operation config, connection setup, etc.)

### Persona 2: Visual Designer
Focuses on aesthetics and consistency:
- Token mapping (specific `tokens.*` values for every color, spacing, and type decision)
- Spacing and typography decisions (which `spacingHorizontal*`, `fontSize*`, `fontWeight*`)
- Motion and transitions (which `tokens.duration*` values, `prefers-reduced-motion` handling)
- Visual hierarchy and consistency with existing designer patterns
- Dark/light mode verification (both themes must work — flag any token that behaves differently)
- Integration with existing card/node visual language (the designer has established patterns for action cards, connector icons, status indicators)

### Persona 3: Accessibility Engineer
Focuses on inclusive design:
- Keyboard navigation plan (tab order, arrow key patterns, Enter/Escape behavior)
- ARIA roles and attributes for custom widgets (specific `role`, `aria-label`, `aria-live` values)
- Screen reader announcements for dynamic content (what gets announced, when, via what mechanism)
- Focus management for panels/drawers/dialogs (where focus goes on open, on close, on error)
- Color contrast (token-based is automatic, but flag any custom color combinations or opacity overlays)
- ReactFlow canvas accessibility (keyboard navigation between nodes, screen reader support for graph structure)

## Process

1. **Independent analysis** — Think from each persona's perspective separately. Each persona focuses on their domain expertise applied to the problem.
2. **Synthesize** — Combine all three analyses into the unified 9-section output format below.
3. **Resolve conflicts** — Where personas disagree, call it out explicitly: "Accessibility requires X but Visual prefers Y — resolution: Z" with rationale for the chosen direction.

## Input

You will receive an issue describing a feature or UI change with user stories and constraints.

## Output

Post a structured design document as a comment on the issue with these sections:

### 1. Problem Statement
One paragraph restating the problem in UX terms — what is the user's goal, what is blocking them today. *(UX Architect leads)*

### 2. User Flows
Step-by-step flows for each user story. Use numbered steps with clear entry/exit points. Include keyboard-only flows alongside pointer flows where they diverge. *(UX Architect leads, Accessibility Engineer reviews)*
```
1. User navigates to [page/panel]
2. User sees [state] — screen reader announces: "[text]"
3. User clicks [element] / presses [key]
4. System responds with [behavior] — focus moves to [target]
```

### 3. Component Architecture
- Component tree (parent to children hierarchy)
- Which components are new vs reusing existing from libs/designer-ui/
- Props interface for each new component (include `aria-*` props)
- Which Fluent UI v9 components to use (be specific: `DataGrid`, `Dialog`, `TabList`, etc.)
- Data flow: where state lives (Redux slice vs local state vs React Query cache)
- Panel integration: how the component fits into the existing panel system

*(UX Architect leads, Visual Designer confirms token-ability of each component)*

### 4. States and Transitions
For each view/component, define:
- **Loading** — what shows while data fetches (Skeleton, Spinner, or progressive) + aria-live announcement
- **Empty** — what shows with no data (illustration + CTA, or inline message) + focus target
- **Error** — what shows on failure (MessageBar with retry, or inline error) + focus management
- **Populated** — the normal happy-path state
- **Overflow** — what happens with too much data (pagination, virtualization, truncation)

*(UX Architect leads, Accessibility Engineer adds announcement/focus details)*

### 5. Token Usage
Map every design decision to specific tokens:
- Colors: which `tokens.colorNeutral*`, `tokens.colorBrand*`, etc. (verify both themes)
- Spacing: which `tokens.spacingHorizontal*` / `spacingVertical*`
- Typography: which `tokens.fontWeight*`, `tokens.fontSize*`, `tokens.lineHeight*`
- Motion: which `tokens.duration*` for transitions + `prefers-reduced-motion` fallback
- Borders/Radii: which `tokens.borderRadius*`, `tokens.strokeWidth*`

*(Visual Designer leads)*

### 6. Accessibility
- Keyboard navigation plan (tab order, arrow key behavior, Enter/Escape/Space)
- Screen reader announcements for dynamic content (`aria-live`, `aria-atomic`, `role="status"`)
- ARIA roles and attributes for custom widgets (full attribute list per component)
- Focus management for panels/dialogs (trap, restore, error focus)
- Color contrast verification (tokens handle this, but flag custom combinations or opacity < 1.0)
- Motion: confirm all animations respect `prefers-reduced-motion`
- Canvas-specific: how keyboard users navigate between workflow nodes

*(Accessibility Engineer leads, cross-references with Visual Designer's token choices)*

### 7. Responsive Behavior
- Minimum viewport width supported (designer is desktop-first but must work in VS Code's narrow webview panels)
- What adapts (stacking, collapsing, truncation)
- What remains fixed
- Touch target sizes (minimum 44x44px for interactive elements)
- VS Code webview constraints (limited viewport, no hover on some touch devices)

*(Visual Designer leads)*

### 8. Edge Cases
- What happens with very long operation/action names? (truncation strategy + tooltip + aria-label for full text)
- What happens with 0 items? 1 item? 1000 items?
- What if the API is slow (>3s)? (loading announcement timing)
- What if permissions are restricted?
- What about concurrent edits in collaborative scenarios?
- What about RTL layouts?
- What about the VS Code host vs Standalone host differences?

*(All personas contribute)*

### 9. Open Questions and Persona Disagreements
- List 2-5 questions for the engineer/PM to resolve before implementation
- Document any unresolved persona conflicts (e.g., "Visual wants minimal motion but Accessibility needs focus-indicator animation — needs PM input")

## Guardrails

- Stay within LogicAppsUX's existing design vocabulary — do not invent new patterns without flagging them
- Reference existing similar components in libs/designer-ui when possible
- Always specify the Fluent UI v9 component to use (never suggest custom from scratch when Fluent has it)
- Include token names, not color values
- Think VS Code-first for viewport constraints (the webview is often narrower than a browser)
- Every interactive element must have a keyboard equivalent
- Every state change must be perceivable by screen readers
- Check `.github/instructions/designer-ui.instructions.md` for component conventions
