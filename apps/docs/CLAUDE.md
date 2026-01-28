# Documentation Site

Docusaurus-powered documentation site for the Logic Apps UX project.

## Purpose

- **Public documentation** for Logic Apps Designer
- **API reference** for library consumers
- **Architecture guides** for contributors
- **Changelog and release notes**

## Commands

```bash
pnpm run start       # Start dev server with hot reload
pnpm run build:docs  # Build static site
pnpm run serve       # Serve production build locally
pnpm run clear       # Clear Docusaurus cache
```

## Structure

```
/docs           - Markdown documentation files
/src
  /components   - Custom React components
  /css          - Global styles
  /pages        - Custom pages
/static         - Static assets (images, files)
/docusaurus.config.js - Site configuration
/sidebars.js    - Navigation structure
```

## Adding Documentation

1. Create `.md` or `.mdx` file in `/docs`
2. Add frontmatter with title and sidebar position
3. Update `sidebars.js` if needed

Example frontmatter:
```yaml
---
title: My Page Title
sidebar_position: 3
---
```

## Features

- **Mermaid diagrams** - Enabled via plugin
- **Remote content** - Can pull from external sources
- **MDX support** - React components in markdown
- **Versioning** - Document multiple versions

## Development Notes

- Built separately from main app
- Deployed to GitHub Pages
- Uses Docusaurus 3.x

## Dependencies

Standalone - no dependencies on other workspace packages.
