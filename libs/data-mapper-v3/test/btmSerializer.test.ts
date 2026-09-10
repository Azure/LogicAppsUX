/**
 * BizTalk Data Mapper - Unit Tests for BTM Serializer
 */

import { BtmSerializer } from '../src/schema/btmSerializer';
import {
    MapDocument,
    FunctoidCategory,
    LinkEndpointType,
    ParameterType,
    ScriptType,
    SourceLinkOption,
    TargetLinkOption
} from '../src/model';

describe('BtmSerializer', () => {
    test('round-trips legacy RootNode_Name schema selection', () => {
        const btm = `
            <mapsource Name="Multi-root" Version="2">
              <SrcTree RootNode_Name="SourceRoot"><Reference Location="source.xsd"/></SrcTree>
              <TrgTree RootNode_Name="TargetRoot"><Reference Location="target.xsd"/></TrgTree>
              <Pages/>
            </mapsource>`;

        const map = serializer.deserialize(btm);
        const serialized = serializer.serialize(map);

        expect(map.sourceSchema.rootName).toBe('SourceRoot');
        expect(map.targetSchema.rootName).toBe('TargetRoot');
        expect(serialized).toContain('RootNode_Name="SourceRoot"');
        expect(serialized).toContain('RootNode_Name="TargetRoot"');
    });

    let serializer: BtmSerializer;

    beforeEach(() => {
        serializer = new BtmSerializer();
    });

    test('parses large valid maps with more than 1,000 ordinary entity references', () => {
        const encodedLabel = '&quot;value&quot;'.repeat(600);
        const btm = `
            <mapsource Name="Large entities" Version="1">
              <SrcTree><Reference Location="source.xsd"/></SrcTree>
              <TrgTree><Reference Location="target.xsd"/></TrgTree>
              <Pages><Page Name="Page 1"><Links>
                <Link LinkID="1" SourceID="/Root/In" TargetID="/Root/Out"
                  SourceType="schemaNode" TargetType="schemaNode" Label="${encodedLabel}"/>
              </Links></Page></Pages>
            </mapsource>`;

        const map = serializer.deserialize(btm);

        expect(map.name).toBe('Large entities');
        expect(map.pages[0].links[0].label).toContain('"value"');
    });

    test('round-trips P1 map metadata and honors script precedence', () => {
        const xml = `
            <mapsource Name="P1" Version="1" XRange="100" YRange="420"
                XsltEncoding="utf-16" method="html" xmlVersion="2.0" CopyPIs="Yes">
              <SrcTree><Reference Location="source.xsd"/></SrcTree>
              <TrgTree><Reference Location="target.xsd"/></TrgTree>
              <ScriptTypePrecedence>
                <VbNet Enabled="Yes"/>
                <CSharp Enabled="Yes"/>
              </ScriptTypePrecedence>
              <TreeValues><TestValues/><ConstantValues>
                <Value value="constant" Query="/Root/Out"/>
              </ConstantValues></TreeValues>
              <CustomXSLT XsltPath="custom.xslt" ExtObjXmlPath="custom.xml"/>
              <Pages><Page Name="Page 1"><Functoids>
                <Functoid FunctoidID="script" Functoid-FID="260" Functoid-Name="Scripting">
                  <ScripterCode>
                    <Script Language="CSharp"><![CDATA[return "csharp";]]></Script>
                    <Script Language="VbNet"><![CDATA[Return "vb"]]></Script>
                  </ScripterCode>
                </Functoid>
              </Functoids></Page></Pages>
            </mapsource>`;

        const map = serializer.deserialize(xml);

        expect(map.options.xsltEncoding).toBe('utf-16');
        expect(map.options.outputMethod).toBe('html');
        expect(map.options.xsltVersion).toBe('2.0');
        expect(map.options.copyProcessingInstructions).toBe(true);
        expect(map.targetValues).toEqual({ '/Root/Out': 'constant' });
        expect(map.customXsltPath).toBe('custom.xslt');
        expect(map.customExtensionXmlPath).toBe('custom.xml');
        expect(map.pages[0].functoids[0].scriptType).toBe(ScriptType.InlineVbNet);
        expect(map.pages[0].functoids[0].scriptContent).toContain('Return "vb"');
        expect(map.pages[0].functoids[0].scriptImplementations).toHaveLength(2);

        const roundTrip = serializer.serialize(map);
        expect(roundTrip).toContain('<VbNet Enabled="Yes"/>');
        expect(roundTrip).toContain('<CSharp Enabled="Yes"/>');
        expect(roundTrip).toContain('<CustomXSLT XsltPath="custom.xslt" ExtObjXmlPath="custom.xml"/>');
        expect(roundTrip).toContain('Query="/Root/Out"');
        expect(roundTrip.match(/<Script Language=/g)).toHaveLength(2);
    });

    test('should create a new map', () => {
        const map = serializer.createNew('source.xsd', 'target.xsd', 'TestMap');

        expect(map.name).toBe('TestMap');
        expect(map.sourceSchema.location).toBe('source.xsd');
        expect(map.targetSchema.location).toBe('target.xsd');
        expect(map.pages.length).toBe(1);
        expect(map.pages[0].links.length).toBe(0);
        expect(map.pages[0].functoids.length).toBe(0);
    });

    test('should serialize and deserialize a map round-trip', () => {
        const original: MapDocument = {
            name: 'RoundTripMap',
            version: '1',
            sourceSchema: { location: 'src.xsd', rootName: 'Root' },
            targetSchema: { location: 'tgt.xsd', rootName: 'Output' },
            pages: [{
                id: 'page1',
                name: 'Page 1',
                links: [{
                    id: 'link1',
                    sourceId: '/Root/Name',
                    sourcePath: '/Root/Name',
                    targetId: '/Output/FullName',
                    targetPath: '/Output/FullName',
                    sourceType: LinkEndpointType.SchemaNode,
                    targetType: LinkEndpointType.SchemaNode,
                    sourceLinkOption: SourceLinkOption.MixedCopy,
                    targetLinkOption: TargetLinkOption.BottomUp
                }],
                functoids: [{
                    id: 'func1',
                    functoidId: 100,
                    category: FunctoidCategory.String,
                    name: 'String Concatenate',
                    x: 200,
                    y: 150,
                    inputLinks: [],
                    outputLinks: [],
                    parameters: [{
                        index: 0,
                        value: ' ',
                        type: ParameterType.Constant,
                        defaultValue: 'fallback'
                    }]
                }]
            }],
            options: {
                omitXmlDeclaration: false,
                xsltVersion: '1.0',
                xsltEncoding: 'UTF-8',
                preserveSequenceOrder: true,
                treatElementsAsRecords: false,
                optimizeValueMapping: true,
                generateDefaultFixedNodes: true,
                ignoreNamespacesForLinks: false,
                outputMethod: 'xml'
            }
        };

        const xml = serializer.serialize(original);
        expect(xml).toContain('mapsource');
        expect(xml).toContain('RoundTripMap');
        expect(xml).toContain('src.xsd');

        const deserialized = serializer.deserialize(xml);
        expect(deserialized.name).toBe('RoundTripMap');
        expect(deserialized.sourceSchema.location).toBe('src.xsd');
        expect(deserialized.targetSchema.location).toBe('tgt.xsd');
        expect(deserialized.pages.length).toBe(1);
        expect(deserialized.pages[0].links.length).toBe(1);
        expect(deserialized.pages[0].links[0].sourceLinkOption).toBe(SourceLinkOption.MixedCopy);
        expect(deserialized.pages[0].links[0].targetLinkOption).toBe(TargetLinkOption.BottomUp);
        expect(deserialized.pages[0].functoids.length).toBe(1);
        expect(deserialized.pages[0].functoids[0].functoidId).toBe(100);
        expect(deserialized.pages[0].functoids[0].parameters[0].defaultValue).toBe('fallback');
    });

    test('should handle empty map gracefully', () => {
        const map = serializer.createNew('', '', '');
        const xml = serializer.serialize(map);
        const result = serializer.deserialize(xml);
        expect(result.pages.length).toBe(1);
    });

    test('preserves Table Looping grid metadata', () => {
        const map = serializer.createNew('source.xsd', 'target.xsd', 'TableMap');
        map.pages[0].functoids.push({
            id: 'table',
            functoidId: 703,
            category: FunctoidCategory.Advanced,
            name: 'Table Looping',
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [{
                index: 0,
                value: 'link1',
                type: ParameterType.Link,
                guid: '{CELL}'
            }],
            tableLooping: {
                columns: 1,
                gated: true,
                rows: [['{CELL}']]
            }
        });

        const result = serializer.deserialize(serializer.serialize(map));
        const functoid = result.pages[0].functoids[0];

        expect(functoid.parameters[0].guid).toBe('{CELL}');
        expect(functoid.tableLooping).toEqual({
            columns: 1,
            gated: true,
            rows: [['{CELL}']]
        });
    });

    test('parses native external assembly scripting metadata', () => {
        const btm = `<?xml version="1.0" encoding="utf-8"?>
<mapsource Name="External" Version="2">
  <SrcTree><Reference Location="source.xsd"/></SrcTree>
  <TrgTree><Reference Location="target.xsd"/></TrgTree>
  <Pages><Page Name="Page 1"><Functoids>
    <Functoid FunctoidID="1" Functoid-FID="260" Functoid-Name="Scripting">
      <ScripterCode>
        <Script Language="ExternalAssembly" Assembly="Contoso.Helpers, Version=1.0.0.0"
          Class="Contoso.Helpers.Mapper" Function="Map"/>
      </ScripterCode>
    </Functoid>
  </Functoids></Page></Pages>
</mapsource>`;

        const functoid = serializer.deserialize(btm).pages[0].functoids[0];

        expect(functoid.scriptType).toBe('externalAssembly');
        expect(functoid.parameters).toEqual(expect.arrayContaining([
            expect.objectContaining({ type: ParameterType.AssemblyPath, value: 'Contoso.Helpers, Version=1.0.0.0' }),
            expect.objectContaining({ type: ParameterType.ClassName, value: 'Contoso.Helpers.Mapper' }),
            expect.objectContaining({ type: ParameterType.MethodName, value: 'Map' })
        ]));
    });

    test('round-trips inline script assembly references', () => {
        const map = serializer.createNew('source.xsd', 'target.xsd', 'Inline references');
        map.pages[0].functoids.push({
            id: 'script',
            functoidId: 260,
            category: FunctoidCategory.Advanced,
            name: 'Scripting',
            x: 0,
            y: 0,
            inputLinks: [],
            outputLinks: [],
            parameters: [],
            scriptType: ScriptType.InlineCSharp,
            scriptContent: 'public string Run() { return Helper.Run(); }',
            scriptImplementations: [{
                type: ScriptType.InlineCSharp,
                content: 'public string Run() { return Helper.Run(); }',
                assemblyReferences: ['Contoso.Helpers', 'C:\\libs\\Local.dll']
            }]
        });

        const xml = serializer.serialize(map);
        const functoid = serializer.deserialize(xml).pages[0].functoids[0];

        expect(xml).toContain('<Reference Assembly="Contoso.Helpers"/>');
        expect(xml).toContain('<Reference Assembly="C:\\libs\\Local.dll"/>');
        expect(functoid.scriptImplementations?.[0].assemblyReferences).toEqual([
            'Contoso.Helpers',
            'C:\\libs\\Local.dll'
        ]);
    });

    test('should parse real BizTalk Server BTM format with functoids', () => {
        // Real BizTalk Server Multiply.btm format (simplified)
        const biztalkBtm = `<?xml version="1.0" encoding="utf-8"?>
<mapsource Name="BizTalk Map" Version="2" XRange="100" YRange="420" OmitXmlDeclaration="Yes" IgnoreNamespacesForLinks="Yes">
  <SrcTree><Reference Location=".\\DocIn.xsd"/></SrcTree>
  <TrgTree><Reference Location=".\\DocOut.xsd"/></TrgTree>
  <Pages>
    <Page Name="Page 1">
      <Links>
        <Link LinkID="1" LinkFrom="/*[local-name()='&lt;Schema&gt;']/*[local-name()='DocIn']/*[local-name()='Param1']" LinkTo="1" Label=""/>
        <Link LinkID="2" LinkFrom="/*[local-name()='&lt;Schema&gt;']/*[local-name()='DocIn']/*[local-name()='Param2']" LinkTo="1" Label=""/>
        <Link LinkID="3" LinkFrom="1" LinkTo="/*[local-name()='&lt;Schema&gt;']/*[local-name()='DocOut']/*[local-name()='Result']" Label=""/>
      </Links>
      <Functoids>
        <Functoid FunctoidID="1" X-Cell="53" Y-Cell="213" Functoid-FID="120" Functoid-Name="Multiplication" Label="">
          <Input-Parameters>
            <Parameter Type="Link" Value="1" Guid="{AC833DE7-3EC7-4D27-A456-1BE5FA80372B}"/>
            <Parameter Type="Link" Value="2" Guid="{8BA7293B-C453-41BC-9A48-776CC60E4578}"/>
          </Input-Parameters>
        </Functoid>
      </Functoids>
    </Page>
  </Pages>
</mapsource>`;

        const map = serializer.deserialize(biztalkBtm);

        expect(map.name).toBe('BizTalk Map');
        expect(map.sourceSchema.location).toBe('.\\DocIn.xsd');
        expect(map.targetSchema.location).toBe('.\\DocOut.xsd');
        expect(map.pages.length).toBe(1);

        // Functoids
        const page = map.pages[0];
        expect(page.functoids.length).toBe(1);
        const func = page.functoids[0];
        expect(func.id).toBe('1');
        expect(func.functoidId).toBe(120);
        expect(func.name).toBe('Multiplication');
        // Cell coords (53, 213) are converted to pixel space
        expect(func.x).toBe((53 - 48) * 14 + 150);  // 220
        expect(func.y).toBe((213 - 205) * 12 + 40);  // 136
        expect(func.category).toBe(FunctoidCategory.Math);

        // Parameters from Input-Parameters
        expect(func.parameters.length).toBe(2);
        expect(func.parameters[0].type).toBe(ParameterType.Link);
        expect(func.parameters[0].value).toBe('1');
        expect(func.parameters[1].type).toBe(ParameterType.Link);
        expect(func.parameters[1].value).toBe('2');

        // Links
        expect(page.links.length).toBe(3);

        // Link 1: schema node → functoid
        expect(page.links[0].sourceType).toBe(LinkEndpointType.SchemaNode);
        expect(page.links[0].targetType).toBe(LinkEndpointType.Functoid);
        expect(page.links[0].targetId).toBe('1');
        expect(page.links[0].sourcePath).toContain('Param1');

        // Link 2: schema node → functoid
        expect(page.links[1].sourceType).toBe(LinkEndpointType.SchemaNode);
        expect(page.links[1].targetType).toBe(LinkEndpointType.Functoid);

        // Link 3: functoid → schema node
        expect(page.links[2].sourceType).toBe(LinkEndpointType.Functoid);
        expect(page.links[2].sourceId).toBe('1');
        expect(page.links[2].targetType).toBe(LinkEndpointType.SchemaNode);
        expect(page.links[2].targetPath).toContain('Result');
    });

    test('should parse BizTalk BTM with scripting functoid and CDATA', () => {
        const btmWithScript = `<?xml version="1.0" encoding="utf-8"?>
<mapsource Name="ScriptMap" Version="2" XRange="100" YRange="420">
  <SrcTree><Reference Location="src.xsd"/></SrcTree>
  <TrgTree><Reference Location="tgt.xsd"/></TrgTree>
  <Pages>
    <Page Name="Page 1">
      <Links>
        <Link LinkID="1" LinkFrom="1" LinkTo="/*[local-name()='&lt;Schema&gt;']/*[local-name()='Root']/*[local-name()='Output']" Label=""/>
      </Links>
      <Functoids>
        <Functoid FunctoidID="1" X-Cell="54" Y-Cell="217" Functoid-FID="260" Functoid-Name="Scripting" Label="">
          <Input-Parameters/>
          <ScripterCode>
            <Script Language="CSharp"><![CDATA[public string GetValue()
{
    return "hello";
}]]></Script>
          </ScripterCode>
        </Functoid>
      </Functoids>
    </Page>
  </Pages>
</mapsource>`;

        const map = serializer.deserialize(btmWithScript);
        const func = map.pages[0].functoids[0];

        expect(func.functoidId).toBe(260);
        expect(func.name).toBe('Scripting');
        expect(func.category).toBe(FunctoidCategory.Advanced);
        expect(func.scriptType).toBe('inlineCSharp');
        expect(func.scriptContent).toContain('GetValue');
    });

    test('should parse links with constant parameters', () => {
        const btmWithConstants = `<?xml version="1.0" encoding="utf-8"?>
<mapsource Name="IndexMap" Version="2">
  <SrcTree><Reference Location="src.xsd"/></SrcTree>
  <TrgTree><Reference Location="tgt.xsd"/></TrgTree>
  <Pages>
    <Page Name="Page 1">
      <Links/>
      <Functoids>
        <Functoid FunctoidID="5" X-Cell="51" Y-Cell="220" Functoid-FID="323" Functoid-Name="Index" Label="">
          <Input-Parameters>
            <Parameter Type="Link" Value="15" Guid="{9F145B20-55CF-48C4-B661-64381FDD18AB}"/>
            <Parameter Type="Constant" Value="1" Guid="{957ECC23-E47B-4745-8A39-875F1E4B8987}"/>
          </Input-Parameters>
        </Functoid>
      </Functoids>
    </Page>
  </Pages>
</mapsource>`;

        const map = serializer.deserialize(btmWithConstants);
        const func = map.pages[0].functoids[0];

        expect(func.functoidId).toBe(323);
        expect(func.name).toBe('Index');
        expect(func.category).toBe(FunctoidCategory.Advanced);
        expect(func.parameters.length).toBe(2);
        expect(func.parameters[0].type).toBe(ParameterType.Link);
        expect(func.parameters[1].type).toBe(ParameterType.Constant);
        expect(func.parameters[1].value).toBe('1');
    });

    test('should parse link XPaths with namespace-uri predicates', () => {
        const btmWithNamespaceUri = `<?xml version="1.0" encoding="utf-8"?>
<mapsource Name="ClientToCompanyRequest" Version="2" XRange="100" YRange="420" OmitXmlDeclaration="Yes">
  <SrcTree><Reference Location=".\\ClientRequest.xsd"/></SrcTree>
  <TrgTree><Reference Location=".\\CompanyRequest.xsd"/></TrgTree>
  <Pages>
    <Page Name="Page 1">
      <Links>
        <Link LinkID="1" LinkFrom="/*[local-name()='&lt;Schema&gt;' and namespace-uri()='http://ExposeWebService.ClientRequest']/*[local-name()='ClientRequest' and namespace-uri()='http://ExposeWebService.ClientRequest']/*[local-name()='Name' and namespace-uri()='http://ExposeWebService.ClientRequest']" LinkTo="/*[local-name()='&lt;Schema&gt;' and namespace-uri()='http://ExposeWebService.CompanyRequest']/*[local-name()='CompanyRequest' and namespace-uri()='http://ExposeWebService.CompanyRequest']/*[local-name()='Name' and namespace-uri()='http://ExposeWebService.CompanyRequest']" Label=""/>
        <Link LinkID="2" LinkFrom="/*[local-name()='&lt;Schema&gt;' and namespace-uri()='http://ExposeWebService.ClientRequest']/*[local-name()='ClientRequest' and namespace-uri()='http://ExposeWebService.ClientRequest']/*[local-name()='Address' and namespace-uri()='http://ExposeWebService.ClientRequest']/*[local-name()='City' and namespace-uri()='http://ExposeWebService.ClientRequest']" LinkTo="/*[local-name()='&lt;Schema&gt;' and namespace-uri()='http://ExposeWebService.CompanyRequest']/*[local-name()='CompanyRequest' and namespace-uri()='http://ExposeWebService.CompanyRequest']/*[local-name()='Address' and namespace-uri()='http://ExposeWebService.CompanyRequest']/*[local-name()='City' and namespace-uri()='http://ExposeWebService.CompanyRequest']" Label=""/>
      </Links>
      <Functoids/>
    </Page>
  </Pages>
</mapsource>`;

        const map = serializer.deserialize(btmWithNamespaceUri);
        const page = map.pages[0];

        expect(page.links.length).toBe(2);
        expect(page.functoids.length).toBe(0);

        // Link 1: simple element path
        const link1 = page.links[0];
        expect(link1.sourceType).toBe(LinkEndpointType.SchemaNode);
        expect(link1.targetType).toBe(LinkEndpointType.SchemaNode);
        expect(link1.sourceId).toBe('/ClientRequest/Name');
        expect(link1.targetId).toBe('/CompanyRequest/Name');

        // Link 2: nested element path
        const link2 = page.links[1];
        expect(link2.sourceId).toBe('/ClientRequest/Address/City');
        expect(link2.targetId).toBe('/CompanyRequest/Address/City');
    });
});
