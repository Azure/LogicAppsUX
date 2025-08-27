import { InitDataMapperFileService } from '../core/services/dataMapperFileService/dataMapperFileService';
import { InitOtherDMService } from '../core/services/dataMapperApiService';
import { MockDataMapperFileService } from './MockDataMapperFileService';
import { MockDataMapperApiService } from './MockDataMapperApiService';

/**
 * XSLT Integration Test Setup
 *
 * This file sets up the MockDataMapperFileService to enable testing of XSLT schema loading
 * and visual mapping functionality.
 *
 * Usage:
 * 1. Import this module in your test environment or development setup
 * 2. The mock service will populate the schema dropdown with test schemas
 * 3. Test schemas include XSLT source/target schemas and JSON schemas
 */

// Initialize the mock services for testing
const mockFileService = new MockDataMapperFileService();
const mockApiService = new MockDataMapperApiService();

InitDataMapperFileService(mockFileService);
InitOtherDMService(mockApiService);

console.log('🧪 XSLT Integration Test Setup Initialized');
console.log('📋 Test schemas will appear in "Select existing" dropdown');
console.log('📁 Available test schemas:');
console.log('  - XSLT Sample Source Schema (xslt-source-schema.xsd)');
console.log('  - XSLT Sample Target Schema (xslt-target-schema.xsd)');
console.log('  - Customer Order Source/Target (JSON)');
console.log('  - Simple Employee Source/Target (XSD)');

export { mockFileService };

/**
 * Utility function to manually trigger schema loading
 * Call this to populate the dropdown with test schemas
 */
export const loadTestSchemas = () => {
  console.log('🔄 Loading test schemas into dropdown...');
  mockFileService.readCurrentSchemaOptions();
  console.log('✅ Test schemas loaded successfully');
};

/**
 * Utility function to test XSLT loading workflow
 * This demonstrates the complete workflow from schema selection to XSLT mapping
 */
export const testXsltWorkflow = () => {
  console.log('🚀 Starting XSLT workflow test...');

  // Step 1: Load available schemas
  loadTestSchemas();

  // Step 2: Simulate selecting source schema
  const sourceSchema = {
    path: '/test-schemas/xslt-source-schema.xsd',
    type: 'source' as const,
  };

  console.log('📥 Simulating source schema selection:', sourceSchema.path);
  mockFileService.addSchemaFromFile(sourceSchema);

  // Step 3: Simulate selecting target schema
  const targetSchema = {
    path: '/test-schemas/xslt-target-schema.xsd',
    type: 'target' as const,
  };

  console.log('📤 Simulating target schema selection:', targetSchema.path);
  mockFileService.addSchemaFromFile(targetSchema);

  console.log('✅ XSLT workflow test completed');
  console.log('🎯 Next: Load sample-xslt-map.xslt to see visual mappings');
};
