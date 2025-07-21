# LESS to makeStyles Migration Plan

## Executive Summary

This document outlines a comprehensive plan to migrate 124 .less files in the LogicAppsUX monorepo to Fluent UI v9's makeStyles CSS-in-JS system. The migration will improve performance, enable better tree-shaking, provide type-safe styling, and align with modern React best practices.

**Current Progress**: 34 components migrated (27.4% complete)
- ✅ peek component (peek.less - 6 lines)
- ✅ error component (error.less - 29 lines)
- ✅ tip component (tip.less - 33 lines)
- ✅ texteditor base component (texteditor.less - 48 lines)
- ✅ nodeCollapseToggle component (nodeCollapseToggle.less - 20 lines)
- ✅ overview component (overview.less - 30 lines)
- ✅ **FOUNDATIONAL**: variables.less → tokens/designTokens.ts (CRITICAL INFRASTRUCTURE)
- ✅ **FOUNDATIONAL**: mixins.less → utils/mixins.ts (CRITICAL INFRASTRUCTURE)
- ✅ **FOUNDATIONAL**: common.less → styles/common.ts (CRITICAL INFRASTRUCTURE)
- ✅ monaco component (monaco.less - 6 lines)
- ✅ searchabledropdown component (searchabledropdown.less - 7 lines) - cleaned up old classes
- ✅ connectioncontainer component (connectioncontainer.less - 11 lines)
- ✅ batch component (batch.less - 12 lines)
- ✅ graphContainer component (graphContainer.less - 22 lines) - cleaned up old classes
- ✅ about component (about.less - 40 lines) - cleaned up old classes
- ✅ editorCollapseToggle component (editorCollapseToggle.less - 30 lines)
- ✅ modaldialog component (modaldialog.less - 30 lines) - cleaned up old classes
- ✅ codeeditor component (codeeditor.less - 35 lines)
- ✅ searchabledropdownWithAddAll component (searchabledropdownWithAddAll.less - 7 lines)
- ✅ connectiontypeselector component (connectiontypeselector.less - 10 lines)
- ✅ agentinstruction component (agentinstruction.less - 21 lines) - cleaned up old classes
- ✅ schemaeditor component (schemaeditor.less - 29 lines)
- ✅ statuspill component (statuspill.less - 55 lines)
- ✅ operationSearchGroup component (operationSearchGroup.less - 41 lines)
- ✅ recurrence component (recurrence.less - 46 lines)
- ✅ flyout component (flyout.less - 50 lines) - already had makeStyles, verified
- ✅ pager component (pager.less - 84 lines)
- ✅ staticResult component (staticResult.less - 146 lines) - styles created
- ✅ **nodeSearchPanel** - NEW makeStyles implementation with Tabster focus management (branch: ccastrotrejo/panelSearchMigration)
- ✅ **VS CODE**: export component (export.less - 120 lines) → exportStyles.ts (PR #7588/#7797)
- ✅ **VS CODE**: overview app (overview.less - 4 lines) → overviewStyles.ts (PR #7588)
- ✅ **VS CODE**: reviewList component (styles.less - 32 lines) → reviewListStyles.ts (PR #7820)
- ✅ **SVG MIGRATION**: 3 SVG files removed, replaced with Fluent UI icons (PR #7820)
- ⏭️ processsimple.less - SKIPPED: unused file
- ⏭️ datetimeeditor.less - SKIPPED: no component found
- ⏭️ connectiongatewaypicker.less - SKIPPED: no corresponding component
- ⏭️ fabric.less - SKIPPED: Fluent UI overrides, no component
- ⏭️ checkbox component - SKIPPED: already migrated

## Current State Analysis

### Scope
- **Total .less files**: 124 (9 completed, 115 remaining)
- **Main aggregator file**: `/libs/designer-ui/src/lib/styles.less` (imports 71 files)
- **Lines of CSS**: ~5,000+ lines across all files (~400 lines migrated including foundational files)
- **Affected packages**: 6 packages (designer-ui, designer, data-mapper, vs-code-react, Standalone, chatbot)

### Existing makeStyles Adoption
- **data-mapper-v2**: Fully migrated (reference implementation)
- **chatbot**: Partially migrated
- **designer-ui**: Design tokens file exists (`/libs/designer-ui/src/lib/tokens/designTokens.ts`)
- **Pattern established**: Clear conventions and patterns already in use

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
Establish core infrastructure and patterns

### Phase 2: Shared Resources (Week 3-4) ✅ **CORE INFRASTRUCTURE COMPLETED**
Migrate variables, mixins, and common styles

### Phase 3: Component Migration (Week 5-12)
Systematic component-by-component migration

### Phase 4: Cleanup & Optimization (Week 13-14)
Remove legacy code and optimize bundle

## Detailed Implementation Plan

### Phase 1: Foundation Setup

#### 1.1 Design Token Enhancement
**Location**: `/libs/designer-ui/src/lib/tokens/`

- [ ] Audit existing `designTokens.ts` for completeness
- [ ] Map all LESS variables to Fluent UI v9 tokens:
  - [ ] Colors (including theme-specific)
  - [ ] Spacing/sizing
  - [ ] Typography
  - [ ] Shadows
  - [ ] Border radius
  - [ ] Z-index values
- [ ] Create custom tokens for Logic Apps-specific values
- [ ] Add TypeScript interfaces for type safety

**Example structure**:
```typescript
// designTokens.ts
export const customTokens = {
  card: {
    minWidth: '284px',
    maxWidth: '314px',
    headerHeight: '52px',
    // ... etc
  },
  // ... other domain-specific tokens
};
```

#### 1.2 Utility Functions & Helpers
**Location**: `/libs/designer-ui/src/lib/utils/styles/`

- [ ] Create style utility functions:
  - [ ] `mergeStyles` wrapper for common patterns
  - [ ] `createThemeStyles` for dark/light theme handling
  - [ ] `responsiveStyles` for breakpoint management
- [ ] Port LESS mixins to JavaScript functions:
  - [ ] Text truncation
  - [ ] Flexbox helpers
  - [ ] Animation utilities
  - [ ] Focus styles

#### 1.3 Migration Guidelines Document
- [ ] Create `/docs/makeStyles-migration-guide.md`
- [ ] Document patterns and conventions
- [ ] Provide migration examples
- [ ] Include common gotchas and solutions

### Phase 2: Shared Resources Migration

#### 2.1 Core Style Files
Priority order for migration:

1. [x] `/libs/designer-ui/src/lib/variables.less` → `tokens/variables.ts` ✅ **COMPLETED**
2. [x] `/libs/designer-ui/src/lib/mixins.less` → `utils/mixins.ts` ✅ **COMPLETED**
3. [x] `/libs/designer-ui/src/lib/common.less` → `styles/common.ts` ✅ **COMPLETED**
4. [ ] `/libs/designer-ui/src/lib/themes.less` → `themes/index.ts`
5. [ ] `/libs/designer-ui/src/lib/fabric.less` → Fluent UI tokens
6. [ ] `/libs/designer-ui/src/lib/logicapps.less` → `styles/logicapps.ts`

#### 2.2 Create makeStyles Index
**Location**: `/libs/designer-ui/src/lib/styles/index.ts`

- [ ] Create central export for all migrated styles
- [ ] Maintain backward compatibility during migration
- [ ] Provide clear migration path for consumers

### Phase 3: Component Migration

#### 3.1 Migration Order (by priority and complexity)

**High Priority - Core Components** (Week 5-6)
- [ ] Card components (12 files, ~800 lines)
  - [ ] `card/card.less` (512 lines - largest)
  - [ ] `card/cardv2.less`
  - [ ] `card/parameters/parameters.less`
  - [ ] `card/subgraphCard/subgraphCard.less`
  - [ ] Other card variants
- [ ] Panel components (7 files, ~400 lines)
  - [ ] `panel/panel.less` (301 lines)
  - [ ] Recommendation panel components

**Medium Priority - Editor Components** (Week 7-8)
- [ ] Editor base components (8 files)
  - [ ] `editor/base/editor.less`
  - [x] `editor/monaco/monaco.less` - ✅ COMPLETED
  - [ ] `expressioneditor/expressioneditor.less`
- [ ] HTML editor (`html/htmleditor.less` - 374 lines)
- [ ] Token picker components

**Medium Priority - Form Components** (Week 9-10)
- [ ] Input components:
  - [ ] `dropdown/dropdown.less`
  - [ ] `combobox/combobox.less`
  - [ ] `searchbox/searchbox.less`
  - [ ] `checkbox/checkbox.less`
- [ ] Complex editors:
  - [ ] `arrayeditor/arrayeditor.less`
  - [ ] `dictionary/dictionaryeditor.less`
  - [ ] `schemaeditor/schemaeditor.less`

**Lower Priority - Utility Components** (Week 11-12)
- [ ] Monitoring components
- [x] Overview components - ✅ COMPLETED
- [ ] Table components
- [ ] Remaining small components:
  - [x] peek.less - ✅ COMPLETED
  - [x] error.less - ✅ COMPLETED
  - [x] tip.less - ✅ COMPLETED
  - [x] texteditor.less - ✅ COMPLETED
  - [x] nodeCollapseToggle.less - ✅ COMPLETED
  - [ ] Other utility components

#### 3.2 Component Migration Process

For each component:

1. **Create styles file** (using our new foundational infrastructure):
   ```typescript
   // ComponentName.styles.ts
   import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
   import { designTokens } from '../../tokens/designTokens';        // Our migrated variables
   import { flexStyles, truncateText } from '../../utils/mixins';   // Our migrated mixins
   import { baseCardStyles } from '../../styles/common';            // Our migrated common styles
   
   export const useStyles = makeStyles({
     root: {
       // Use our design tokens instead of hardcoded values
       backgroundColor: designTokens.card.backgroundColor,
       minWidth: designTokens.card.minWidth,
       ...flexStyles.centerAll,           // Use our migrated mixins
       ...truncateText,                   // Use our migrated text utilities
       // Direct CSS properties for single-directional needs
       marginTop: tokens.spacingVerticalM,
       paddingLeft: tokens.spacingHorizontalL,
     },
   });
   ```

2. **Update component**:
   ```typescript
   // ComponentName.tsx
   import { useStyles } from './ComponentName.styles';
   
   export const ComponentName: React.FC = () => {
     const styles = useStyles();
     return <div className={styles.root}>...</div>;
   };
   ```

3. **Remove LESS imports**:
   - Remove from component files
   - Remove from main styles.less

4. **Test thoroughly**:
   - Visual regression testing
   - Theme switching
   - Responsive behavior
   - Performance metrics

### Phase 4: Application-Specific Styles

#### 4.1 VS Code React App (Week 11)
- [x] Migrate export.less → exportStyles.ts - ✅ COMPLETED (PR #7588/#7797)
- [x] Migrate overview.less → overviewStyles.ts - ✅ COMPLETED (PR #7588)
- [x] Migrate reviewList styles → reviewListStyles.ts - ✅ COMPLETED (PR #7820)
- [x] Replace SVG icons with Fluent UI icons - ✅ COMPLETED (PR #7820)
- [ ] Migrate remaining 7 app-specific .less files
- [ ] Update build configuration
- [ ] Test in VS Code environment

#### 4.2 Standalone App (Week 11)
- [ ] Migrate 2 app-specific files
- [ ] Verify hot reload works with makeStyles
- [ ] Update Vite configuration if needed

#### 4.3 Designer Library (Week 12)
- [ ] Migrate 14 designer-specific files
- [ ] Update style exports
- [ ] Ensure backward compatibility

### Phase 5: Data Mapper Migration (Week 12)
- [ ] Migrate remaining 4 .less files in data-mapper v1
- [ ] Align with patterns from data-mapper-v2
- [ ] Consolidate shared styles

### Phase 6: Cleanup & Optimization (Week 13-14)

#### 6.1 Remove Legacy Infrastructure
- [ ] Delete all .less files
- [ ] Remove less-loader from build configs
- [ ] Update package.json dependencies
- [ ] Clean up webpack/vite configurations

#### 6.2 Optimization
- [ ] Analyze bundle size improvements
- [ ] Implement code splitting for styles
- [ ] Add performance monitoring
- [ ] Document performance gains

#### 6.3 Documentation Updates
- [ ] Update README files
- [ ] Update contribution guidelines
- [ ] Create style guide documentation
- [ ] Add examples to Storybook (if applicable)

## Technical Considerations

### Important Discoveries

#### Fluent UI v9 Shorthands Limitation
During the migration, we discovered an important pattern difference between standard CSS-in-JS and Fluent UI v9's implementation:

**Issue**: Fluent UI v9's `shorthands` utility only provides functions for multi-directional CSS properties (e.g., `margin`, `padding`, `border`), not for individual directional properties like `marginTop`, `paddingLeft`, etc.

**Examples**:
```typescript
// ❌ These do NOT exist in Fluent UI v9 shorthands:
shorthands.marginTop()
shorthands.paddingLeft()
shorthands.borderBottom()

// ✅ Only these multi-directional shorthands are available:
shorthands.margin('10px')           // all sides
shorthands.margin('10px', '20px')   // vertical, horizontal
shorthands.padding('10px', '20px', '30px', '40px') // top, right, bottom, left
shorthands.border('1px', 'solid', tokens.colorNeutralStroke1)
```

**Solution**: For individual directional properties, use standard CSS property names:
```typescript
makeStyles({
  root: {
    marginTop: '10px',      // Direct property, no shorthand needed
    paddingLeft: '20px',    // Direct property, no shorthand needed
    ...shorthands.margin('0', 'auto'), // Use shorthand for multi-directional
  }
})
```

This is an important pattern to remember during migration to avoid confusion and errors.

#### Critical Learning: Parallel Migration Strategy

**CRITICAL DISCOVERY**: During the foundational infrastructure migration, we learned that LESS files MUST be kept during the migration process and only removed at the very end.

**The Issue**: Initially, we attempted to remove LESS files immediately after creating their TypeScript equivalents. This caused build failures because:
- Many components still import and depend on the LESS files
- The main `styles.less` aggregator file imports these LESS files
- Removing LESS files before ALL consuming components are migrated breaks the build

**The Solution - Parallel Migration Strategy**:
1. **Create TypeScript alternatives alongside LESS files** (do not remove LESS files yet)
2. **Maintain both systems in parallel** during the migration period
3. **Gradually migrate components** to use the new TypeScript utilities
4. **Only remove LESS files** when ALL components have been migrated and no LESS imports remain

**Implementation Example**:
```typescript
// ✅ CORRECT: Create new file alongside LESS
/libs/designer-ui/src/lib/tokens/designTokens.ts     // NEW TypeScript version
/libs/designer-ui/src/lib/variables.less             // KEEP until end of migration

// ✅ CORRECT: Import pattern for new components
import { designTokens } from '../tokens/designTokens';

// ✅ CORRECT: LESS files remain imported in styles.less until everything is migrated
@import './variables.less';  // Keep this import until ALL components are migrated
```

**Benefits of This Approach**:
- ✅ Prevents breaking changes during migration
- ✅ Allows gradual component-by-component migration
- ✅ Maintains build stability throughout the process
- ✅ Provides fallback if issues arise
- ✅ Enables testing both systems in parallel

**What NOT to Do**:
- ❌ Don't remove LESS files immediately after creating TypeScript versions
- ❌ Don't remove LESS imports from styles.less until all components are migrated
- ❌ Don't assume TypeScript versions can immediately replace LESS files

**Phase 6 Update**: The cleanup phase (Week 13-14) becomes critical - this is when we systematically remove all LESS files after confirming no component dependencies remain.

#### Critical Learning: Remove Original CSS Class Names During Migration

**CRITICAL DISCOVERY**: During component migration, original CSS class names should be removed from components, not preserved alongside makeStyles implementations.

**The Issue**: Initially, we preserved original LESS class names alongside new makeStyles classes using `mergeClasses`:
```typescript
// ❌ AVOID: Preserving both old and new class names
className={mergeClasses(styles.root, 'msla-original-class-name')}
```

**The Problem**: Keeping both class names makes it difficult to:
- Determine when something breaks (unclear which styling system is being used)
- Debug styling issues (multiple class names can conflict)
- Verify that the migration is complete and working correctly
- Clean up the codebase effectively

**The Solution**: Remove original CSS class names when migrating components:
```typescript
// ✅ CORRECT: Use only the new makeStyles classes
className={styles.root}

// ✅ ACCEPTABLE: Merge with dynamic classes but not original LESS classes  
className={mergeClasses(styles.root, dynamicClassName)}
```

**Best Practice Implementation**:
1. **Keep LESS files** during migration (parallel migration strategy)
2. **Create makeStyles alternatives** for components
3. **Remove original CSS class names** from component implementations
4. **Only use new makeStyles classes** in component className properties
5. **Test thoroughly** to ensure styling works with only the new system
6. **Remove LESS files** only after all components are migrated

**Benefits of This Approach**:
- ✅ Makes it clear when makeStyles migration is complete for each component
- ✅ Enables easier debugging (only one styling system per component)
- ✅ Prevents class name conflicts between old and new systems
- ✅ Ensures migrated components are truly independent of LESS files
- ✅ Makes it easier to identify remaining LESS dependencies

**What NOT to Do**:
- ❌ Don't preserve original LESS class names in migrated components
- ❌ Don't use `mergeClasses` to combine old and new styling systems
- ❌ Don't leave hybrid implementations that use both LESS and makeStyles

This strategy ensures clean, debuggable migrations while maintaining the parallel migration approach for the overall project.

#### Critical Learning: Use Design Tokens Instead of CSS Selectors for Theme Switching

**CRITICAL DISCOVERY**: Griffel (Fluent UI v9's CSS-in-JS engine) generates warnings and issues when using CSS parent selectors like `.msla-theme-dark &` for theme switching.

**The Issue**: Using CSS selectors for theme switching in makeStyles causes Griffel warnings:
```typescript
// ❌ AVOID: Causes Griffel warnings
makeStyles({
  root: {
    '.msla-theme-dark &': {
      backgroundColor: tokens.colorNeutralBackground1,
      borderColor: tokens.colorNeutralStroke1,
    },
  },
})
```

**The Solution**: Use Fluent UI v9 design tokens that automatically handle theme switching:
```typescript
// ✅ CORRECT: Use design tokens that automatically adapt to theme
makeStyles({
  root: {
    backgroundColor: tokens.colorNeutralBackground1, // Automatically switches between light/dark
    borderColor: tokens.colorNeutralStroke1,         // Theme-aware border
  },
})
```

**Benefits of Design Token Approach**:
- ✅ Eliminates Griffel warnings completely
- ✅ Follows Fluent UI v9 best practices
- ✅ Automatic theme switching without CSS selectors
- ✅ More maintainable and consistent
- ✅ Better performance (no complex CSS selector resolution)

**Implementation Strategy**:
1. **Use existing design tokens** from `/libs/designer-ui/src/lib/tokens/designTokens.ts`
2. **Leverage Fluent UI v9 tokens** directly (e.g., `tokens.colorNeutralBackground1`)
3. **Only use CSS selectors** for styles that cannot be expressed with design tokens (rare cases)

**Available Token Categories**:
- Background colors: `tokens.colorNeutralBackground1/2/3`
- Border colors: `tokens.colorNeutralStroke1/2`
- Text colors: `tokens.colorNeutralForeground1/2/3`
- Brand colors: `tokens.colorBrandBackground`
- Hover states: `tokens.colorNeutralBackground1Hover`

**Example Migration**:
```typescript
// Before: CSS selector approach (causes warnings)
'.msla-theme-dark &': {
  backgroundColor: tokens.colorNeutralBackground1,
  borderColor: tokens.colorNeutralStroke1,
}

// After: Design token approach (no warnings)
backgroundColor: tokens.colorNeutralBackground1,
borderColor: tokens.colorNeutralStroke1,
```

This approach aligns with Fluent UI v9 architecture and eliminates all Griffel-related warnings in tests.

### Build System Updates
1. **Remove LESS dependencies**:
   - `less`
   - `less-loader`
   - Any LESS plugins

2. **Ensure Fluent UI build optimization**:
   - Tree-shaking for unused styles
   - Proper production builds
   - Source map configuration

### Testing Strategy
1. **Visual Regression Testing**:
   - Before/after screenshots
   - Cross-browser testing
   - Theme testing (light/dark)

2. **Performance Testing**:
   - Bundle size comparison
   - Runtime performance
   - Initial load time

3. **Integration Testing**:
   - Component functionality
   - Theme switching
   - Responsive behavior

### Migration Checklist Template

For each component migration:
- [ ] Create .styles.ts file using foundational infrastructure:
  - [ ] Import design tokens from `designTokens.ts` (instead of hardcoded values)
  - [ ] Use migrated mixins from `utils/mixins.ts`
  - [ ] Import common styles from `styles/common.ts` when applicable
- [ ] Port all styles maintaining exact visual appearance
- [ ] Update component to use makeStyles
- [ ] **DO NOT remove .less imports yet** (wait until all components are migrated)
- [ ] Update any style-dependent tests
- [ ] Visual regression test
- [ ] Theme test (light/dark)
- [ ] Responsive test
- [ ] PR review with screenshots

## Risk Mitigation

### Potential Risks
1. **Visual Regression**: Styles might not match exactly
   - Mitigation: Comprehensive visual testing, gradual rollout

2. **Performance Impact**: Initial bundle might be larger
   - Mitigation: Measure and optimize, use code splitting

3. **Development Velocity**: Migration takes time
   - Mitigation: Parallel development tracks, clear priorities

4. **Third-party Dependencies**: Some might expect CSS
   - Mitigation: Maintain CSS exports during transition

### Rollback Strategy
- **Parallel Migration Approach**: Keep .less files alongside TypeScript versions during entire migration
- Both systems functional simultaneously until final cleanup phase
- Can revert individual components back to LESS if issues arise
- Feature flag for switching between implementations
- Gradual rollout by component/feature
- **Critical**: Only remove LESS files in final cleanup phase after confirming all dependencies removed

## Success Metrics

1. **Performance**:
   - 20%+ reduction in CSS bundle size
   - Improved tree-shaking
   - Faster build times

2. **Developer Experience**:
   - Type-safe styles
   - Better IDE support
   - Easier debugging

3. **Maintainability**:
   - Styles co-located with components
   - No global namespace pollution
   - Easier to track style usage

## Timeline Summary

- **Week 1-2**: Foundation setup
- **Week 3-4**: Shared resources migration
- **Week 5-6**: High-priority components
- **Week 7-8**: Editor components
- **Week 9-10**: Form components
- **Week 11-12**: Remaining components & apps
- **Week 13-14**: Cleanup & optimization

**Total Duration**: 14 weeks (3.5 months)

## Next Steps

1. Review and approve this plan
2. Assign team members to phases
3. Set up tracking dashboard
4. Begin Phase 1 implementation
5. Schedule weekly progress reviews

## Fluent UI v8 to v9 Component Migration

### Overview
Alongside the LESS to makeStyles migration, we're also migrating from Fluent UI v8 to v9 components. This provides additional benefits:
- Modern component architecture with better performance
- Built-in makeStyles support
- Improved accessibility
- Better theme integration

### Migration Progress
- ✅ **SettingToggle**: Migrated from v8 `Toggle` to v9 `Switch` (includes makeStyles)
- ✅ **TextInput & MinuteTextInput**: Migrated from v8 `TextField` to v9 `Input` + `Field` (includes makeStyles)
- ✅ **About Component**: Migrated from v8 `Spinner` to v9 `Spinner` 
- ✅ **Tip Component**: Migrated from v8 `Callout`/`CommandButton` to v9 `Popover`/`Button`
- ✅ **SettingDropdown**: Migrated from v8 `Dropdown` to v9 `Dropdown` (includes makeStyles)
- ✅ **SettingDictionary/SimpleDictionary**: Migrated from v8 `TextField` to v9 `Input` (includes makeStyles)
- ✅ **Dictionary Delete Buttons**: Migrated from v8 `IconButton` to v9 `Button` with icons

### Completed Migrations
1. **SettingToggle** (✅ COMPLETED)
   - v8: `Toggle` → v9: `Switch`
   - Location: `/libs/designer-ui/src/lib/settings/settingsection/settingtoggle.tsx`
   - New makeStyles implementation created

2. **TextInput** (✅ COMPLETED)
   - v8: `TextField` → v9: `Input` + `Field`
   - Location: `/libs/designer-ui/src/lib/recurrence/textInput.tsx`
   - Added field validation state support
   - Created new textInput.styles.ts

3. **About Component** (✅ COMPLETED)
   - v8: `Spinner` → v9: `Spinner`
   - Location: `/libs/designer-ui/src/lib/about/index.tsx`
   - Direct replacement with updated size prop

4. **Tip Component** (✅ COMPLETED)
   - v8: `Callout` + `CommandButton` → v9: `Popover` + `Button`
   - Location: `/libs/designer-ui/src/lib/tip/index.tsx`
   - Refactored to use Popover pattern with target element positioning

5. **VS Code Export Components** (✅ COMPLETED - PR #7588/#7797)
   - Multiple v8 components → v9 equivalents with makeStyles
   - `Dropdown`, `SearchBox`, `Spinner`, `TextField` → v9 equivalents
   - `PrimaryButton`/`IconButton` → v9 `Button` with appearance props
   - `MessageBar` → v9 `MessageBar` with intent prop
   - Location: `/apps/vs-code-react/src/app/export/`
   - Complete LESS → makeStyles migration included

6. **VS Code ReviewList Component** (✅ COMPLETED - PR #7820)
   - SVG icons → Fluent UI React icons
   - Custom styling with makeStyles implementation
   - Location: `/apps/vs-code-react/src/app/components/reviewList/`
   - Removed static SVG files, added icon theming support

7. **NodeSearchPanel Component** (✅ COMPLETED - Branch: ccastrotrejo/panelSearchMigration)
   - v8: `FocusTrapZone` → Tabster focus management system
   - v8: `SearchBox` → v9: `SearchBox` with updated event handlers
   - Location: `/libs/designer/src/lib/ui/panel/nodeSearchPanel/`
   - Added new dependency: `tabster: 8.5.6` for advanced focus management
   - Created `nodeSearchPanelStyles.ts` with makeStyles for SearchBox styling
   - Improved keyboard navigation with Escape key handling
   - Enhanced accessibility with proper ARIA attributes and dialog role

### Next Migration Candidates
1. **Label Component**
   - v8: Custom wrapper → v9: Direct `Label`
   - Location: `/libs/designer-ui/src/lib/label/`
   - Already has makeStyles

2. **Remaining Spinner usages**
   - Search for other v8 Spinner imports
   - Direct replacement with v9 Spinner

3. **IconButton instances**
   - v8: `IconButton` → v9: `Button` with icon prop
   - Multiple locations throughout codebase

### v8 to v9 Component Mapping
```typescript
// Form Controls
v8: Toggle → v9: Switch
v8: TextField → v9: Input + Field wrapper
v8: Dropdown → v9: Dropdown (different API)
v8: ComboBox → v9: Combobox
v8: SearchBox → v9: SearchBox (updated event handlers)

// Buttons
v8: DefaultButton → v9: Button
v8: PrimaryButton → v9: Button appearance="primary"
v8: IconButton → v9: Button icon={<Icon />}
v8: CommandButton → v9: Button appearance="subtle"

// Display
v8: Icon → v9: Individual icon imports from @fluentui/react-icons
v8: Callout → v9: Popover
v8: MessageBar → v9: MessageBar (new API)

// Focus Management
v8: FocusTrapZone → Tabster (external dependency)

// Layout
v8: Stack → v9: CSS flexbox with makeStyles
v8: Separator → v9: Divider
```

### Migration Guidelines
1. **Always migrate styles to makeStyles** when migrating v8→v9 components
2. **Update tests** to use React Testing Library (no shallow rendering)
3. **Test both themes** after migration
4. **Clean up old CSS classes** from LESS files
5. **Verify accessibility** with v9 components

### Integration with LESS Migration
When migrating a component from v8 to v9:
1. First check if it uses LESS styles
2. Create makeStyles implementation as part of v9 migration
3. Remove references to old CSS classes
4. Update the LESS migration checklist

## Appendix

### A. File Mapping Reference
Complete mapping of all 124 .less files to their new locations (to be maintained during migration)

### B. Code Examples
Detailed before/after examples for common patterns

### C. Performance Benchmarks
Baseline measurements and targets

### D. Team Resources
- Fluent UI v9 documentation
- makeStyles API reference
- Internal style guide
- Migration support contacts