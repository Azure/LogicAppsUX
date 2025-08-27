// Example of how to test XSLT mapping in the UI context
import { setInitialXsltDataMap, setMappingMode } from '../core/state/DataMapSlice';
import { store } from '../core/state/Store';
import { createTestSourceSchema, createTestTargetSchema } from './xslt-mapping-test';

/**
 * Function to test XSLT mapping display in UI context
 */
export const testXsltMappingInUI = () => {
  const xsltContent = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/SourceRoot">
    <TargetRoot>
      <CustomerInfo>
        <Name>
          <xsl:value-of select="Customer/Name"/>
        </Name>
      </CustomerInfo>
    </TargetRoot>
  </xsl:template>
</xsl:stylesheet>`;

  // Dispatch action to load XSLT data map
  store.dispatch(
    setInitialXsltDataMap({
      sourceSchema: createTestSourceSchema(),
      targetSchema: createTestTargetSchema(),
      xsltContent: xsltContent,
      functions: [],
      metadata: undefined,
    })
  );

  // Switch to XSLT mode
  store.dispatch(setMappingMode('XSLT'));

  console.log('✅ XSLT mapping loaded into UI state');
  console.log('📊 Current connections:', Object.keys(store.getState().dataMap.present.curDataMapOperation.dataMapConnections).length);
};

// Test mode switching
export const testModeSwitching = () => {
  console.log('🔄 Testing mode switching...');

  // Start in LML mode
  store.dispatch(setMappingMode('LML'));
  console.log('Current mode:', store.getState().dataMap.present.curDataMapOperation.mappingMode);

  // Switch to XSLT mode
  store.dispatch(setMappingMode('XSLT'));
  console.log('Current mode:', store.getState().dataMap.present.curDataMapOperation.mappingMode);

  console.log('✅ Mode switching test completed');
};
