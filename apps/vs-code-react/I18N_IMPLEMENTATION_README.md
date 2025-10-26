# Centralized Internationalization (i18n) System

## Summary

This implementation establishes a centralized, type-safe internationalization system for the vs-code-react application, eliminating duplicate message definitions and improving maintainability.

## What Was Implemented

### 1. Core Files Created

#### `/src/intl/messages.ts`
Centralized repository for all i18n message definitions organized by feature:
- `commonMessages` - Shared UI text (Loading, Save, Cancel, etc.)
- `unitTestMessages` - Unit test interface messages
- `workspaceMessages` - Workspace/workflow creation messages
- `exportMessages` - Export flow messages
- `designerMessages` - Designer-specific messages
- `overviewMessages` - Overview page messages

#### `/src/intl/useIntlMessages.ts`
Custom React hook that:
- Accepts message definitions from `defineMessages()`
- Returns fully formatted strings via `useIntl().formatMessage()`
- Uses `useMemo` for performance optimization
- Provides full TypeScript type safety

#### `/src/intl/index.ts`
Barrel export for convenient imports

### 2. Core Infrastructure Updates

#### `/src/main.tsx`
- Added `messages` import from compiled strings
- Integrated `IntlProvider` with locale messages
- Wrapped app with `IntlGlobalProvider` for global intl access
- Enables `getIntl()` usage outside React components

#### `/libs/logic-apps-shared/src/intl/src/index.ts`
- Exported `IntlGlobalProvider` to make it available to consuming applications

### 3. Component Migrations (Examples)

Migrated 3 components to demonstrate the pattern:
- ✅ `src/app/unitTest/index.tsx`
- ✅ `src/app/designer/app.tsx`
- ✅ `src/app/createWorkspace/steps/workflowTypeStep.tsx`

## Usage Examples

### Before (Old Pattern)
```tsx
import { useIntl } from 'react-intl';

const MyComponent = () => {
  const intl = useIntl();
  
  const intlText = {
    LOADING: intl.formatMessage({
      defaultMessage: 'Loading',
      id: 'mG7TYm',
      description: 'Loading text',
    }),
    SAVE: intl.formatMessage({
      defaultMessage: 'Save',
      id: 'jvo0vs',
      description: 'Save button text',
    }),
  };
  
  return <button>{intlText.SAVE}</button>;
};
```

### After (New Pattern)
```tsx
import { useIntlMessages, commonMessages } from '../../intl';

const MyComponent = () => {
  const intlText = useIntlMessages(commonMessages);
  
  return <button>{intlText.SAVE}</button>;
};
```

## Benefits

✅ **Single Source of Truth** - All messages defined once in `/src/intl/messages.ts`  
✅ **No Duplication** - Reuse messages across components without copy-paste  
✅ **Type Safety** - TypeScript autocomplete for message keys  
✅ **Better Performance** - `useMemo` prevents unnecessary re-formatting  
✅ **Easier Maintenance** - Update a message in one place, reflected everywhere  
✅ **Consistent IDs** - Prevents duplicate or conflicting message IDs  
✅ **Cleaner Code** - Less boilerplate in components  

## Migration Guide

See [`I18N_MIGRATION_GUIDE.md`](./I18N_MIGRATION_GUIDE.md) for:
- Complete usage instructions
- Step-by-step migration process
- List of remaining files to migrate (21 files)
- Best practices for adding new messages

## Remaining Work

24 component files originally used `intl.formatMessage()`. 3 have been migrated as examples, leaving 21 files to migrate:

- [ ] `src/app/designer/appV2.tsx`
- [ ] `src/app/designer/DesignerCommandBar/index.tsx`
- [ ] `src/app/designer/DesignerCommandBar/indexV2.tsx`
- [ ] `src/app/createWorkspace/steps/packageNameStep.tsx`
- [ ] `src/app/createWorkspace/steps/workspaceNameStep.tsx`
- [ ] `src/app/createWorkspace/steps/reviewCreateStep.tsx`
- [ ] `src/app/createWorkspace/steps/logicAppTypeStep.tsx`
- [ ] `src/app/createWorkspace/steps/dotNetFrameworkStep.tsx`
- [ ] `src/app/createWorkspace/createWorkspace.tsx`
- [ ] `src/app/export/instanceSelection/instanceSelection.tsx`
- [ ] `src/app/export/workflowsSelection/filters.tsx`
- [ ] `src/app/export/workflowsSelection/selectedList.tsx`
- [ ] `src/app/export/workflowsSelection/advancedOptions.tsx`
- [ ] `src/app/export/workflowsSelection/workflowsSelection.tsx`
- [ ] `src/app/export/navigation/navigation.tsx`
- [ ] `src/app/export/status/status.tsx`
- [ ] `src/app/export/export.tsx`
- [ ] `src/app/export/validation/validation.tsx`
- [ ] `src/app/export/summary/managedConnections.tsx`
- [ ] `src/app/export/summary/summary.tsx`
- [ ] `src/app/export/summary/newResourceGroup.tsx`
- [ ] `src/app/overview/app.tsx`

## Testing

The implementation was validated with:
```bash
cd /Users/carloscastrotrejo/Documents/dev/LogicAppsUX/apps/vs-code-react
npx vite build
```

Build succeeded with all TypeScript types correctly resolved.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        main.tsx                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ IntlProvider (messages from compiled strings)        │   │
│  │   └─ IntlGlobalProvider                              │   │
│  │       └─ App Components                              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├─ provides intl context
                            │
        ┌───────────────────┴───────────────────────┐
        │                                           │
┌───────▼────────┐                       ┌──────────▼─────────┐
│  Component A   │                       │   Component B      │
│                │                       │                    │
│  const intl =  │                       │  const intl =      │
│    useIntl     │                       │    useIntl         │
│      Messages  │                       │      Messages      │
│    (common     │                       │    (workspace      │
│     Messages)  │                       │     Messages)      │
│                │                       │                    │
│  {intl.SAVE}   │                       │  {intl.WORKFLOW_   │
│                │                       │    CONFIGURATION}  │
└────────────────┘                       └────────────────────┘
        │                                           │
        └──────────────┬────────────────────────────┘
                       │
                       │ message definitions from
                       │
              ┌────────▼────────┐
              │ /intl/messages  │
              │                 │
              │ - commonMessages│
              │ - workspace     │
              │   Messages      │
              │ - etc.          │
              └─────────────────┘
```

## Notes

- Messages are automatically extracted and compiled by the build system
- All message IDs must be unique across the application
- The `IntlGlobalProvider` enables `getIntl()` for non-React code
- Locale messages come from `@microsoft/logic-apps-shared/src/intl/compiled-lang/strings.json`
