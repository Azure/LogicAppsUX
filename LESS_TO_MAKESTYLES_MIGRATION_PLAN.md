# LESS to makeStyles Migration Plan

## Executive Summary

This document outlines a comprehensive plan to migrate 124 .less files in the LogicAppsUX monorepo to Fluent UI v9's makeStyles CSS-in-JS system. The migration will improve performance, enable better tree-shaking, provide type-safe styling, and align with modern React best practices.

## Current State Analysis

### Scope
- **Total .less files**: 124
- **Main aggregator file**: `/libs/designer-ui/src/lib/styles.less` (imports 71 files)
- **Lines of CSS**: ~5,000+ lines across all files
- **Affected packages**: 6 packages (designer-ui, designer, data-mapper, vs-code-react, Standalone, chatbot)

### Existing makeStyles Adoption
- **data-mapper-v2**: Fully migrated (reference implementation)
- **chatbot**: Partially migrated
- **designer-ui**: Design tokens file exists (`/libs/designer-ui/src/lib/tokens/designTokens.ts`)
- **Pattern established**: Clear conventions and patterns already in use

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
Establish core infrastructure and patterns

### Phase 2: Shared Resources (Week 3-4)
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

1. [ ] `/libs/designer-ui/src/lib/variables.less` → `tokens/variables.ts`
2. [ ] `/libs/designer-ui/src/lib/mixins.less` → `utils/mixins.ts`
3. [ ] `/libs/designer-ui/src/lib/common.less` → `styles/common.ts`
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
  - [ ] `editor/monaco/monaco.less`
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
- [ ] Overview components
- [ ] Table components
- [ ] Remaining small components

#### 3.2 Component Migration Process

For each component:

1. **Create styles file**:
   ```typescript
   // ComponentName.styles.ts
   import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
   import { customTokens } from '../../tokens/designTokens';
   
   export const useStyles = makeStyles({
     root: {
       // styles here
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
- [ ] Migrate 10 app-specific .less files
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
- [ ] Create .styles.ts file
- [ ] Port all styles maintaining exact visual appearance
- [ ] Update component to use makeStyles
- [ ] Remove .less imports
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
- Keep .less files in version control during migration
- Feature flag for switching between implementations
- Gradual rollout by component/feature

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