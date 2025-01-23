# Testing

### E2E Testing

For E2E tests, we use [Playwright](https://playwright.dev/) which runs in both Chromium and Firefox. Currently E2E tests are categorized into two types:

1. **Mock APIs**: These tests run with mock data and simulate a local standalone environment.
2. **Real APIs**: These tests interact with actual Azure services, representing an actual workflow.

### Test Types and Execution

- **Mock APIs**: These tests are triggered automatically on pull request creation or when merging to the `main` branch. They are tagged with `@mock`.
- **Real APIs**: These tests are run on an hourly basis in the CI environment (GitHub Actions).

### Running Tests

From the root of the project:

#### Mock API Tests

To run the mock API E2E tests, use the following command:

```bash
pnpm run test:e2e --grep @mock
```

#### Real API Tests

To run the real API E2E tests, use:

```bash
pnpm run test:e2e
```

**Note**: Real API tests require deployment of workflows. To run these tests locally, you need to configure your environment with an `.env` file with the following variables:

```env
AZURE_SITE_NAME="Logic App Name"
AZURE_SUBSCRIPTION_ID="Subscription ID"
AZURE_RESOURCE_GROUP="Resource Group"
AZURE_MANAGEMENT_TOKEN="ARM Token"
```

You can obtain the `AZURE_MANAGEMENT_TOKEN` by running `npm run generateArmToken` and retrieving the token from `apps/Standalone/src/environments/jsonImport/armToken.json`.

### Running Tests for Specific Files

You can run E2E tests for a specific file by providing the file path:

```bash
pnpm run test:e2e -- ./path/to/file
```

### Generating Tests

To easily generate Playwright tests, you can use the following command:

```bash
pnpm run testgen
```

This will bring up Playwright's test generator, which allows you to record user actions and generate specific tests. For more information, you can [view the Playwright codegen docs](https://playwright.dev/docs/codegen).


### Test Results and Debugging

#### Test Results

When tests complete, Playwright will serve an HTML report showing the results, including where tests have failed.

If you want to view the report after the test run is completed, to view the last HTML report you can use the following command:

```bash
pnpm exec playwright show-report
```

#### Debugging
The default Playwright report is generally sufficient for debugging. However, be aware that sometimes, even after Playwright finishes running, the port (4200) may still be occupied. This can cause subsequent tests to fail because the port is still being listened to.

To resolve this, you will need to kill the process listening on port 4200 (on Windows):
```bash
netstat -ano | findstr :4200
taskkill /PID <pid> /F
```

#### Test Cleanup
For Real APIs, the tests create a workflow in the specified environment location. These workflows can be cleaned up manually as needed.