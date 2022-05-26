export function mapDefinitionToJson(inputMapDefinition: string): string {
  const mapcodeLines: string[] = inputMapDefinition.split('\n');

  for (const mapcodeLine of mapcodeLines) {
    const mapcodeLineSplit = mapcodeLine.split('\t');
    const lineExceptIndent = mapcodeLineSplit[mapcodeLineSplit.length - 1];

    console.log('--', mapcodeLineSplit.length, ' : ', lineExceptIndent);
  }

  return '';
}
