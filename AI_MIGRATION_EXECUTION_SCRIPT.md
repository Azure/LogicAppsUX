# AI Migration Execution Script

## Practical AI Execution Steps for LESS to makeStyles Migration

### Step 1: Pattern Analysis and Learning Phase

```typescript
// 1. Analyze existing successful migration (chatbot)
const analyzeSuccessfulMigration = {
  source: '/libs/chatbot/src/lib/ui/styles.less',
  target: '/libs/chatbot/src/lib/ui/styles.ts',
  patterns: {
    // AI extracts these patterns:
    containerPattern: 'className.container -> makeStyles.container',
    tokenMapping: '@variable -> tokens.specificToken',
    nestedSelectors: '&:hover -> selectors: { ":hover": {} }',
    mediaQueries: '@media -> selectors: { "@media": {} }',
    themeOverrides: 'separate dark theme styles function'
  }
};

// 2. Build transformation templates
const transformationTemplates = {
  basicStyle: (property, value) => `${property}: "${value}"`,
  tokenReference: (token) => `tokens.${token}`,
  spacing: (value) => `tokens.spacing${capitalize(value)}`,
  makeStylesWrapper: (styles) => `
    import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
    
    export const useStyles = makeStyles({
      ${styles}
    });
  `
};
```

### Step 2: Automated Migration Tasks

#### Task 1: Migrate Simple Utility Styles
```yaml
target_files:
  - /libs/designer-ui/src/lib/common.less
  - /libs/designer-ui/src/lib/fabric.less
  
ai_instructions: |
  1. Extract all class definitions
  2. Convert to makeStyles format
  3. Replace color variables with tokens from designTokens.ts
  4. Handle nested selectors properly
  5. Create TypeScript file with proper exports
```

#### Task 2: Migrate Component Styles (Batch Processing)
```yaml
batch_1_simple_components:
  files:
    - /libs/designer-ui/src/lib/dropdown/dropdown.less
    - /libs/designer-ui/src/lib/checkbox/checkbox.less
    - /libs/designer-ui/src/lib/label/label.less
  
  ai_pattern: |
    For each file:
    1. Create ComponentName.styles.ts
    2. Import required tokens and utilities
    3. Convert all styles maintaining exact visual output
    4. Update component to use useStyles hook
    5. Remove .less import from component
    6. Test compilation
```

#### Task 3: Complex Component Migration
```yaml
complex_components:
  - file: /libs/designer-ui/src/lib/card/card.less
    substeps:
      - Extract base card styles
      - Handle state variations (hover, selected, disabled)
      - Convert animations and transitions
      - Migrate responsive styles
      - Handle theme-specific overrides
```

### Step 3: AI Validation Pipeline

```typescript
// Automated validation for each migrated component
const validateMigration = async (componentPath) => {
  const tasks = [
    // 1. TypeScript compilation
    { 
      cmd: 'pnpm run build:lib',
      validateOutput: (output) => !output.includes('error')
    },
    
    // 2. Visual comparison (if possible)
    {
      cmd: 'pnpm run test:visual',
      component: componentPath,
      validateOutput: (output) => output.includes('0 visual differences')
    },
    
    // 3. Bundle size check
    {
      cmd: 'pnpm run analyze:bundle',
      validateOutput: (output) => {
        const before = output.cssSize.before;
        const after = output.cssSize.after;
        return after <= before;
      }
    }
  ];
  
  return executeValidation(tasks);
};
```

### Step 4: Actual AI Commands to Execute

#### Phase 1: Foundation Setup (Do these first)

```bash
# 1. Analyze all LESS variables and create comprehensive token mappings
ai_task_1: "Analyze all .less files in /libs/designer-ui/src/lib/ and extract every unique color, spacing, and size variable. Map each to the appropriate token in designTokens.ts or flag for custom token creation."

# 2. Create utility functions from mixins
ai_task_2: "Convert all mixins from /libs/designer-ui/src/lib/mixins.less to TypeScript utility functions. Create a new file /libs/designer-ui/src/lib/utils/styles/mixins.ts with functions like truncateText(), flexCenter(), etc."

# 3. Set up makeStyles utilities
ai_task_3: "Create /libs/designer-ui/src/lib/utils/styles/index.ts with helper functions for common patterns: mergeStyles, conditionalStyles, themeAwareStyles"
```

