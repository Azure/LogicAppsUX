/**
 * Console Integration Test for XSLT Schema Dropdown
 *
 * Run this in browser console to test schema dropdown functionality.
 * This helps verify that test schemas appear correctly and selection works.
 */

import { MockDataMapperFileService } from './MockDataMapperFileService';
import { MockDataMapperApiService } from './MockDataMapperApiService';
import { TestSchemaProvider } from './TestSchemaProvider';
import { InitDataMapperFileService } from '../core/services/dataMapperFileService/dataMapperFileService';
import { InitOtherDMService } from '../core/services/dataMapperApiService';

// Test function to verify MockDataMapperFileService integration
export function testSchemaDropdownIntegration(): void {
  console.log('🧪 Starting Schema Dropdown Integration Test...');

  // Step 1: Initialize the mock services
  console.log('📋 Step 1: Initializing Mock Services');
  const mockFileService = new MockDataMapperFileService();
  const mockApiService = new MockDataMapperApiService();

  InitDataMapperFileService(mockFileService);
  InitOtherDMService(mockApiService);

  // Step 2: Test schema list retrieval
  console.log('📋 Step 2: Getting test schemas from provider');
  const testSchemas = TestSchemaProvider.getTestSchemas();
  console.log(
    `✅ Found ${testSchemas.length} schema groups:`,
    testSchemas.map((s) => s.name)
  );

  // Step 3: Test readCurrentSchemaOptions (this should populate Redux)
  console.log('📋 Step 3: Calling readCurrentSchemaOptions()');
  mockFileService.readCurrentSchemaOptions();

  // Step 4: Test schema content retrieval
  console.log('📋 Step 4: Testing schema content retrieval');
  const samplePaths = [
    '/test-schemas/xslt-source-schema.xsd',
    '/test-schemas/xslt-target-schema.xsd',
    '/test-schemas/customer-order-source.json',
  ];

  samplePaths.forEach((path) => {
    const content = mockFileService.getSchemaContent(path);
    const hasContent = content && content.length > 0;
    console.log(`${hasContent ? '✅' : '❌'} Schema content for ${path}: ${hasContent ? 'Found' : 'Not found'}`);

    if (hasContent && content.length < 200) {
      console.log(`   Preview: ${content.substring(0, 100)}...`);
    }
  });

  // Step 5: Test schema selection simulation
  console.log('📋 Step 5: Testing schema selection simulation');
  mockFileService.addSchemaFromFile({
    path: '/test-schemas/xslt-source-schema.xsd',
    type: 'source',
  });

  // Step 6: Test API service schema retrieval
  console.log('📋 Step 6: Testing API service schema retrieval');
  mockApiService
    .getSchemaFile('xslt-source-schema.xsd', '/test-schemas/xslt-source-schema.xsd')
    .then((schema) => {
      console.log('✅ API service schema loaded:', schema.name);
      console.log('   Schema tree available:', !!schema.schemaTree);
    })
    .catch((error) => {
      console.error('❌ API service error:', error.message);
    });

  console.log('✅ Integration test completed!');
  console.log('🎯 Next steps:');
  console.log('   1. Check Redux DevTools for schema state');
  console.log('   2. Open schema panel and verify dropdown shows test schemas');
  console.log('   3. Try selecting a test schema from the dropdown');
}

// Export for global access
(window as any).testSchemaDropdownIntegration = testSchemaDropdownIntegration;

// Auto-run in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Development mode detected');
  console.log('📝 Run "testSchemaDropdownIntegration()" in console to test schema integration');
}
