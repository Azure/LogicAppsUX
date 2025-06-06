---
sidebar_position: 1
slug: /
title: Getting Started
---

# Welcome to Azure Logic Apps UX

Build powerful workflow experiences with our comprehensive UI components and design system. This monorepo contains everything you need to create modern workflow designer applications.

## Getting Started

Welcome to the Azure Logic Apps UX monorepo! This comprehensive guide will help you set up your development environment and start contributing to the project.

## What is Logic Apps UX?

Azure Logic Apps UX is a collection of UI components and tools that power the visual workflow designer experience across multiple platforms:

- **Azure Portal** - The web-based designer in Azure
- **VS Code Extension** - Local development experience
- **Power Automate** - Microsoft's low-code automation platform
- **Standalone Designer** - Development and testing environment

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Node.js** v18 or higher (v20 recommended)
- **PNPM** v9 or higher
- **Git** (latest version)
- **VS Code** (for extension development)

### Installing Node.js

We recommend using Node Version Manager (NVM) to manage Node.js versions:

#### Windows
```bash
# Install NVM for Windows from:
# https://github.com/coreybutler/nvm-windows

# Then install Node.js:
nvm install 20.19.0
nvm use 20.19.0
```

#### macOS/Linux
```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js
nvm install 20.19.0
nvm use 20.19.0
```

### Installing PNPM

PNPM is our package manager of choice for this monorepo:

```bash
# Install via npm
npm install -g pnpm@latest

# Or use Corepack (comes with Node.js 16.9+)
corepack enable
corepack prepare pnpm@latest --activate
```

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Azure/LogicAppsUX.git
cd LogicAppsUX
```

### 2. Install Dependencies

From the repository root, run:

```bash
pnpm install
```

This will install all dependencies for all packages in the monorepo.

### 3. Build the Project

For your first build, run:

```bash
pnpm run build
```

This builds all libraries and applications in dependency order.

## Quick Start Commands

Here are the most common commands you'll use:

```bash
# Start the development server (Standalone Designer)
pnpm run start

# Run unit tests
pnpm run test:lib

# Run E2E tests (mock API)
pnpm run test:e2e --grep @mock

# Build libraries for production
pnpm run build:lib

# Format and lint code
pnpm run check
```

## Development Environments

### Standalone Designer

The standalone designer is your primary development environment for testing changes quickly:

```bash
# Start the development server
pnpm run start

# The app will be available at https://localhost:4200
```

Features:
- Hot module replacement for instant feedback
- Mock API for offline development
- All designer and data mapper features
- Template testing environment

### VS Code Extension Development

To work on the VS Code extension:

```bash
# Build the extension
pnpm run build:extension

# Package the extension
pnpm run vscode:designer:pack
```

Then open VS Code and press `F5` to launch a new VS Code window with the extension loaded.

### Testing Against Live Azure APIs

To test with real Azure resources:

```bash
# Generate ARM token (requires Azure CLI)
pnpm run generateArmToken

# Start with ARM authentication
pnpm run start:arm
```

## Project Structure Overview

```
LogicAppsUX/
├── apps/                    # Applications
│   ├── Standalone/         # Development environment
│   ├── docs/              # This documentation site
│   ├── vs-code-designer/  # VS Code extension
│   └── vs-code-react/     # VS Code webviews
├── libs/                   # Shared libraries
│   ├── designer/          # Main designer component
│   ├── data-mapper-v2/    # Data transformation UI
│   ├── designer-ui/       # Shared UI components
│   └── logic-apps-shared/ # Common utilities
├── e2e/                   # End-to-end tests
└── package.json          # Root package configuration
```

## Next Steps

Now that you have your environment set up:

1. **[Explore the Architecture](./architecture)** - Understand how the project is organized
2. **[Development Workflow](./Development/workflow)** - Learn our development practices
3. **[Testing Guide](./Development/Testing)** - Write and run tests
4. **[Contributing](./contributing)** - Submit your first pull request

## Troubleshooting

### Common Issues

**PNPM install fails**
```bash
# Clear PNPM cache
pnpm store prune

# Remove node_modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Port 4200 already in use**
```bash
# Find and kill the process
# On macOS/Linux:
lsof -ti:4200 | xargs kill -9

# On Windows (findstr and taskkill are Windows commands):
netstat -ano | findstr :4200
taskkill /PID <pid> /F
```

**Build errors after pulling latest changes**
```bash
# Clean build artifacts and rebuild
pnpm run clean
pnpm install
pnpm run build
```

## Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/Azure/LogicAppsUX/issues)
- **Documentation**: You're already here!
- **Team Chat**: Reach out on Microsoft Teams (internal only)

## Power Automate Designer Community Contribution

If you're contributing from the Power Automate team, please note:
- Follow the same setup process
- Coordinate with the Logic Apps team for large changes
- Ensure changes work across both Logic Apps and Power Automate contexts
