import { localize } from '../../../localize';
import { parseJson } from '../../utils/parseJson';
import { type UnitTestDefinition } from '@microsoft/utils-logic-apps';
import { parseError } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import { type TestItem, type Uri } from 'vscode';

export class TestFile {
  private readonly name: string;
  private file: Uri;
  private fileTestItem: TestItem;
  private unitTest: UnitTestDefinition;

  constructor(name: string, file: Uri, fileTestItem: TestItem) {
    this.name = name;
    this.file = file;
    this.fileTestItem = fileTestItem;
  }

  public async parseUnitTest() {
    const data: string = (await fse.readFile(this.file.path)).toString();
    if (/[^\s]/.test(data)) {
      try {
        this.unitTest = parseJson(data);
      } catch (error) {
        const message: string = localize('failedToParse', 'Failed to parse "{0}": {1}.', this.file.path, parseError(error).message);
        throw new Error(message);
      }
    } else {
      this.unitTest = {
        actionMocks: {},
        triggerMocks: {},
        assertions: [],
      };
    }
  }
}
