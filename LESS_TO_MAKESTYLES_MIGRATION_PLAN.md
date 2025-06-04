# LESS to Fluent UI v9 makeStyles Migration Plan

## Overview

This document outlines the comprehensive plan to migrate from .less CSS files to Fluent UI v9's makeStyles CSS-in-JS system across the LogicAppsUX codebase.

### Current State
- **124 .less files** with 230+ variables requiring migration
- **64 files already using makeStyles** - established patterns exist
- **Hybrid Fluent UI v8/v9 setup** already functional
- **Major impact areas**: libs/designer-ui (94 files), libs/designer (14 files)

### Migration Goals
- ✅ Replace all .less files with makeStyles
- ✅ Consolidate design tokens using Fluent UI v9 tokens
- ✅ Maintain existing theme switching functionality
- ✅ Preserve component styling and behavior
- ✅ Improve type safety and developer experience

---

## Phase 1: Foundation Setup

### Task 1.1: Create Design Token System ✅
**Priority**: Critical
**Estimated Time**: 2-3 hours
**Status**: **COMPLETED** ✅
**Files Created**:
- ✅ `libs/designer-ui/src/lib/tokens/designTokens.ts`
- ✅ `libs/designer-ui/src/lib/tokens/index.ts`
- ✅ Updated `libs/designer-ui/src/lib/index.ts` to export tokens

**Implementation**:
```typescript
// libs/designer-ui/src/lib/tokens/designTokens.ts
import { tokens } from '@fluentui/react-components';

export const designTokens = {
  colors: {
    // Map existing @variables to Fluent UI tokens
    scopeBackground: tokens.colorNeutralBackground1,
    // ... (230+ variables mapped to Fluent UI tokens)
  },
  sizes: {
    cardMinWidth: '200px',
    cardMaxWidth: '600px',
    // ... (all size variables preserved)
  },
  typography: { /* font tokens */ },
  spacing: { /* spacing tokens */ },
  breakpoints: { /* responsive breakpoints */ },
  // ... other categories
} as const;
```

**Acceptance Criteria**:
- ✅ All 230+ .less variables mapped to design tokens
- ✅ Token system exports properly typed
- ✅ No breaking changes to visual appearance (tokens preserve original values)
- ✅ Comprehensive categorization (colors, sizes, typography, spacing, etc.)

### Task 1.2: Update Package Dependencies ✅
**Priority**: High
**Estimated Time**: 30 minutes
**Status**: **COMPLETED** ✅
**Actions**:
- ✅ Verified @fluentui/react-components versions across packages
- ✅ Confirmed consistent versions (designer-ui: 9.56.0, data-mapper-v2: 9.50.0)
- ✅ All necessary Fluent UI v9 dependencies present

---

## Phase 2: Component Migration by Priority

### Priority Level 1: Low-Risk, High-Value Components

#### Task 2.1: Migrate libs/chatbot ✅
**Priority**: High (Quick Win)
**Estimated Time**: 1-2 hours
**Status**: **COMPLETED** ✅
**Files**: 2 .less files migrated

**Files Migrated**:
- ✅ `libs/chatbot/src/lib/styles.less` → `libs/chatbot/src/lib/styles.ts`
- ✅ `libs/chatbot/src/lib/ui/styles.less` → `libs/chatbot/src/lib/ui/styles.ts`

**Implementation Steps**:
1. ✅ Created comprehensive makeStyles with theme support
2. ✅ Updated ChatbotUi.tsx and panelheader.tsx components
3. ✅ Removed .less file imports and deleted .less files
4. ✅ Tested build and unit tests - all passing

**Key Features Implemented**:
- ✅ Full theme support (light/dark mode)
- ✅ Type-safe styling with TypeScript
- ✅ Preserved all original visual styling
- ✅ Conditional dark theme styles using mergeClasses

#### Task 2.2: Migrate libs/data-mapper-v2 remaining files ✅
**Priority**: High (Already has patterns)
**Estimated Time**: 1 hour
**Status**: **COMPLETED** ✅
**Files**: 1 .less file removed

**Files Migrated**:
- ✅ `libs/data-mapper-v2/src/components/schema/style.less` - removed unused file

### Priority Level 2: Core UI Components

#### Task 2.3: Migrate Card Components ⬜
**Priority**: Critical
**Estimated Time**: 4-6 hours
**Impact**: High - Used throughout application

**Files to Migrate**:
- [ ] `libs/designer-ui/src/lib/card/card.less`
- [ ] `libs/designer-ui/src/lib/card/cardv2.less`
- [ ] `libs/designer-ui/src/lib/card/collapsedCard/collapsedCard.less`
- [ ] `libs/designer-ui/src/lib/card/scopeCard/scopeCard.less`
- [ ] Related parameter and function styles

