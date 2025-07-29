# LESS to makeStyles Detailed Migration Plan

## Executive Summary

This document provides a detailed, granular breakdown of the LESS to makeStyles migration plan, building upon the foundation work completed in commit 34d3f8020e40db4623032a8b5f8c909ce9f17763. The plan divides the migration into smaller, manageable subtasks that can be executed independently or in parallel.

## Foundation Work Already Completed (Commit 34d3f8020)

### ✅ Completed Items:
1. **Design Tokens Infrastructure**
   - Created `/libs/designer-ui/src/lib/tokens/designTokens.ts` with comprehensive token mappings
   - Established color, size, spacing, typography, and layout tokens
   - Created type-safe token access pattern

2. **Migration Pattern Established**
   - Successfully migrated chatbot library from .less to makeStyles
   - Demonstrated pattern for component migration
   - Showed dark theme override pattern

3. **Documentation Started**
   - Created CLAUDE.md with project instructions
   - Created initial migration plan document

## Detailed Task Breakdown

### Phase 1: Foundation Enhancement (Week 1-2)

#### 1.1 Design Token Completion
**Total estimated tasks: 15 subtasks**

##### 1.1.1 Token Audit and Gap Analysis (2 days)
- [ ] Create spreadsheet mapping all LESS variables to tokens
- [ ] Identify missing token mappings in designTokens.ts
- [ ] Document tokens that need custom values
- [ ] Review Fluent UI v9 token documentation for new additions
- [ ] Create list of deprecated LESS variables to remove

##### 1.1.2 Token Categories Enhancement (3 days)
- [ ] **Animation tokens**
  - [ ] Map transition durations (e.g., `transition: 0.2s ease-in`)
  - [ ] Map animation curves
  - [ ] Document animation patterns
  
- [ ] **State-specific tokens**
  - [ ] Hover state tokens
  - [ ] Active state tokens
  - [ ] Focus state tokens
  - [ ] Disabled state tokens
  
- [ ] **Component-specific tokens**
  - [ ] Card-specific tokens refinement
  - [ ] Panel-specific tokens
  - [ ] Editor-specific tokens
  - [ ] Monitoring view tokens

##### 1.1.3 Token Type Safety (1 day)
- [ ] Create TypeScript interfaces for custom tokens
- [ ] Add JSDoc comments for all token categories
- [ ] Create token usage guidelines
- [ ] Add token validation utilities

#### 1.2 Utility Functions Library (3 days)
**Total estimated tasks: 20 subtasks**

##### 1.2.1 Core Style Utilities
- [ ] Create `/libs/designer-ui/src/lib/utils/styles/index.ts`
- [ ] Implement `mergeStyles` utility for combining makeStyles
- [ ] Create `conditionalStyles` helper for dynamic styling
- [ ] Implement `responsiveStyles` utility with breakpoint support
- [ ] Create `themeAwareStyles` helper for theme switching

##### 1.2.2 LESS Mixin Conversions
- [ ] **Text utilities**
  - [ ] `truncateText()` - single line truncation
  - [ ] `multiLineTruncate()` - multi-line truncation
  - [ ] `textOverflow()` - custom overflow handling
  
- [ ] **Layout utilities**
  - [ ] `flexCenter()` - flex centering helper
  - [ ] `flexBetween()` - space-between helper
  - [ ] `gridLayout()` - grid template helper
  - [ ] `absolutePosition()` - positioning helper
  
- [ ] **Focus utilities**
  - [ ] `focusVisible()` - accessible focus styles
  - [ ] `focusRing()` - focus ring implementation
  - [ ] `keyboardOnly()` - keyboard-only focus
  
- [ ] **Animation utilities**
  - [ ] `fadeIn()` - fade in animation
  - [ ] `slideIn()` - slide animations
  - [ ] `pulse()` - pulse effect
  - [ ] `skeleton()` - skeleton loading effect

##### 1.2.3 Testing Utilities
- [ ] Create test helpers for makeStyles
- [ ] Mock makeStyles for unit tests
- [ ] Create visual regression test utilities

#### 1.3 Migration Infrastructure (2 days)
**Total estimated tasks: 10 subtasks**

