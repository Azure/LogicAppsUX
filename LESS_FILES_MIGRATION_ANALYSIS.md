# Comprehensive LESS Files Migration Analysis

## Executive Summary

This document provides a detailed analysis of all 124 LESS files in the LogicAppsUX repository that require migration to Fluent UI v9's makeStyles system. The analysis includes complexity assessment, usage patterns, and migration task prioritization.

**Progress Update**: 40+ components have been successfully migrated (38.8% complete)

**Foundation Components Migrated (Critical Infrastructure):**
- ✅ **variables.less → tokens/designTokens.ts** (CRITICAL INFRASTRUCTURE)
- ✅ **mixins.less → utils/mixins.ts** (CRITICAL INFRASTRUCTURE)  
- ✅ **common.less → styles/common.ts** (CRITICAL INFRASTRUCTURE)

**Individual Component Migrations:**
- ✅ peek.less (6 lines)
- ✅ error.less (29 lines)
- ✅ tip.less (33 lines)
- ✅ texteditor.less (48 lines)
- ✅ nodeCollapseToggle.less (20 lines)
- ✅ overview.less (30 lines) - apps/vs-code-react
- ✅ export.less (120 lines) - apps/vs-code-react → exportStyles.ts
- ✅ **reviewList styles.less (32 lines) - REMOVED ENTIRELY** - apps/vs-code-react → reviewListStyles.ts (PR #7907)
- ✅ SVG icon migration (3 files removed) - apps/vs-code-react
- ✅ **nodeSearchPanel** - NEW makeStyles implementation with Tabster focus management (branch: ccastrotrejo/panelSearchMigration)
- ✅ **40+ makeStyles files created** across designer-ui and designer libraries
- ✅ **VS Code React App Fluent UI v9 Migration** - Major architectural updates (Branch: ccastrotrejo/FinalMigration)

**Recent Major Achievements (Branch: ccastrotrejo/FinalMigration):**
- ✅ **Complete VS Code React App Fluent UI v9 Migration**
  - SearchableDropdown component fully migrated to v9
  - Export functionality enhanced with v9 components
  - Table components migrated from ShimmeredDetailsList to native v9 Table
  - Enhanced theme provider integration
  - Package.json updated with v9 dependencies
- ✅ **Advanced Component Features**
  - Native column resizing in v9 Tables
  - Proper selectedKeys support and key-based selection
  - Enhanced className merging and placeholder support
  - useId hook simplification for better performance

## Repository Overview

- **Total LESS files**: 103 files (21 migrated, 82 remaining)
- **Total makeStyles files created**: 40+ files
- **Total lines of CSS**: ~10,210 lines
- **Distribution across packages**: 6 packages
- **Main aggregator**: `/libs/designer-ui/src/lib/styles.less` (imports remaining files)
- **Largest files**: card.less (512 lines), chatbot.less (459 lines), htmleditor.less (374 lines)
- **Migration Progress**: 38.8% complete with foundational infrastructure in place

## File Analysis by Package

### 1. libs/designer-ui (85 files)

**Core Infrastructure Files**
- [ ] `variables.less` (151 lines) - **CRITICAL** - Variable definitions used throughout
- [ ] `mixins.less` (9 lines) - **CRITICAL** - LESS mixins for reusable patterns  
- [ ] `common.less` (39 lines) - **HIGH** - Common utility classes
- [ ] `themes.less` (42 lines) - **HIGH** - Theme-specific overrides
- [ ] `fabric.less` (15 lines) - **HIGH** - Fluent UI integration
- [ ] `styles.less` (253 lines) - **CRITICAL** - Main aggregator file

**Card Components (High Complexity)**
- [ ] `card/card.less` (512 lines) - **COMPLEX** - Main card component with extensive panel mode styles
- [ ] `card/cardv2.less` (64 lines) - **MEDIUM** - V2 card variant
- [ ] `card/parameters/parameters.less` (103 lines) - **MEDIUM** - Parameter editor styles
- [ ] `card/subgraphCard/subgraphCard.less` (81 lines) - **MEDIUM** - Subgraph card variant
- [ ] `card/config/config.less` (125 lines) - **MEDIUM** - Card configuration styles
- [ ] `card/function/function.less` (55 lines) - **MEDIUM** - Function card styles
- [ ] `card/scopeCard/scopeCard.less` (139 lines) - **MEDIUM** - Scope card styles
- [ ] `card/collapsedCard/collapsedCard.less` (53 lines) - **MEDIUM** - Collapsed card state
- [ ] `card/graphContainer/graphContainer.less` (22 lines) - **SIMPLE** - Graph container
- [ ] `card/connectiontypeselector/connectiontypeselector.less` (10 lines) - **SIMPLE** - Connection selector
- [ ] `card/batch.less` (12 lines) - **SIMPLE** - Batch processing styles

**Panel Components (Medium Complexity)**
- [ ] `panel/panel.less` (301 lines) - **COMPLEX** - Main panel component
- [ ] `panel/recommendationpanel/recommendation.less` (186 lines) - **MEDIUM** - Recommendation panel
- [ ] `panel/recommendationpanel/operationGroupDetails/operationGroupDetails.less` (62 lines) - **MEDIUM**
- [ ] `panel/recommendationpanel/operationGroupDetails/operationGroupHeader/operationGroupHeader.less` (60 lines) - **MEDIUM**
- [ ] `panel/recommendationpanel/operationSearchCard/operationSearchCard.less` (107 lines) - **MEDIUM**
- [ ] `panel/recommendationpanel/operationSearchGroup/operationSearchGroup.less` (41 lines) - **SIMPLE**
- [ ] `panel/recommendationpanel/operationSearchHeader/operationSearchHeader.less` (57 lines) - **SIMPLE**

**Editor Components (High Complexity)**
- [ ] `html/htmleditor.less` (374 lines) - **COMPLEX** - HTML editor with extensive formatting
- [ ] `editor/base/editor.less` (144 lines) - **MEDIUM** - Base editor styles
- [ ] `editor/base/themes/editorTheme.less` (259 lines) - **COMPLEX** - Editor theme definitions
- [ ] `editor/base/tokenpickerbutton.less` (100 lines) - **MEDIUM** - Token picker button
- [ ] `editor/initializevariable/variableEditor.less` (37 lines) - **SIMPLE** - Variable editor
- [ ] `editor/monaco/monaco.less` (6 lines) - **SIMPLE** - Monaco editor integration
- [ ] `editor/shared/editorCollapseToggle.less` (30 lines) - **SIMPLE** - Editor collapse toggle
- [ ] `expressioneditor/expressioneditor.less` (67 lines) - **MEDIUM** - Expression editor
- [ ] `code/codeeditor.less` (35 lines) - **SIMPLE** - Code editor base

**Token & Picker Components**
- [ ] `tokenpicker/tokenpicker.less` (357 lines) - **COMPLEX** - Token picker with search and filtering
- [ ] `token/token.less` (65 lines) - **MEDIUM** - Token display styles
- [ ] `picker/picker.less` (99 lines) - **MEDIUM** - Generic picker component

**Form Components**
- [ ] `arrayeditor/arrayeditor.less` (211 lines) - **COMPLEX** - Array editor with dynamic rows
- [ ] `dictionary/dictionaryeditor.less` (141 lines) - **MEDIUM** - Dictionary editor
- [ ] `querybuilder/querybuilder.less` (218 lines) - **COMPLEX** - Query builder interface
- [ ] `schemaeditor/schemaeditor.less` (29 lines) - **SIMPLE** - Schema editor
- [ ] `combobox/combobox.less` (97 lines) - **MEDIUM** - Custom combobox
- [ ] `searchabledropdown/searchabledropdown.less` (7 lines) - **SIMPLE** - Searchable dropdown
- [ ] `searchabledropdownWithAddAll/searchabledropdownWithAddAll.less` (7 lines) - **SIMPLE** - Enhanced dropdown
- [ ] `recurrence/recurrence.less` (46 lines) - **SIMPLE** - Recurrence pattern editor
- [ ] `datetimeeditor/datetimeeditor.less` (18 lines) - **SIMPLE** - Date/time editor
- [ ] `workflowparameters/workflowparameters.less` (94 lines) - **MEDIUM** - Workflow parameters

**UI Components**
- [ ] `apicards.less` (268 lines) - **COMPLEX** - API cards with connector display
- [ ] `chatbot/chatbot.less` (459 lines) - **COMPLEX** - Chatbot interface
- [ ] `authentication/authentication.less` (111 lines) - **MEDIUM** - Authentication forms
- [ ] `azureResourcePicker/azureResourcePicker.less` (102 lines) - **MEDIUM** - Azure resource picker
- [ ] `connectorsummarycard/connectorsummarycard.less` (115 lines) - **MEDIUM** - Connector summary
- [ ] `monitoring/monitoring.less` (166 lines) - **MEDIUM** - Monitoring interface
- [ ] `monitoring/statuspill/statuspill.less` (55 lines) - **SIMPLE** - Status indicators
- [ ] `monitoring/statuspill/statuspill.story.less` (3 lines) - **SIMPLE** - Storybook styles
- [ ] `settings/settings.less` (208 lines) - **COMPLEX** - Settings panel
- [ ] `templates/templates.less` (173 lines) - **MEDIUM** - Template gallery
- [ ] `errorsPanel/errorsPanel.less` (172 lines) - **MEDIUM** - Error display panel

**Small/Utility Components**
- [ ] `actionbuttonv2/actionbuttonv2.less` (63 lines) - **SIMPLE** - Action button V2
- [ ] `about/about.less` (40 lines) - **SIMPLE** - About dialog
- [ ] `colorizer/colorizer.less` (60 lines) - **SIMPLE** - Color picker
- [ ] `connectioncontainer.less` (11 lines) - **SIMPLE** - Connection container
- [ ] `configItem/connectiongatewaypicker.less` (14 lines) - **SIMPLE** - Gateway picker
- [ ] `copilotGetStarted/copilot.less` (142 lines) - **MEDIUM** - Copilot onboarding
- [ ] `copyinputcontrol/copyinputcontrol.less` (70 lines) - **SIMPLE** - Copy input control
- [ ] `dynamicallyaddedparameter/dynamicallyaddedparameter.less` (77 lines) - **MEDIUM** - Dynamic parameters
- [ ] `dynamicallyaddedparameter/plugins/stringstack.less` (48 lines) - **SIMPLE** - String stack plugin
- [x] `error.less` (29 lines) - **SIMPLE** - Error display - ✅ COMPLETED
- [ ] `floatingactionmenu/_floatingactionmenu.less` (119 lines) - **MEDIUM** - Floating action menu
- [ ] `flyout/flyout.less` (50 lines) - **SIMPLE** - Flyout panel
- [ ] `modaldialog/modaldialog.less` (30 lines) - **SIMPLE** - Modal dialog
- [ ] `modals/styles.less` (3 lines) - **SIMPLE** - Modal styles
- [x] `nodeCollapseToggle/nodeCollapseToggle.less` (20 lines) - **SIMPLE** - Node collapse toggle - ✅ COMPLETED
- [x] `overview/overview.less` (30 lines) - **SIMPLE** - Overview component - ✅ COMPLETED
- [ ] `pager/pager.less` (83 lines) - **MEDIUM** - Pagination component
- [x] `peek/peek.less` (6 lines) - **SIMPLE** - Peek preview - ✅ COMPLETED
- [ ] `selector/listitem.less` (60 lines) - **SIMPLE** - List item selector
- [ ] `staticResult/staticResult.less` (145 lines) - **MEDIUM** - Static result display
- [x] `texteditor.less` (48 lines) - **SIMPLE** - Text editor base - ✅ COMPLETED
- [x] `tip/tip.less` (33 lines) - **SIMPLE** - Tooltip/tip component - ✅ COMPLETED
- [ ] `agentinstruction/agentinstruction.less` (21 lines) - **SIMPLE** - Agent instruction editor

**Unit Testing Components**
- [ ] `unitTesting/assertionsPanel/assertions.less` (72 lines) - **MEDIUM** - Assertions panel
- [ ] `unitTesting/conditionExpression/conditionExpression.less` (18 lines) - **SIMPLE** - Condition expression
- [ ] `unitTesting/mockStatusIcon/mockStatusIcon.less` (6 lines) - **SIMPLE** - Mock status icon
- [ ] `unitTesting/outputMocks/outputMocks.less` (5 lines) - **SIMPLE** - Output mocks

### 2. libs/designer (14 files)

**Main Aggregator**
- [ ] `ui/styles.less` (242 lines) - **COMPLEX** - Main designer styles aggregator
- [ ] `ui/logicapps.less` (2 lines) - **SIMPLE** - Designer-specific imports

**Panel Components**
- [ ] `ui/panel/connectionsPanel/connectionsPanel.less` (34 lines) - **SIMPLE** - Connections panel
- [ ] `ui/panel/connectionsPanel/allConnections/allConnections.less` (81 lines) - **MEDIUM** - All connections view
- [ ] `ui/panel/connectionsPanel/selectConnection/selectConnection.less` (36 lines) - **SIMPLE** - Connection selector
- [ ] `ui/panel/connectionsPanel/createConnection/createConnection.less` (53 lines) - **SIMPLE** - Connection creation
- [ ] `ui/panel/runHistoryPanel/runHistoryPanel.less` (27 lines) - **SIMPLE** - Run history panel
- [ ] `ui/panel/templatePanel/panel.less` (293 lines) - **COMPLEX** - Template panel

**Settings & UI Components**
- [ ] `ui/settings/sections/runafterconfiguration/runafterconfiguration.less` (90 lines) - **MEDIUM** - Run after configuration
- [ ] `ui/connections/runAfterIndicator/styles.less` (75 lines) - **MEDIUM** - Run after indicator
- [ ] `ui/templates/styles.less` (203 lines) - **COMPLEX** - Template styles
- [ ] `ui/templates/cards/templateCard.less` (159 lines) - **MEDIUM** - Template card

**Variables**
- [ ] `ui/less/logicapps/variables.less` (22 lines) - **SIMPLE** - Designer variables
- [ ] `ui/less/processsimple/variables.less` (19 lines) - **SIMPLE** - Process simple variables

### 3. libs/data-mapper (4 files)

**Legacy Data Mapper V1**
- [ ] `lib/styles.less` (3 lines) - **SIMPLE** - Main styles aggregator
- [ ] `lib/components/style.less` (9 lines) - **SIMPLE** - Component styles
- [ ] `lib/components/configPanel/style.less` (27 lines) - **SIMPLE** - Config panel
- [ ] `../../data-mapper-v2/src/components/schema/style.less` (27 lines) - **SIMPLE** - Schema component (Note: V2 is already migrated)

### 4. apps/vs-code-react (6 files remaining from 10) ✅ **MAJOR PROGRESS**

**Completed Migrations:**
- [x] `app/export/export.less` (120 lines) → exportStyles.ts - ✅ **COMPLETED** 
- [x] `app/overview/overview.less` (4 lines) → overviewStyles.ts - ✅ **COMPLETED**
- [x] `app/components/reviewList/styles.less` (32 lines) → reviewListStyles.ts - ✅ **COMPLETED** (PR #7907)
- [x] **SearchableDropdown Component** - ✅ **COMPLETED** (Branch: ccastrotrejo/FinalMigration)
  - Complete Fluent UI v9 migration
  - Enhanced with className merging and placeholder support
  - Proper selectedKeys support implementation

**Remaining Application Styles:**
- [ ] `styles.less` (4 lines) - **SIMPLE** - Root styles
- [ ] `app/dataMapper/app.less` (14 lines) - **SIMPLE** - Data mapper app
- [ ] `app/designer/app.less` (11 lines) - **SIMPLE** - Designer app
- [ ] `app/unitTest/unitTest.less` (25 lines) - **SIMPLE** - Unit test app

**Remaining Component Styles:**
- [ ] `app/components/searchableDropdown/styles.less` (11 lines) - **SIMPLE** - Searchable dropdown
- [ ] `app/components/validationDialog/styles.less` (40 lines) - **SIMPLE** - Validation dialog

**Recent Achievements (Branch: ccastrotrejo/FinalMigration):**
- ✅ **Complete Fluent UI v9 Migration**: SearchableDropdown, Export components, Table components
- ✅ **Enhanced Table Components**: Native v9 Table with column resizing
- ✅ **Package Dependencies Updated**: Fluent UI v8 dependencies removed
- ✅ **Theme Provider Enhanced**: Better v9 integration

### 5. apps/Standalone (2 files)

**Development Environment**
- [ ] `designer/app/LocalDesigner/pseudoCommandBar.less` (27 lines) - **SIMPLE** - Pseudo command bar
- [ ] `designer/components/settings_box.module.less` (83 lines) - **MEDIUM** - Settings box (CSS modules)

## Migration Priority Matrix

### Critical Infrastructure (Week 1-2)
**Must migrate first - other components depend on these**
1. `libs/designer-ui/src/lib/variables.less` (151 lines) - All variables
2. `libs/designer-ui/src/lib/mixins.less` (9 lines) - LESS mixins
3. `libs/designer-ui/src/lib/common.less` (39 lines) - Utility classes
4. `libs/designer-ui/src/lib/themes.less` (42 lines) - Theme definitions
5. `libs/designer-ui/src/lib/fabric.less` (15 lines) - Fluent UI integration
6. `libs/designer-ui/src/lib/styles.less` (253 lines) - Main aggregator

### High Priority - Core Components (Week 3-5)
**Most frequently used components**
1. `libs/designer-ui/src/lib/card/card.less` (512 lines) - **COMPLEX**
2. `libs/designer-ui/src/lib/panel/panel.less` (301 lines) - **COMPLEX**
3. `libs/designer-ui/src/lib/tokenpicker/tokenpicker.less` (357 lines) - **COMPLEX**
4. `libs/designer-ui/src/lib/html/htmleditor.less` (374 lines) - **COMPLEX**
5. `libs/designer-ui/src/lib/chatbot/chatbot.less` (459 lines) - **COMPLEX**
6. `libs/designer-ui/src/lib/apicards.less` (268 lines) - **COMPLEX**

### Medium Priority - Form & Editor Components (Week 6-8)
1. `libs/designer-ui/src/lib/editor/base/themes/editorTheme.less` (259 lines) - **COMPLEX**
2. `libs/designer-ui/src/lib/arrayeditor/arrayeditor.less` (211 lines) - **COMPLEX**
3. `libs/designer-ui/src/lib/querybuilder/querybuilder.less` (218 lines) - **COMPLEX**
4. `libs/designer-ui/src/lib/settings/settings.less` (208 lines) - **COMPLEX**
5. All remaining editor components (8 files)
6. All remaining card variants (9 files)

### Lower Priority - Utility & Special Components (Week 9-11)
1. Panel subcomponents (7 files)
2. Form components (remaining 12 files)
3. Monitoring components (3 files)
4. Unit testing components (4 files)
5. Small utility components (20 files)

### Application-Specific Styles (Week 12)
1. VS Code React app (9 files) - **REDUCED**: styles.less file completely removed
2. Standalone app (2 files)
3. Designer library (14 files)
4. Data mapper legacy (4 files)

## Complexity Assessment Criteria

### SIMPLE (0-50 lines, basic selectors)
- Few CSS properties
- No complex nesting
- No media queries
- Minimal theme overrides
- **Examples**: connectiontypeselector.less, peek.less, modals/styles.less

### MEDIUM (51-150 lines, moderate complexity)
- Some nesting and pseudo-selectors
- Basic responsive behavior
- Theme-aware styles
- Moderate variable usage
- **Examples**: cardv2.less, combobox.less, monitoring.less

### COMPLEX (150+ lines, high complexity)
- Deep nesting structures
- Extensive theme overrides
- Complex responsive behavior
- Heavy use of variables and mixins
- Animation/transition logic
- **Examples**: card.less, chatbot.less, htmleditor.less, tokenpicker.less

## Current Import Patterns

### TypeScript/JavaScript Files Importing LESS
- **Direct imports**: 21 files import LESS directly
- **Component-level imports**: Each component imports its own styles
- **Aggregator imports**: Main style files import multiple LESS files
- **Module imports**: Some files use CSS modules (.module.less)

### Main Import Points
1. `libs/designer/src/index.ts` → `ui/styles.less` (main designer export)
2. `libs/data-mapper/src/index.ts` → `lib/styles.less` (data mapper export)
3. `libs/designer-ui/src/lib/fabric.ts` → `fabric.less` (Fluent UI integration)
4. Component files → component-specific LESS files

## Dependencies & References

### Variable Dependencies
- 70+ files reference `variables.less`
- 15+ files reference `themes.less`  
- 8+ files reference `mixins.less`

### Internal LESS Imports
- `card.less` imports 10 other LESS files
- `styles.less` imports 71 LESS files
- `recommendation.less` imports 4 sub-panel files

## Migration Guidelines

### Phase 1: Infrastructure Setup
1. Create design tokens from variables.less
2. Convert mixins to TypeScript utility functions
3. Establish makeStyles patterns and conventions
4. Set up shared utilities and helpers

### Phase 2: Critical Path Migration
1. Start with components that have no LESS dependencies
2. Migrate infrastructure files (variables, mixins, common)
3. Update main aggregator files
4. Migrate high-usage components

### Phase 3: Systematic Component Migration
1. Migrate by complexity level (simple → complex)
2. Update component imports as you go
3. Remove LESS imports from aggregator files
4. Test thoroughly at each step

### Phase 4: Application-Specific & Cleanup
1. Migrate app-specific LESS files
2. Remove LESS build infrastructure
3. Clean up unused files
4. Update documentation

## Success Metrics

### Performance Targets
- 20%+ reduction in CSS bundle size
- Improved tree-shaking efficiency
- Faster development build times
- Better runtime performance

### Quality Targets
- 100% visual fidelity maintained
- All theme variations working
- No broken responsive behavior
- Type-safe styling throughout

## Risk Assessment

### High Risk Files
1. **card.less** (512 lines) - Core component, extensive panel mode logic
2. **chatbot.less** (459 lines) - Complex conversational UI
3. **htmleditor.less** (374 lines) - Rich text editor with formatting
4. **tokenpicker.less** (357 lines) - Complex search and filter logic
5. **editor/themes/editorTheme.less** (259 lines) - Editor theme definitions

### Medium Risk Files
- Components with deep nesting (10+ files)
- Files with extensive theme overrides (15+ files)
- Components with animations/transitions (5+ files)

### Low Risk Files
- Simple utility components (30+ files)
- Single-purpose components with minimal styling
- Already well-structured components

This analysis provides a comprehensive roadmap for migrating all 124 LESS files to makeStyles, with clear prioritization based on complexity, dependencies, and business impact.