**Implementation**:
1. [ ] Create `libs/designer-ui/src/lib/card/styles.ts`
2. [ ] Migrate base card styles
3. [ ] Migrate card variants (v2, collapsed, scope)
4. [ ] Update all card component imports
5. [ ] Test card rendering across different themes
6. [ ] Verify responsive behavior

#### Task 2.4: Migrate Panel Components ⬜
**Priority**: Critical
**Estimated Time**: 6-8 hours
**Impact**: High - Core designer functionality

**Files to Migrate**:
- [ ] `libs/designer-ui/src/lib/panel/panel.less`
- [ ] `libs/designer-ui/src/lib/panel/panelheader.less`
- [ ] `libs/designer-ui/src/lib/panel/panelbody.less`
- [ ] `libs/designer-ui/src/lib/panel/panelfooter.less`

**Implementation**:
1. [ ] Create panel styles with makeStyles
2. [ ] Preserve panel mode functionality
3. [ ] Maintain resizing capabilities
4. [ ] Test panel interactions

#### Task 2.5: Migrate Editor Components ⬜
**Priority**: High
**Estimated Time**: 8-10 hours
**Impact**: High - Core editing experience

**Files to Migrate**:
- [ ] `libs/designer-ui/src/lib/editor/editor.less`
- [ ] `libs/designer-ui/src/lib/texteditor.less`
- [ ] All editor variant styles

### Priority Level 3: Form and Input Components

#### Task 2.6: Migrate Form Controls ⬜
**Priority**: Medium
**Estimated Time**: 6-8 hours

**Files to Migrate**:
- [ ] `libs/designer-ui/src/lib/combobox/combobox.less`
- [ ] `libs/designer-ui/src/lib/dropdown/dropdown.less`
- [ ] `libs/designer-ui/src/lib/toggle/toggle.less`
- [ ] Input and field-related styles

#### Task 2.7: Migrate Monitoring Components ⬜
**Priority**: Medium
**Estimated Time**: 4-6 hours

**Files to Migrate**:
- [ ] `libs/designer-ui/src/lib/monitoring/monitoring.less`
- [ ] `libs/designer-ui/src/lib/monitoring/errorsPanel.less`
- [ ] Related monitoring styles

### Priority Level 4: Specialized Components

#### Task 2.8: Migrate Template Components ⬜
**Priority**: Medium
**Estimated Time**: 4-6 hours

**Files to Migrate**:
- [ ] `libs/designer-ui/src/lib/templates/templates.less`
- [ ] Template card and gallery styles

#### Task 2.9: Migrate Remaining Core Components ⬜
**Priority**: Medium-Low
**Estimated Time**: 10-12 hours

**Remaining Files**: ~50 component-specific .less files

---

## Phase 3: Application-Specific Migrations

### Task 3.1: Migrate VS Code Extension Styles ⬜
**Priority**: Medium
**Estimated Time**: 3-4 hours
**Files**: 8 .less files in `apps/vs-code-react`

**Files to Migrate**:
- [ ] `apps/vs-code-react/src/app/designer/app.less`
- [ ] `apps/vs-code-react/src/app/export/export.less`
- [ ] Other VS Code specific styles

### Task 3.2: Migrate Standalone App Styles ⬜
**Priority**: Low
**Estimated Time**: 2-3 hours
**Files**: 2 .less files in `apps/Standalone`

### Task 3.3: Migrate Designer Library Styles ⬜
**Priority**: Medium
**Estimated Time**: 4-6 hours
**Files**: 14 .less files in `libs/designer`

---

## Phase 4: Cleanup and Optimization

### Task 4.1: Remove .less Build Dependencies ⬜
**Priority**: Medium
**Estimated Time**: 1-2 hours

**Actions**:
- [ ] Remove less-loader from build configurations
- [ ] Remove .less file processing from Vite configs
- [ ] Update any webpack configurations
- [ ] Clean up package.json dependencies

### Task 4.2: Delete Migrated .less Files ⬜
**Priority**: Low
**Estimated Time**: 1 hour

**Actions**:
- [ ] Systematically delete migrated .less files
- [ ] Remove @import statements
- [ ] Update any remaining references

### Task 4.3: Documentation and Standards ⬜
**Priority**: Medium
**Estimated Time**: 2-3 hours

**Actions**:
- [ ] Update component documentation
- [ ] Create makeStyles style guide
- [ ] Update development guidelines
- [ ] Add examples to docs

---

## Testing Strategy

### Per-Component Testing ✅
**For each migrated component**:
- [ ] Visual regression testing
- [ ] Theme switching verification
- [ ] Responsive behavior testing
- [ ] Cross-browser compatibility