##### 1.3.1 Build System Preparation
- [ ] Create feature flag for gradual rollout
- [ ] Set up parallel build paths (LESS + makeStyles)
- [ ] Configure tree-shaking for makeStyles
- [ ] Update webpack/vite configs for optimal bundling

##### 1.3.2 Developer Tools
- [ ] Create VS Code snippets for makeStyles patterns
- [ ] Set up ESLint rules for style consistency
- [ ] Create migration CLI helper tool
- [ ] Set up automated migration tracking

##### 1.3.3 Documentation
- [ ] Create detailed migration guide with examples
- [ ] Document common pitfalls and solutions
- [ ] Create video walkthrough of migration process
- [ ] Set up migration FAQ

### Phase 2: Shared Resources Migration (Week 3-4)

#### 2.1 Core Variable Migration
**Total estimated tasks: 25 subtasks**

##### 2.1.1 Variables.less Migration (2 days)
- [ ] **Color variables**
  - [ ] Map theme-agnostic colors
  - [ ] Map theme-specific colors
  - [ ] Create color utility functions
  - [ ] Document color usage patterns
  
- [ ] **Spacing variables**
  - [ ] Map padding values
  - [ ] Map margin values
  - [ ] Create spacing scale
  - [ ] Document spacing system
  
- [ ] **Typography variables**
  - [ ] Map font families
  - [ ] Map font sizes
  - [ ] Map line heights
  - [ ] Map font weights

##### 2.1.2 Mixins.less Migration (3 days)
- [ ] **Layout mixins**
  - [ ] Convert flex mixins
  - [ ] Convert grid mixins
  - [ ] Convert position mixins
  
- [ ] **Effect mixins**
  - [ ] Convert shadow mixins
  - [ ] Convert border mixins
  - [ ] Convert gradient mixins
  
- [ ] **Responsive mixins**
  - [ ] Convert media query mixins
  - [ ] Convert breakpoint mixins
  - [ ] Create responsive utilities

##### 2.1.3 Common.less Migration (2 days)
- [ ] Extract global reset styles
- [ ] Convert utility classes to utilities
- [ ] Migrate helper classes
- [ ] Create common component styles

#### 2.2 Theme System Migration
**Total estimated tasks: 15 subtasks**

##### 2.2.1 Theme Structure
- [ ] Create theme provider setup
- [ ] Migrate light theme variables
- [ ] Migrate dark theme variables
- [ ] Create theme switching mechanism
- [ ] Add theme persistence

##### 2.2.2 Theme Testing
- [ ] Create theme test suite
- [ ] Add visual regression tests
- [ ] Test theme switching performance
- [ ] Validate color contrast ratios

### Phase 3: Component Migration - Detailed Breakdown

#### 3.1 Card Components (Priority: High)
**Total estimated tasks: 60 subtasks**

##### 3.1.1 Base Card Component (`card.less` - 512 lines)
**Week 5 - Breaking into 10 sub-components:**

- [ ] **Card container styles** (50 lines)
  - [ ] Extract container layout styles
  - [ ] Convert positioning styles
  - [ ] Migrate responsive behaviors
  
- [ ] **Card header styles** (80 lines)
  - [ ] Convert header layout
  - [ ] Migrate icon styles
  - [ ] Convert title styles
  - [ ] Handle collapsed states
  
- [ ] **Card body styles** (100 lines)
  - [ ] Convert content area styles
  - [ ] Migrate padding/spacing
  - [ ] Handle overflow scenarios
  
- [ ] **Card footer styles** (40 lines)
  - [ ] Convert footer layout
  - [ ] Migrate button styles
  - [ ] Handle action areas
  
- [ ] **Card states** (60 lines)
  - [ ] Convert hover states
  - [ ] Migrate selected states
  - [ ] Handle disabled states
  - [ ] Convert focus states
  
- [ ] **Card animations** (30 lines)
  - [ ] Convert expand/collapse animations
  - [ ] Migrate transition effects
  - [ ] Handle loading states
  
- [ ] **Card theme variations** (50 lines)
  - [ ] Light theme overrides
  - [ ] Dark theme overrides
  - [ ] High contrast support
  
- [ ] **Card responsive styles** (40 lines)
  - [ ] Mobile breakpoint styles
  - [ ] Tablet adjustments
  - [ ] Desktop optimizations
  
