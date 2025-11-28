# Designer UI

Shared stateless UI components library. Contains reusable React components used across the designer, data mapper, and other packages.

**Package**: `@microsoft/designer-ui`

## Purpose

- **Reusable UI components** - Buttons, inputs, panels, cards
- **Expression editor** - Monaco-based expression editing
- **Token picker** - Dynamic content selection
- **Operation cards** - Workflow node visualizations
- **Stateless design** - Components receive all data via props

## Commands

```bash
pnpm run build:lib   # Build library
pnpm run test:lib    # Run unit tests
```

## Architecture

### Entry Point
`src/index.ts` exports all public components and utilities.

### Structure
```
/src/lib
  /card/               - Operation card components
  /code/               - Code editor components
  /dictionary/         - Key-value editors
  /dropdown/           - Dropdown components
  /editor/             - Rich text editors (Lexical)
  /expressioneditor/   - Monaco expression editor
  /floatingactionmenu/ - Context action menus
  /html/               - HTML editor
  /monitoring/         - Run history visualization
  /panel/              - Panel containers
  /picker/             - Token and value pickers
  /querybuilder/       - Filter/query building UI
  /recommendation/     - Operation search/recommendations
  /schemaeditor/       - Schema editing
  /settings/           - Settings sections
  /staticresult/       - Static result configuration
  /tokenpicker/        - Expression token selection
  /overview/           - Workflow overview components
```

## Key Components

### Expression Editor
Monaco-based editor for workflow expressions:
```tsx
<ExpressionEditor
  expression={value}
  onChange={handleChange}
  getTokens={fetchTokens}
/>
```

### Token Picker
Select dynamic content and expressions:
```tsx
<TokenPicker
  tokens={availableTokens}
  onTokenSelected={handleSelect}
/>
```

### Operation Cards
Visual representation of workflow operations:
```tsx
<OperationCard
  title="Send email"
  icon={emailIcon}
  status="succeeded"
  onClick={handleClick}
/>
```

### Panel Components
Consistent panel layouts:
```tsx
<PanelContainer>
  <PanelHeader title="Configuration" />
  <PanelContent>{children}</PanelContent>
</PanelContainer>
```

## Styling

### Current State
- Mix of LESS files and Fluent UI v9 makeStyles
- Migrating to makeStyles (see `LESS_TO_MAKESTYLES_MIGRATION_PLAN.md`)

### Guidelines
- New components should use makeStyles
- Use Fluent UI v9 design tokens
- Support both light and dark themes
- Follow accessibility guidelines (WCAG 2.1 AA)

## Text Editing (Lexical)

Uses Lexical for rich text editing:
- `@lexical/react` integration
- Custom plugins for expression insertion
- HTML import/export

## Monaco Integration

Expression editor uses Monaco:
- Custom language support for Logic Apps expressions
- Syntax highlighting
- Autocomplete for tokens
- Validation

## Testing

```bash
pnpm run test:lib
```

Tests focus on:
- Component rendering
- User interactions
- Accessibility
- Edge cases

## Dependencies

- `@microsoft/logic-apps-shared` - Shared utilities
- `@fluentui/react` - Fluent UI v8
- `@fluentui/react-components` - Fluent UI v9
- `@monaco-editor/react` - Monaco editor
- `lexical` - Rich text editing
- `@xyflow/react` - Flow visualization

## Development Tips

1. **Stateless components**: Don't add state, accept via props
2. **Accessibility**: Test with screen readers, keyboard nav
3. **Theme testing**: Check both light and dark themes
4. **Responsive**: Components should adapt to container size
5. **Styling migration**: Prefer makeStyles for new code