### Integration Testing ✅
**After major milestones**:
- [ ] Full application smoke testing
- [ ] E2E test suite execution
- [ ] Performance benchmarking
- [ ] Accessibility testing

### Rollback Plan ✅
**If issues arise**:
- [ ] Maintain .less files until migration complete
- [ ] Branch-based development for safe rollbacks
- [ ] Feature flags for gradual rollout

---

## Migration Utilities and Helpers

### Code Transformation Scripts ⬜
**Create helper scripts for**:
- [ ] Automated import replacement
- [ ] Variable name mapping
- [ ] Style extraction utilities

### Development Tools ⬜
**Setup tooling for**:
- [ ] Visual diff comparison
- [ ] Automated testing of styled components
- [ ] Build performance monitoring

---

## Success Metrics

### Technical Metrics ✅
- [ ] 0 .less files remaining in codebase
- [ ] 100% type safety for component styles
- [ ] No visual regressions
- [ ] Build time improvements
- [ ] Bundle size impact assessment

### Developer Experience Metrics ✅
- [ ] Improved IntelliSense for styling
- [ ] Faster development iteration
- [ ] Reduced context switching between files
- [ ] Better debugging capabilities

---

## Risk Assessment and Mitigation

### High-Risk Areas ⚠️
1. **Theme switching functionality** - Critical business requirement
   - Mitigation: Thorough testing with both themes
   
2. **Complex nested selectors** - Potential for visual breaks
   - Mitigation: Component-by-component migration with testing
   
3. **Build process changes** - Could affect deployment
   - Mitigation: Gradual removal of .less processing

### Medium-Risk Areas ⚠️
1. **Performance impact** - CSS-in-JS runtime overhead
   - Mitigation: Performance benchmarking and optimization
   
2. **Developer onboarding** - New patterns to learn
   - Mitigation: Documentation and examples

---

## Timeline Estimation

### Sprint 1 (Week 1): Foundation
- Tasks 1.1 - 1.2: Design tokens and dependencies
- Tasks 2.1 - 2.2: Quick wins (chatbot, data-mapper-v2)

### Sprint 2 (Week 2): Core Components
- Task 2.3: Card components
- Task 2.4: Panel components (start)

### Sprint 3 (Week 3): Core Components Continued
- Task 2.4: Panel components (complete)
- Task 2.5: Editor components (start)

### Sprint 4 (Week 4): Core Components Completion
- Task 2.5: Editor components (complete)
- Task 2.6: Form controls (start)

### Sprint 5 (Week 5): Remaining Components
- Task 2.6: Form controls (complete)
- Tasks 2.7 - 2.9: Specialized components

### Sprint 6 (Week 6): Applications
- Tasks 3.1 - 3.3: Application-specific migrations

### Sprint 7 (Week 7): Cleanup
- Tasks 4.1 - 4.3: Cleanup and documentation

**Total Estimated Time**: 6-7 weeks with 1-2 developers

---

## Communication Plan

### Stakeholder Updates ✅
- [ ] Weekly progress reports
- [ ] Demo sessions for major milestones
- [ ] Risk escalation procedures

### Team Coordination ✅
- [ ] Daily standup updates
- [ ] Code review requirements
- [ ] Migration guidelines training

---

## Completion Checklist

### Technical Completion ✅
- [ ] All .less files migrated to makeStyles
- [ ] All components using design tokens
- [ ] Build process updated
- [ ] Tests passing
- [ ] Performance benchmarks met

### Documentation Completion ✅
- [ ] Migration guide created
- [ ] Component examples updated
- [ ] Development standards updated
- [ ] Troubleshooting guide created

### Team Readiness ✅
- [ ] Team trained on new patterns
- [ ] Code review guidelines updated
- [ ] Development tooling configured
- [ ] Knowledge transfer completed

---

## Progress Summary

### ✅ Phase 1: Foundation Setup - **COMPLETED**
- ✅ Design token system created and exported
- ✅ Package dependencies verified
- ✅ Ready for component migrations

### 🔄 Phase 2: Component Migration by Priority - **IN PROGRESS**
- ✅ Task 2.1: libs/chatbot migration **COMPLETED**
- ✅ Task 2.2: libs/data-mapper-v2 migration **COMPLETED**
- 📋 Quick wins: 2/2 completed (chatbot ✅, data-mapper-v2 ✅)
- 📋 Ready for core components migration

### ⏳ Next Steps
1. ✅ ~~Task 2.1: Migrate libs/chatbot~~ **COMPLETED**
2. ✅ ~~Task 2.2: Complete data-mapper-v2 migration~~ **COMPLETED**
3. Start Task 2.3: Migrate Card Components (Priority Level 2)

---

*Last Updated: December 2024*
*Status: Phase 1 Complete - Ready for Component Migration*
*Next Review: Weekly*