- [ ] **Card interaction styles** (40 lines)
  - [ ] Drag and drop styles
  - [ ] Selection indicators
  - [ ] Context menu triggers
  
- [ ] **Card edge cases** (22 lines)
  - [ ] Error states
  - [ ] Empty states
  - [ ] Loading skeletons

##### 3.1.2 Card Variants Migration
- [ ] **CardV2 styles** (`cardv2.less`)
  - [ ] Base v2 styles
  - [ ] Compact mode styles
  - [ ] Extended mode styles
  
- [ ] **Subgraph Card** (`subgraphCard.less`)
  - [ ] Container styles
  - [ ] Nesting indicators
  - [ ] Expansion controls
  
- [ ] **Parameter Card styles**
  - [ ] Input container styles
  - [ ] Label styles
  - [ ] Validation styles

#### 3.2 Panel Components Migration
**Total estimated tasks: 35 subtasks**

##### 3.2.1 Main Panel (`panel.less` - 301 lines)
**Week 6 - Breaking into 7 sub-components:**

- [ ] **Panel container** (50 lines)
  - [ ] Layout structure
  - [ ] Positioning rules
  - [ ] Z-index management
  
- [ ] **Panel header** (40 lines)
  - [ ] Title styles
  - [ ] Close button
  - [ ] Action buttons
  
- [ ] **Panel content** (80 lines)
  - [ ] Scrollable area
  - [ ] Content padding
  - [ ] Section dividers
  
- [ ] **Panel footer** (30 lines)
  - [ ] Action bar
  - [ ] Button alignment
  - [ ] Status indicators
  
- [ ] **Panel animations** (40 lines)
  - [ ] Slide-in effects
  - [ ] Fade transitions
  - [ ] Resize animations
  
- [ ] **Panel responsive** (30 lines)
  - [ ] Mobile full-screen
  - [ ] Tablet adjustments
  - [ ] Desktop sizing
  
- [ ] **Panel states** (31 lines)
  - [ ] Loading states
  - [ ] Error states
  - [ ] Empty states

#### 3.3 Editor Components Migration
**Total estimated tasks: 45 subtasks**

##### 3.3.1 Base Editor Components (Week 7)
- [ ] **Editor Base** (`editor/base/editor.less`)
  - [ ] Container styles (5 subtasks)
  - [ ] Toolbar styles (5 subtasks)
  - [ ] Content area styles (5 subtasks)
  
- [ ] **Monaco Editor** (`editor/monaco/monaco.less`)
  - [ ] Editor wrapper (3 subtasks)
  - [ ] Custom theme overrides (4 subtasks)
  - [ ] Toolbar integration (3 subtasks)
  
- [ ] **Expression Editor** (`expressioneditor/expressioneditor.less`)
  - [ ] Expression input styles (4 subtasks)
  - [ ] Autocomplete styles (4 subtasks)
  - [ ] Validation indicators (3 subtasks)

##### 3.3.2 Complex Editors (Week 8)
- [ ] **HTML Editor** (`html/htmleditor.less` - 374 lines)
  - [ ] Rich text toolbar (5 subtasks)
  - [ ] Content editable area (5 subtasks)
  - [ ] Preview mode (4 subtasks)

#### 3.4 Form Components Migration
**Total estimated tasks: 40 subtasks**

##### 3.4.1 Basic Input Components (Week 9)
- [ ] **Dropdown** (`dropdown/dropdown.less`)
  - [ ] Trigger button (3 subtasks)
  - [ ] Dropdown menu (4 subtasks)
  - [ ] Item styles (3 subtasks)
  
- [ ] **Combobox** (`combobox/combobox.less`)
  - [ ] Input field (3 subtasks)
  - [ ] Suggestion list (4 subtasks)
  - [ ] Selection pills (3 subtasks)

##### 3.4.2 Complex Form Components (Week 10)
- [ ] **Array Editor** (`arrayeditor/arrayeditor.less`)
  - [ ] Item container (4 subtasks)
  - [ ] Add/remove buttons (3 subtasks)
  - [ ] Drag handles (3 subtasks)
  
