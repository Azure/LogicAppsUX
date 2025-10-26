# Centralized i18n Implementation Guide

## Overview

This project now uses a centralized internationalization (i18n) approach to avoid duplicate message definitions across components. All i18n strings are defined in a single location and can be accessed via a custom hook.

## Architecture

### Components

1. **`src/intl/messages.ts`** - Centralized message definitions using `defineMessages()`
2. **`src/intl/useIntlMessages.ts`** - Custom hook to format messages
3. **`src/intl/index.ts`** - Barrel export for easy imports
4. **`src/main.tsx`** - Updated with `IntlGlobalProvider` and locale messages

### Integration with Global State

The `IntlProvider` now includes:
- Locale messages from `@microsoft/logic-apps-shared`
- `IntlGlobalProvider` wrapper for global access via `getIntl()`
- Proper error handling for missing translations

## Usage

### For New Components

```tsx
import { useIntlMessages, commonMessages } from '../../intl';

const MyComponent = () => {
  const intlText = useIntlMessages(commonMessages);
  
  return <div>{intlText.LOADING}</div>;
};
```

### For Existing Components (Migration)

#### Before:
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
  };
  
  return <div>{intlText.LOADING}</div>;
};
```

#### After:
```tsx
import { useIntlMessages, commonMessages } from '../../intl';

const MyComponent = () => {
  const intlText = useIntlMessages(commonMessages);
  
  return <div>{intlText.LOADING}</div>;
};
```

## Message Categories

Messages are organized into logical groups:

- **`commonMessages`** - Shared messages (Loading, Save, Cancel, etc.)
- **`unitTestMessages`** - Unit test related messages
- **`workspaceMessages`** - Workspace creation messages
- **`exportMessages`** - Export flow messages
- **`designerMessages`** - Designer specific messages
- **`overviewMessages`** - Overview page messages

## Adding New Messages

1. Open `src/intl/messages.ts`
2. Add your message to the appropriate category or create a new one:

```typescript
export const myFeatureMessages = defineMessages({
  MY_MESSAGE: {
    defaultMessage: 'Hello World',
    id: 'abc123', // Generate unique ID
    description: 'Greeting message',
  },
});
```

3. Export the new category in `src/intl/index.ts`:

```typescript
export { myFeatureMessages } from './messages';
```

4. Use in your component:

```tsx
import { useIntlMessages, myFeatureMessages } from '../../intl';

const intlText = useIntlMessages(myFeatureMessages);
```

## Migration Checklist

Files migrated (24 total) - ✅ ALL COMPLETE:

- [x] `src/app/unitTest/index.tsx`
- [x] `src/app/designer/app.tsx`
- [x] `src/app/designer/appV2.tsx`
- [x] `src/app/designer/DesignerCommandBar/index.tsx`
- [x] `src/app/designer/DesignerCommandBar/indexV2.tsx`
- [x] `src/app/createWorkspace/steps/packageNameStep.tsx`
- [x] `src/app/createWorkspace/steps/workflowTypeStep.tsx`
- [x] `src/app/createWorkspace/steps/workspaceNameStep.tsx` (hybrid)
- [x] `src/app/createWorkspace/steps/reviewCreateStep.tsx` (hybrid)
- [x] `src/app/createWorkspace/steps/logicAppTypeStep.tsx` (hybrid)
- [x] `src/app/createWorkspace/steps/dotNetFrameworkStep.tsx` (hybrid)
- [x] `src/app/createWorkspace/createWorkspace.tsx`
- [x] `src/app/export/instanceSelection/instanceSelection.tsx`
- [x] `src/app/export/workflowsSelection/filters.tsx`
- [x] `src/app/export/workflowsSelection/selectedList.tsx`
- [x] `src/app/export/workflowsSelection/advancedOptions.tsx`
- [x] `src/app/export/workflowsSelection/workflowsSelection.tsx`
- [x] `src/app/export/navigation/navigation.tsx`
- [x] `src/app/export/status/status.tsx`
- [x] `src/app/export/export.tsx`
- [x] `src/app/export/validation/validation.tsx`
- [x] `src/app/export/summary/managedConnections.tsx`
- [x] `src/app/export/summary/summary.tsx`
- [x] `src/app/export/summary/newResourceGroup.tsx`
- [x] `src/app/overview/app.tsx`

**Note:** Files marked "(hybrid)" use both `useIntlMessages()` for static text and `useIntl().formatMessage()` for dynamic messages with parameters.

## Benefits

✅ **Single Source of Truth** - All messages in one place  
✅ **No Duplication** - Messages defined once, used everywhere  
✅ **Type Safety** - TypeScript ensures correct usage  
✅ **Better Performance** - `useMemo` optimizes re-renders  
✅ **Easier Maintenance** - Update messages in one location  
✅ **Consistent IDs** - Avoid duplicate or conflicting message IDs  

## Notes

- The `IntlProvider` now loads compiled strings from `@microsoft/logic-apps-shared`
- `IntlGlobalProvider` enables access to intl outside React components via `getIntl()`
- Message IDs should be unique across the entire application
- Always provide meaningful descriptions for translators
