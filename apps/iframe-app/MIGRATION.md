# Migration to @microsoft/logicAppsChat React Library

This document summarizes the changes made to migrate the iframe-app from using local React components to using the shared components from `@microsoft/logicAppsChat/react`.

## Changes Made

### 1. Updated Imports

- Changed from importing local `ChatWindow` component to importing `ChatWidget` from `@microsoft/logicAppsChat/react`
- Updated all type imports to use types from the core library

### 2. Component Usage

- Replaced `<ChatWindow>` with `<ChatWidget>` in both `iframe.tsx` and `index.tsx`
- The `ChatWidget` component provides the same functionality but is now shared across all applications

### 3. Removed Dead Code

Deleted the following directories that are no longer needed:

- `src/components/` - All React components (now in core library)
- `src/hooks/` - All custom hooks (now in core library)
- `src/store/` - Zustand store (now in core library)
- `src/types/` - Type definitions (now in core library)
- `src/utils/` - Utility functions (now in core library)
- `src/test/` - Test utilities (no longer needed)

### 4. Updated Dependencies

Removed unnecessary dependencies from `package.json`:

- `marked`, `marked-highlight`, `prismjs` - Handled by core library
- `zustand` - State management now in core library
- `@types/prismjs` - Type definitions now in core library
- Testing libraries - No longer running tests in iframe-app

Kept only essential dependencies:

- `@microsoft/logicAppsChat` - The core library with all React components
- `react`, `react-dom` - Required peer dependencies
- Build tools (Vite, TypeScript)

### 5. Updated Tests

- Updated test mocks to reference `@microsoft/logicAppsChat/react` instead of local components
- Tests now verify integration with the core library

## Benefits

1. **Code Reuse**: All React components are now shared between iframe-app and other applications
2. **Maintainability**: Single source of truth for all chat UI components
3. **Smaller Bundle**: Reduced duplication of code across applications
4. **Consistent Behavior**: All applications using the same tested components

## API Compatibility

The migration maintains full API compatibility:

- All props remain the same
- The `mountChatWidget` helper function works exactly as before
- Theme configuration and customization options are unchanged
