/* global __dirname, console, process, require */

const fs = require('node:fs');
const path = require('node:path');
const { XMLValidator } = require('fast-xml-parser');

const packageRoot = path.resolve(__dirname, '..');
const outputDirectory = path.join(packageRoot, 'samples', 'PerformanceLargeMap');

function readPositiveInteger(name, fallback) {
  const argument = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (!argument) {
    return fallback;
  }

  const value = Number.parseInt(argument.slice(name.length + 3), 10);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`--${name} must be a positive integer`);
  }
  return value;
}

const groupCount = readPositiveInteger('groups', 50);
const fieldsPerGroup = readPositiveInteger('fields', 20);
const requestedFunctoidCount = readPositiveInteger('functoids', 250);
const leafCount = groupCount * fieldsPerGroup;
const functoidCount = Math.min(requestedFunctoidCount, leafCount);

function pad(value, width) {
  return String(value).padStart(width, '0');
}

function createSchema(namespace, rootName) {
  const groups = [];
  for (let groupIndex = 0; groupIndex < groupCount; groupIndex++) {
    const fields = [];
    for (let fieldIndex = 0; fieldIndex < fieldsPerGroup; fieldIndex++) {
      fields.push(`          <xs:element name="Field${pad(fieldIndex, 3)}" type="xs:string" minOccurs="0"/>`);
    }
    groups.push(`      <xs:element name="Group${pad(groupIndex, 3)}">
        <xs:complexType>
          <xs:sequence>
${fields.join('\n')}
          </xs:sequence>
        </xs:complexType>
      </xs:element>`);
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="${namespace}"
           xmlns="${namespace}"
           elementFormDefault="qualified">
  <xs:element name="${rootName}">
    <xs:complexType>
      <xs:sequence>
${groups.join('\n')}
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>
`;
}

function createMap() {
  const links = [];
  const functoids = [];

  for (let leafIndex = 0; leafIndex < leafCount; leafIndex++) {
    const groupIndex = Math.floor(leafIndex / fieldsPerGroup);
    const fieldIndex = leafIndex % fieldsPerGroup;
    const sourcePath = `/SourceRoot/Group${pad(groupIndex, 3)}/Field${pad(fieldIndex, 3)}`;
    const targetPath = `/TargetRoot/Group${pad(groupIndex, 3)}/Field${pad(fieldIndex, 3)}`;

    if (leafIndex < functoidCount) {
      const functoidId = `functoid-${pad(leafIndex, 4)}`;
      const inputLinkId = `link-input-${pad(leafIndex, 4)}`;
      const outputLinkId = `link-output-${pad(leafIndex, 4)}`;
      links.push(
        `      <Link LinkID="${inputLinkId}" SourceID="${sourcePath}" SourcePath="${sourcePath}" TargetID="${functoidId}" SourceType="schemaNode" TargetType="functoid"/>`,
        `      <Link LinkID="${outputLinkId}" SourceID="${functoidId}" TargetID="${targetPath}" TargetPath="${targetPath}" SourceType="functoid" TargetType="schemaNode"/>`
      );
      const column = leafIndex % 10;
      const row = Math.floor(leafIndex / 10);
      functoids.push(`      <Functoid FunctoidID="${functoidId}" TypeID="110" Category="String" Name="Uppercase" X="${180 + column * 90}" Y="${60 + row * 55}">
        <Parameter Index="0" Value="${inputLinkId}" Type="link"/>
      </Functoid>`);
    } else {
      links.push(
        `      <Link LinkID="link-direct-${pad(leafIndex, 4)}" SourceID="${sourcePath}" SourcePath="${sourcePath}" TargetID="${targetPath}" TargetPath="${targetPath}" SourceType="schemaNode" TargetType="schemaNode"/>`
      );
    }
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<mapsource Name="Performance Large Map" Version="2" XRange="100" YRange="420"
           OmitXmlDeclaration="No" TreatElementsAsRecords="No" OptimizeValueMapping="Yes"
           GenerateDefaultFixedNodes="Yes" PreserveSequenceOrder="Yes" IgnoreNamespacesForLinks="No"
           XsltEncoding="utf-8" method="xml" xmlVersion="1.0">
  <SrcTree RootNode_Name="SourceRoot" Namespace="urn:profile-source">
    <Reference Location=".\\LargeSource.xsd"/>
  </SrcTree>
  <TrgTree RootNode_Name="TargetRoot" Namespace="urn:profile-target">
    <Reference Location=".\\LargeTarget.xsd"/>
  </TrgTree>
  <Pages>
    <Page Name="Large Profile Page">
${links.join('\n')}
${functoids.join('\n')}
    </Page>
  </Pages>
</mapsource>
`;
}

function validateXml(name, content) {
  const result = XMLValidator.validate(content);
  if (result !== true) {
    throw new Error(`${name} is invalid XML: ${result.err.msg}`);
  }
}

const sourceSchema = createSchema('urn:profile-source', 'SourceRoot');
const targetSchema = createSchema('urn:profile-target', 'TargetRoot');
const map = createMap();

validateXml('LargeSource.xsd', sourceSchema);
validateXml('LargeTarget.xsd', targetSchema);
validateXml('PerformanceLargeMap.btm', map);

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(path.join(outputDirectory, 'LargeSource.xsd'), sourceSchema);
fs.writeFileSync(path.join(outputDirectory, 'LargeTarget.xsd'), targetSchema);
fs.writeFileSync(path.join(outputDirectory, 'PerformanceLargeMap.btm'), map);

const linkCount = leafCount + functoidCount;
console.log(`Generated ${leafCount} leaves per schema, ${functoidCount} functoids, and ${linkCount} links in ${outputDirectory}`);
