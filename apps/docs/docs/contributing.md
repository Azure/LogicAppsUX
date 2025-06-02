---
sidebar_position: 10
---

# Contributing Guide

Thank you for your interest in contributing to Azure Logic Apps UX! This guide will help you get started with contributing to our monorepo.

## Code of Conduct

This project follows Microsoft's [Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

Before contributing, ensure you have:

1. **Development Environment** set up as described in our [Getting Started guide](/)
2. **Git** configured with your name and email
3. **GitHub account** with SSH keys configured
4. **Microsoft CLA** signed (automatically prompted on your first PR)

### Forking and Cloning

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone git@github.com:YOUR_USERNAME/LogicAppsUX.git
   cd LogicAppsUX
   ```
3. Add the upstream remote:
   ```bash
   git remote add upstream https://github.com/Azure/LogicAppsUX.git
   ```

## Development Workflow

### Branch Strategy

1. **Always** create feature branches from the latest `main`
2. Use descriptive branch names:
   - Features: `feature/add-new-component`
   - Bugs: `fix/resolve-canvas-issue`
   - Docs: `docs/update-api-reference`

### Making Changes

1. **Update your fork**:
   ```bash
   git checkout main
   git pull upstream main
   git push origin main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Make your changes** following our coding standards

5. **Run tests**:
   ```bash
   # Unit tests
   pnpm run test:lib
   
   # E2E tests (mock API)
   pnpm run test:e2e --grep @mock
   
   # Type checking
   pnpm run typecheck
   ```

6. **Format and lint**:
   ```bash
   pnpm run check
   ```

## Coding Standards

### TypeScript Guidelines

- Use TypeScript for all new code
- Enable strict mode
- Provide explicit types for function parameters and return values
- Use interfaces over type aliases where possible
- Document complex types with JSDoc comments

### React Best Practices

- Use functional components with hooks
- Follow the [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- Use React.memo for expensive components
- Implement proper error boundaries
- Ensure components are accessible (WCAG 2.1 AA)

### State Management

- Use Redux Toolkit for global state
- Keep Redux state normalized
- Use React Query for server state
- Local component state for UI-only concerns

### Styling

- Use Fluent UI components where possible
- Follow the existing theme structure
- Support light/dark themes
- Use CSS modules for component-specific styles
- Ensure responsive design

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or corrections
- `chore`: Maintenance tasks
- `meta`: Changes to build process or tools

### Examples

```bash
feat(designer): add drag-and-drop support for canvas

fix(data-mapper): resolve memory leak in schema parser

docs: update API reference for designer provider
```

## Testing Requirements

### Unit Tests

- Write tests for all new functionality
- Maintain or improve code coverage
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

Example:
```typescript
describe('ComponentName', () => {
  it('should handle user interaction correctly', () => {
    // Arrange
    const props = { onClick: vi.fn() };
    
    // Act
    render(<ComponentName {...props} />);
    fireEvent.click(screen.getByRole('button'));
    
    // Assert
    expect(props.onClick).toHaveBeenCalledOnce();
  });
});
```

### E2E Tests

- Test complete user workflows
- Use data-testid for reliable element selection
- Mock external APIs for consistency
- Include both happy path and error scenarios

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**:
   ```bash
   pnpm run test:lib
   pnpm run test:e2e --grep @mock
   ```

2. **Check for type errors**:
   ```bash
   pnpm run typecheck
   ```

3. **Format your code**:
   ```bash
   pnpm run check
   ```

4. **Update documentation** if needed

5. **Add changeset** for notable changes:
   ```bash
   pnpm changeset
   ```

### PR Guidelines

1. **Use the PR template** - it will be automatically added
2. **Write a clear title** following conventional commits
3. **Provide detailed description** of your changes
4. **Include screenshots/videos** for UI changes
5. **Link related issues** using keywords (fixes #123)
6. **Keep PRs focused** - one feature/fix per PR
7. **Respond to feedback** promptly

### Review Process

1. **Automated checks** must pass:
   - Build validation
   - Unit tests
   - E2E tests
   - Linting
   - Type checking

2. **Code review** by maintainers:
   - Code quality
   - Architecture alignment
   - Performance considerations
   - Security review

3. **Final approval** and merge

## Package-Specific Guidelines

### Designer Library

- Maintain backward compatibility
- Document breaking changes
- Update Storybook examples
- Test with all supported frameworks

### Data Mapper

- Ensure schema compatibility
- Test with large datasets
- Validate transformation accuracy
- Consider performance impacts

### VS Code Extension

- Test on multiple VS Code versions
- Verify extension activation
- Check memory usage
- Test offline scenarios

## Common Issues

### Build Failures

```bash
# Clear caches and rebuild
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm run build
```

### Test Failures

```bash
# Run specific test file
pnpm test:lib -- path/to/test.spec.ts

# Debug E2E tests
pnpm run test:e2e --debug
```

### Type Errors

```bash
# Check specific package
cd libs/designer
pnpm run typecheck
```

## Getting Help

- **GitHub Issues**: Search existing issues or create new ones
- **Discussions**: Ask questions in GitHub Discussions
- **Internal**: Microsoft employees can reach out on Teams

## Recognition

We value all contributions! Contributors will be:
- Listed in our changelog
- Credited in release notes
- Eligible for special recognition (top contributors)

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](https://github.com/Azure/LogicAppsUX/blob/main/LICENSE.md).