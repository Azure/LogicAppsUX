/**
 * Simple XSLT Testing - Focus on Basic Functionality
 *
 * This simplified approach focuses on the core issue that was fixed:
 * - Schema dropdown population
 * - No 404 errors on schema selection
 */

import { MockDataMapperFileService } from './MockDataMapperFileService';
import { MockDataMapperApiService } from './MockDataMapperApiService';
import { InitDataMapperFileService } from '../core/services/dataMapperFileService/dataMapperFileService';
import { InitOtherDMService } from '../core/services/dataMapperApiService';

/**
 * Simple test function - just the essentials
 */
export function simpleSchemaTest(): void {
  console.log('🧪 Simple Schema Test Starting...');

  // Initialize mock services
  const mockFileService = new MockDataMapperFileService();
  const mockApiService = new MockDataMapperApiService();

  InitDataMapperFileService(mockFileService);
  InitOtherDMService(mockApiService);

  // Test schema dropdown population
  console.log('📋 Testing schema dropdown...');
  mockFileService.readCurrentSchemaOptions();

  console.log('✅ Simple test completed!');
  console.log('🎯 Next: Check schema panels for "Select existing" dropdown');
  console.log('📝 Expected: Test Schemas folder with 6 files');
}

/**
 * Test schema selection without complex workflows
 */
export function testSchemaSelection(): void {
  console.log('🧪 Testing Schema Selection...');

  const mockFileService = new MockDataMapperFileService();

  // Test that schema content is available
  const testPath = '/test-schemas/xslt-source-schema.xsd';
  const content = mockFileService.getSchemaContent(testPath);

  if (content && content.length > 0) {
    console.log('✅ Schema content available:', testPath);
    console.log('📄 Content preview:', content.substring(0, 100) + '...');
  } else {
    console.log('❌ No content for:', testPath);
  }
}

/**
 * Debug function to check Redux state for connections
 */
export function debugDataMapState(): void {
  console.log('🔍 Debug: Checking DataMap Redux State');

  if (typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__) {
    console.log('✅ Redux DevTools available - check there for full state');
  }

  // Try to access the store from window if available
  if (typeof window !== 'undefined' && (window as any).store) {
    const state = (window as any).store.getState();
    console.log('📊 Full Redux State:', state);
    console.log('🔗 DataMap Connections:', state.dataMap?.present?.curDataMapOperation?.dataMapConnections);
    console.log('📋 Source Schema:', state.dataMap?.present?.curDataMapOperation?.sourceSchema);
    console.log('📋 Target Schema:', state.dataMap?.present?.curDataMapOperation?.targetSchema);
  } else {
    console.log('❌ Redux store not accessible from window.store');
    console.log('💡 Use Redux DevTools extension to inspect state');
  }
}

// Make available globally in development
if (typeof window !== 'undefined') {
  (window as any).simpleSchemaTest = simpleSchemaTest;
  (window as any).testSchemaSelection = testSchemaSelection;
  (window as any).debugDataMapState = debugDataMapState;
}

// Auto-run basic test in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Development mode - Simple XSLT test utilities loaded');
  console.log('📝 Available functions:');
  console.log('  - simpleSchemaTest()');
  console.log('  - testSchemaSelection()');
}
