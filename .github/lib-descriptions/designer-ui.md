# libs/designer-ui — Shared Stateless UI Components

## Purpose
A library of **stateless** UI components shared across the designer, data mapper,
chatbot, and other packages. Components here are purely presentational — they
receive props and render UI. They do NOT access Redux state, call services, or
manage business logic.

## NPM Package
`@microsoft/designer-ui`

## Key Component Categories
- **Editors**: Array editor, dictionary editor, expression editor (Monaco), date/time
  editor, schema editor, HTML editor, code editor, text editor, condition editor
- **Panels**: Panel header, panel container, panel tabs
- **Cards**: Operation cards, connector cards, action cards
- **Pickers**: Token picker, resource picker, file picker, combo box
- **Monitoring**: Run history inputs/outputs visualization, status badges
- **Templates**: Template card, template panel components
- **Workflow**: Edge components, node components, scope containers
- **Settings**: Settings sections, setting toggles, setting inputs
- **AI/Agent**: Agent instruction editor, built-in tools panel, Foundry agent
  details, Foundry agent picker, copilot get-started, copilot chat components
- **MCP**: MCP resource selection and configuration components
- **Knowledge**: Knowledge source management components
- **Unit Testing**: Unit test definition editors, assertion components
- **Common**: Labels, buttons, checkboxes, dropdowns, dialogs, modals, flyouts,
  copy-to-clipboard controls, recommendation panels, peek overlays

## Architecture
- 68+ component directories under `src/lib/`
- Fluent UI v8 and v9 components (migration from v8 → v9 in progress)
- CodeMirror 6 for code editing capabilities
- Lexical editor for rich text editing
- All components are props-driven with no internal state management
- Design tokens centralized in `src/lib/tokens/designTokens.ts`

## Dependencies
- `logic-apps-shared` — Utility functions and type definitions only

## Common Issue Patterns

### Issues that belong HERE:
- Visual rendering bugs in editors, cards, panels, pickers
- Styling/theming issues (dark mode, light mode inconsistencies)
- Accessibility issues in individual UI components (keyboard nav, screen readers)
- Component-level interaction bugs (click handlers, focus management)
- Editor-specific issues (token picker behavior, expression editor, Monaco integration)

### Issues that are often MISATTRIBUTED here:
- Data not appearing in a panel → usually the parent component in `designer/`
  is not passing the right props (state management issue, not UI issue)
- "Wrong value shown" → usually a serialization or state issue in `designer/`
- Connection-specific UI → may be the connection service in `logic-apps-shared`
- Template content issues → may be template data fetching, not the template UI
