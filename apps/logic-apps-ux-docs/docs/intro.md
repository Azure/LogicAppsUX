---
sidebar_position: 1
slug: /
---

# Getting Started

Welcome to the LogicApps UX documentation! This guide will help new engineers set up and navigate the project. Make sure to follow the steps below to ensure a smooth setup process.

## Prerequisites

Ensure you have the following installed on your system:

- Node.js v16 or higher
- MkCert
- (Optional) Nx CLI

### MkCert Installation

MkCert is a one-time installation. Follow the instructions provided at [MkCert GitHub Repository](https://github.com/FiloSottile/mkcert) to install it. After the installation, run the following command:

```bash
mkcert -install
```

### Nx CLI Installation (Recommended)

To install the Nx CLI, run:

```bash
npm install -g nx
```

## Running the Code

First, navigate to the root level of the repository and run:

```bash
npm install
```

**Note:** All commands should be executed from the root repo directory.

### Standalone Designer (for testing)

- Code Location: `/apps/designer-standalone`

To start the standalone designer, run:

```bash
nx serve
```

### Building the Designer Library (for NPM publishing)

- Code Location: `/libs/designer`

To build the designer library, run:

```bash
nx run designer:build
```

### Unit Tests

- Code Location: `/libs/designer/**/__test__/*.spec.ts(x)`

To run unit tests, execute:

```bash
nx test designer
```

**Debugging tests:** For easier debugging, install [Jest for VS Code](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest). No additional configuration should be needed, but you may need to restart your VSCode instance.

### End-to-End (E2E) Tests

- Code Location: `/apps/designer-e2e`

To run E2E tests, execute:

```bash
nx run designer-e2e:e2e
```
