# Inline XSLT Nillable Values

Open `MapNilValuesWithInlineCustomXSLTWorkaround.btm` with the current-source mapper extension and run **Test Map** with `Input.xml`. Keep both schemas beside the map so its relative references resolve. Compare the result with `ExpectedOutput.xml`, transcribed from the legacy BizTalk output in the supplied screenshots. Rebuild the extension and restart the Extension Development Host after compiler changes; an older VSIX will retain the old behavior.

The Scripting functoid has no inputs and connects to `AnotherNilValueOutput`. Its inline XSLT creates the complete output element. It must run in the source root element's context, without adding another destination wrapper. `NilValue` is linked directly to `NilValueOutput`, reducing the screenshot's other functoid chain to the unchanged `Ola` value.

Expected output:

```xml
<ns0:OutputSchema xmlns:ns0="http://WorkingWithNillableValues.OutputSchema"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <NilValueOutput>Ola</NilValueOutput>
  <AnotherNilValueOutput xsi:nil="true"/>
</ns0:OutputSchema>
```

Only the root is namespace-qualified. There must be exactly two children, no nested `AnotherNilValueOutput`, and no text inside the nil element. Ignore indentation, prefix spelling, and namespace declaration order when comparing XML.

For the non-nil branch, replace `<AnotherNilValue xsi:nil="true"/>` with `<AnotherNilValue>Hello</AnotherNilValue>`. The expected second output element is `<AnotherNilValueOutput>Hello</AnotherNilValueOutput>`.

The script deliberately retains the screenshot's attribute-presence test. It treats `xsi:nil="false"` as nil too; that is separate from the extra-wrapper regression.