#### Phase 2: Start Component Migration

```bash
# 4. Migrate first simple component as template
ai_task_4: "Migrate /libs/designer-ui/src/lib/label/label.less to makeStyles:
- Create label.styles.ts
- Convert all styles exactly
- Update Label component to use useStyles
- Ensure it compiles and maintains visual appearance"

# 5. Batch migrate similar simple components
ai_task_5: "Using the pattern from label migration, migrate these similar components:
- checkbox/checkbox.less
- toggle/toggle.less  
- spinner/spinner.less
Apply the exact same transformation pattern"

# 6. Migrate a complex component
ai_task_6: "Migrate /libs/designer-ui/src/lib/card/card.less:
- Break into logical sections (header, body, footer, states)
- Create comprehensive styles object
- Handle all pseudo-selectors and nested styles
- Ensure all theme variations work"
```

#### Phase 3: Validation and Optimization

```bash
# 7. Validate all migrations
ai_task_7: "For each migrated component:
- Run TypeScript compilation
- Check that all styles are applied correctly
- Verify theme switching works
- Ensure no visual regressions"

# 8. Optimize and deduplicate
ai_task_8: "Analyze all migrated styles and:
- Extract common patterns to shared utilities
- Consolidate duplicate style definitions
- Optimize token usage
- Reduce bundle size"
```

### AI Execution Checklist

#### Day 1 Tasks
- [ ] Complete analysis of all LESS files
- [ ] Map all variables to tokens
- [ ] Create utility functions from mixins
- [ ] Set up makeStyles infrastructure
- [ ] Migrate 5 simple components

#### Day 2 Tasks  
- [ ] Migrate 20 medium complexity components
- [ ] Handle all form components
- [ ] Start complex component migration
- [ ] Run validation on completed components

#### Day 3 Tasks
- [ ] Complete all remaining components
- [ ] Fix any compilation errors
- [ ] Run visual regression tests
- [ ] Optimize bundle size

#### Day 4 Tasks
- [ ] Final validation pass
- [ ] Performance testing
- [ ] Documentation updates
- [ ] Prepare for deployment

### Monitoring AI Progress

```typescript
// Track migration progress
const migrationTracker = {
  totalFiles: 124,
  completed: [],
  inProgress: [],
  failed: [],
  
  updateStatus: (file, status) => {
    // AI updates this after each file
  },
  
  getProgress: () => {
    return {
      percentage: (completed.length / totalFiles) * 100,
      estimatedCompletion: calculateETA(),
      blockers: failed.map(f => f.error)
    };
  }
};
```

### AI Self-Correction Patterns

```typescript
// When AI encounters issues
const errorHandlers = {
  'Cannot find token': (error) => {
    // AI creates custom token in designTokens.ts
  },
  
  'Style mismatch': (error) => {
    // AI adjusts transformation to match exactly
  },
  
  'Compilation error': (error) => {
    // AI fixes TypeScript issues
  },
  
  'Import not found': (error) => {
    // AI updates import paths
  }
};
```

## Ready-to-Use AI Prompts

### Prompt 1: Start Migration
```
"Analyze the successful migration pattern in /libs/chatbot/src/lib/ui/styles.ts and apply the same transformation pattern to /libs/designer-ui/src/lib/dropdown/dropdown.less. Create dropdown.styles.ts with makeStyles, update the component to use it, and ensure it compiles correctly."
```

### Prompt 2: Batch Migration
```
"You've successfully migrated dropdown.less. Now apply the exact same pattern to migrate these files in parallel:
- checkbox/checkbox.less
- label/label.less  
- spinner/spinner.less
- toggle/toggle.less
Maintain the same structure and patterns you used for dropdown."
```

### Prompt 3: Complex Component
```
"Migrate the complex card component at /libs/designer-ui/src/lib/card/card.less. This is 512 lines and includes:
- Multiple state variations
- Nested selectors
- Theme-specific styles
- Animations
- Responsive breakpoints
Break it into logical sections and ensure every style is preserved exactly."
```

## Success Validation

After each migration, verify:
1. `pnpm run build:lib` succeeds
2. Component renders identically
3. Theme switching works
4. No TypeScript errors
5. Bundle size didn't increase significantly

This execution script provides concrete, actionable steps for AI to follow, with clear patterns and validation at each stage.