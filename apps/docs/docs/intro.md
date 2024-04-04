---
sidebar_position: 1
slug: /
---

# Getting Started

Welcome to the LogicApps UX documentation! This guide will help new engineers set up and navigate the project. Make sure to follow the steps below to ensure a smooth setup process. You can find the details about Power Automate Designer Community Contribution at the end of this doc.

## Prerequisites

Ensure you have the following installed on your system:

- Node.js v18 or higher
- PNPM 

### Pnpm CLI Installation (Recommended)

Check here for system specific ways to install:

Or you can just install using npm:

```bash
npm install -g pnpm
```

## Running the Code

First, navigate to the root level of the repository and run:

```bash
pnpm install
```

### Standalone Designer (for testing)

- Code Location: `/apps/designer-standalone`

To start the standalone designer, run(from the root):

```bash
pnpm turbo run dev
```

### Building the Production Librarys (for NPM publishing)

- Code Location: `/libs/*`

To build the designer library, run:

```bash
pnpm turbo run build:lib
```

### Unit Tests

- Code Location: `/libs/designer/**/__test__/*.spec.ts(x)`

To run unit tests, execute:

```bash
pnpm turbo run test:lib
```

### End-to-End (E2E) Tests

- Code Location: `/e2e`

To run E2E tests, execute:

```bash
pnpm run test:e2e
```
