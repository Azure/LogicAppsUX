# XSLT Testing Guide

This guide explains how to test XSLT visual mapping functionality in the data mapper.

## Quick Start

### 1. Initialize Test Environment

```typescript
import { loadTestSchemas, testXsltWorkflow } from '@microsoft/logic-apps-data-mapper-v2';

// Load test schemas into the dropdown
loadTestSchemas();

// Run complete workflow test
testXsltWorkflow();
```

### 2. Using the Test Helper Component

For visual testing in the standalone app:

```typescript
import { XsltTestHelper } from '@microsoft/logic-apps-data-mapper-v2';

// Add to your component (development only)
<DataMapperDesigner {...props} />
<XsltTestHelper />
```

The test helper provides buttons to:
- Load test schemas into dropdown
- Switch to XSLT mode
- Load sample XSLT for visual testing

### 3. Manual Testing Workflow

1. **Load Schemas**: Use the "Load Test Schemas" button or call `loadTestSchemas()`
2. **Select Schemas**: Use "Select existing" dropdown to choose:
   - XSLT Sample Source Schema (xslt-source-schema.xsd)
   - XSLT Sample Target Schema (xslt-target-schema.xsd)
3. **Switch Mode**: Toggle to XSLT mode in the command bar
4. **Load XSLT**: Load the sample XSLT file to see visual mappings

## Test Schemas Available

### XSLT Schemas
- **xslt-source-schema.xsd**: Customer with orders structure
- **xslt-target-schema.xsd**: CustomerInfo with order items structure

### JSON Schemas
- **customer-order-source.json**: JSON schema for source data
- **customer-order-target.json**: JSON schema for target data

### Simple Schemas
- **employee-source.xsd**: Simple employee list
- **employee-target.xsd**: Staff with person records

## Sample XSLT Features

The sample XSLT demonstrates:
- **Direct Mapping**: Customer/Name → CustomerInfo/Name
- **Loops**: xsl:for-each over order items
- **Conditionals**: xsl:if for high-value orders
- **Attribute Mapping**: @id → OrderId element
- **Static Values**: ProcessedDate timestamp

## Integration Testing

### Programmatic Test
```typescript
import { MockDataMapperFileService } from '@microsoft/logic-apps-data-mapper-v2';
import { InitDataMapperFileService } from '@microsoft/logic-apps-data-mapper-v2';

// Initialize mock service
const mockService = new MockDataMapperFileService();
InitDataMapperFileService(mockService);

// Test schema loading
mockService.readCurrentSchemaOptions();

// Test schema selection
mockService.addSchemaFromFile({
  path: '/test-schemas/xslt-source-schema.xsd',
  type: 'Source'
});
```

### Unit Test Example
```typescript
import { renderWithRedux } from '../redux-test-helper-dm';
import { InitDataMapperFileService } from '../../core';
import { MockDataMapperFileService } from '../MockDataMapperFileService';

it('displays test schemas in dropdown', async () => {
  InitDataMapperFileService(new MockDataMapperFileService());
  
  const { getByText } = renderWithRedux(<FileSelector {...props} />, {
    preloadedState: { schema: { availableSchemas: [] } }
  });
  
  // Test schema loading and selection
  await user.click(getByText('Select schema'));
  expect(getByText('XSLT Sample Source Schema')).toBeInTheDocument();
});
```

## Troubleshooting

### Schemas Not Appearing in Dropdown
1. Ensure MockDataMapperFileService is initialized: `InitDataMapperFileService(new MockDataMapperFileService())`
2. Call `readCurrentSchemaOptions()` to populate the dropdown
3. Check Redux state has `availableSchemas` populated

### XSLT Not Loading
1. Ensure both source and target schemas are loaded first
2. Switch to XSLT mode before loading XSLT content
3. Check console for parsing errors in XSLT content

### Visual Mappings Not Showing
1. Verify XSLT contains valid XPath expressions
2. Check schema nodes match XSLT select attributes
3. Ensure XsltDefinitionDeserializer is working correctly

## Files Overview

- `MockDataMapperFileService.ts`: Mock file service for testing
- `TestSchemaProvider.ts`: Test schema definitions and content
- `xslt-integration-test.ts`: Integration test utilities
- `XsltTestHelper.tsx`: Development UI helper component
- `sample-xslt-map.xslt`: Sample XSLT transformation
- Schema files: `*-source.xsd`, `*-target.xsd`, `*.json`