# XSLT Mapping Test Files

This directory contains all the files needed to test XSLT mapping functionality.

## File Structure

```
__test__/
├── sample-xslt-map.xslt              # Sample XSLT transformation
├── schemas/
│   ├── source-schema.json            # JSON Schema for source
│   ├── target-schema.json            # JSON Schema for target  
│   ├── source-schema.xsd             # XML Schema for source
│   ├── target-schema.xsd             # XML Schema for target
│   ├── sample-source-data.xml        # Sample input data
│   └── expected-target-data.xml      # Expected output data
├── xslt-mapping-test.ts              # Test utilities
├── XsltMappingIntegration.spec.ts    # Integration tests
└── test-ui-integration.ts            # UI testing utilities
```

## Schema Mapping

The XSLT maps data between these structures:

### Source Schema (SourceRoot)
```xml
<SourceRoot>
  <Customer>
    <Name>string</Name>
    <Email>string</Email>
    <Orders>
      <Order id="string">              <!-- attribute -->
        <ProductName>string</ProductName>
        <Quantity>number</Quantity>
        <Price>number</Price>
      </Order>
    </Orders>
  </Customer>
</SourceRoot>
```

### Target Schema (TargetRoot)
```xml
<TargetRoot>
  <CustomerInfo>
    <Name>string</Name>
    <Email>string</Email>
  </CustomerInfo>
  <Orders>
    <OrderItem>                       <!-- repeating -->
      <OrderId>string</OrderId>
      <Product>string</Product>
      <Quantity>number</Quantity>
      <HighValue>boolean</HighValue>  <!-- conditional -->
    </OrderItem>
  </Orders>
  <ProcessedDate>string</ProcessedDate> <!-- static value -->
</TargetRoot>
```

## XSLT Features Demonstrated

1. **Simple Value Mapping**: `Customer/Name` → `CustomerInfo/Name`
2. **Looping**: `xsl:for-each` over orders
3. **Conditional Logic**: `xsl:if test="Price > 100"` for high-value flag
4. **Attribute Mapping**: `@id` → `OrderId`
5. **Static Values**: Hardcoded `ProcessedDate`

## How to Test

### 1. Run Unit Tests
```bash
pnpm --filter @microsoft/logic-apps-data-mapper-v2 test -- XsltMappingIntegration
```

### 2. Test in Browser Console
```typescript
import { testXsltRoundtrip } from './src/__test__/xslt-mapping-test';
testXsltRoundtrip();
```

### 3. Test in Data Mapper UI
1. Load the source and target schemas
2. Toggle to XSLT mode in command bar
3. Load the `sample-xslt-map.xslt` file
4. Observe visual connections

## Expected Visual Connections

When the XSLT is loaded, you should see:

- **Direct Connections**: Source fields connected to target fields
- **Loop Nodes**: For-each loops shown as function nodes
- **Condition Nodes**: If statements shown as function nodes  
- **Static Values**: Custom value connections for hardcoded data

## Debugging

If mappings don't appear:
1. Check browser console for parsing errors
2. Verify schema paths match XSLT XPath expressions
3. Test with simpler XSLT first
4. Compare with LML mode behavior