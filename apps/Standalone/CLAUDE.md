# Standalone App

Development environment for the Logic Apps Designer. This Vite-powered React application provides a local development and testing environment for all designer libraries.

## Purpose

- **Primary development environment** for the designer libraries
- **Live testing** against Azure ARM APIs with real workflows
- **Local testing** with mock data and services
- **E2E test host** for Playwright tests

## Commands

```bash
pnpm run dev        # Start dev server (https://localhost:4200)
pnpm run build      # Production build
pnpm run e2e        # Start with E2E test configuration
```

## Key Entry Points

- `src/main.tsx` - Application bootstrap
- `src/App.tsx` - Route configuration
- `src/designer/app/DesignerShell/` - Designer wrapper components
- `src/designer/app/LocalDesigner/` - Local mock environment
- `src/designer/app/AzureLogicAppsDesigner/` - Azure-connected environment

## Available Modes

### Local Mode (Default)
Uses mock services and local workflow definitions. Good for:
- UI development without Azure dependencies
- Testing new features in isolation
- Running E2E tests

### ARM Mode (`pnpm run start:arm`)
Connects to real Azure APIs. Requires:
- Azure subscription
- ARM token (generate with `pnpm run generateArmToken`)
- Configured workflow in Azure

## Route Structure

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Designer | Main workflow designer |
| `/designer-v2` | DesignerV2 | Next-gen designer preview |
| `/templates` | Templates | Workflow templates gallery |
| `/datamapper` | DataMapper | Data transformation tool |
| `/datamapper-v2` | DataMapperV2 | Current data mapper |
| `/vscode/*` | VSCode* | VS Code webview previews |

## Configuration

### Environment Variables
- `VITE_ARM_TOKEN` - Azure ARM bearer token
- `VITE_DEV_MODE` - Enable development features

### Settings Panel
The app includes a settings panel (gear icon) to configure:
- Workflow source (local/Azure)
- Logic app selection
- Theme (light/dark)
- Locale settings

## Development Tips

1. **Hot Reload**: Changes to library code are reflected immediately
2. **Redux DevTools**: Full state inspection in browser
3. **React Query DevTools**: Server state debugging
4. **Network Tab**: Monitor API calls to Azure

## Testing

This app hosts E2E tests:
```bash
pnpm run test:e2e        # Run headless
pnpm run test:e2e:ui     # Run with Playwright UI
```

E2E tests are located in `/e2e/` at the repo root.

## Dependencies

Consumes all major libraries:
- `@microsoft/logic-apps-designer`
- `@microsoft/logic-apps-designer-v2`
- `@microsoft/designer-ui`
- `@microsoft/logic-apps-shared`
- `@microsoft/logic-apps-data-mapper`
- `@microsoft/logic-apps-data-mapper-v2`
- `@microsoft/logic-apps-chatbot`