- [ ] **Dictionary Editor** (`dictionary/dictionaryeditor.less`)
  - [ ] Key-value pairs (4 subtasks)
  - [ ] Add entry UI (3 subtasks)
  - [ ] Validation styles (3 subtasks)

### Phase 4: Parallel Execution Opportunities

#### 4.1 Independent Tasks (Can be done in parallel)
**These tasks have no dependencies and can be assigned to different team members:**

1. **Documentation Tasks**
   - [ ] Migration guide creation
   - [ ] Video tutorials
   - [ ] Code examples
   - [ ] FAQ compilation

2. **Utility Development**
   - [ ] Style utilities
   - [ ] Test helpers
   - [ ] Migration tools
   - [ ] Linting rules

3. **Component Groups** (No interdependencies)
   - [ ] Monitoring components
   - [ ] Overview components
   - [ ] Table components
   - [ ] Icon components

#### 4.2 Sequential Dependencies
**These tasks must be done in order:**

1. Design Tokens → Utility Functions → Component Migration
2. Variables.less → Mixins.less → Component styles
3. Base components → Variant components
4. Theme structure → Theme overrides → Theme testing

### Phase 5: Testing and Validation

#### 5.1 Testing Strategy
**Total estimated tasks: 30 subtasks**

##### 5.1.1 Unit Testing
- [ ] Update component tests for makeStyles
- [ ] Create style testing utilities
- [ ] Mock makeStyles in tests
- [ ] Validate token usage

##### 5.1.2 Visual Regression Testing
- [ ] Set up Percy/Chromatic
- [ ] Create baseline screenshots
- [ ] Test all theme variations
- [ ] Test responsive breakpoints

##### 5.1.3 Performance Testing
- [ ] Measure bundle size changes
- [ ] Test runtime performance
- [ ] Validate tree-shaking
- [ ] Check memory usage

### Phase 6: Rollout and Cleanup

#### 6.1 Gradual Rollout
**Total estimated tasks: 20 subtasks**

##### 6.1.1 Feature Flag Implementation
- [ ] Create feature flag system
- [ ] Implement A/B testing
- [ ] Monitor performance metrics
- [ ] Collect user feedback

##### 6.1.2 Migration Completion
- [ ] Remove all .less files
- [ ] Update build configurations
- [ ] Remove LESS dependencies
- [ ] Update documentation

## Success Metrics and Tracking

### Progress Tracking Dashboard
- Total subtasks: ~350
- Completed: 15
- In Progress: 5
- Blocked: 0

### Recently Completed (PRs #7588, #7797, #7820, Branch: ccastrotrejo/panelSearchMigration)
- ✅ VS Code React export.less → exportStyles.ts (PR #7588, #7797)
- ✅ VS Code React overview.less → overviewStyles.ts (PR #7588)
- ✅ VS Code React reviewList component styles (PR #7820)
- ✅ SVG icon migration to Fluent UI icons (PR #7820)
- ✅ **nodeSearchPanel component**: New makeStyles implementation with Tabster focus management (Branch: ccastrotrejo/panelSearchMigration)
  - Migrated from Fluent UI v8 `FocusTrapZone` to Tabster for better accessibility
  - Added new dependency: `tabster: 8.5.6`
  - Created `nodeSearchPanelStyles.ts` with makeStyles for SearchBox styling
  - Improved keyboard navigation and ARIA compliance
- ✅ Component migrations include Fluent UI v8 → v9 upgrades

### Key Performance Indicators
1. **Bundle Size**: Target 20% reduction
2. **Build Time**: Target 30% improvement
3. **Runtime Performance**: No regression
4. **Developer Velocity**: Improved after migration

## Risk Mitigation Updates

### Parallel Development Strategy
- Keep both LESS and makeStyles during migration
- Use feature flags for gradual rollout
- Maintain visual regression test suite
- Regular team sync meetings

### Rollback Plan
- Git tags at each major milestone
- Feature flag for instant rollback
- Backup of all LESS files
- Documentation of rollback procedures

## Next Steps

1. Review and approve detailed plan
2. Assign team members to parallel tasks
3. Set up tracking dashboard
4. Begin Phase 1.1.1 (Token Audit)
5. Schedule daily stand-ups for migration team