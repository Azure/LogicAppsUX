import { TextDecoder } from 'util';
import { workspace, type TestController, type TestItem, type Uri, type TestRun, TestMessage, Location } from 'vscode';

const textDecoder = new TextDecoder('utf-8');

export type MarkdownTestData = TestFile | TestCase;

export const testData = new WeakMap<TestItem, MarkdownTestData>();

export const getContentFromFilesystem = async (uri: Uri) => {
  try {
    const rawContent = await workspace.fs.readFile(uri);
    return textDecoder.decode(rawContent);
  } catch (e) {
    console.warn(`Error providing tests for ${uri.fsPath}`, e);
    return '';
  }
};

export class TestFile {
  public async updateFromDisk(controller: TestController, item: TestItem) {
    try {
      const content = await getContentFromFilesystem(item.uri);
      item.error = undefined;
      this.updateFromContents(controller, content, item);
    } catch (e) {
      item.error = (e as Error).stack;
    }
  }

  /**
   * Parses the tests from the input text, and updates the tests contained
   * by this file to be those from the text,
   */
  public updateFromContents(controller: TestController, content: string, item: TestItem) {
    const ancestors = [{ item, children: [] as TestItem[] }];
    // const thisGeneration = generationCounter++;

    const ascend = (depth: number) => {
      while (ancestors.length > depth) {
        const finished = ancestors.pop();
        finished.item.children.replace(finished.children);
      }
    };

    // parseMarkdown(content, {
    // 	onTest: (range, a, operator, b, expected) => {
    // 		const parent = ancestors[ancestors.length - 1];
    // 		const data = new TestCase(a, operator as Operator, b, expected, thisGeneration);
    // 		const id = `${item.uri}/${data.getLabel()}`;

    // 		const tcase = controller.createTestItem(id, data.getLabel(), item.uri);
    // 		testData.set(tcase, data);
    // 		tcase.range = range;
    // 		parent.children.push(tcase);
    // 	},

    // 	onHeading: (range, name, depth) => {
    // 		ascend(depth);
    // 		const parent = ancestors[ancestors.length - 1];
    // 		const id = `${item.uri}/${name}`;

    // 		const thead = controller.createTestItem(id, name, item.uri);
    // 		thead.range = range;
    // 		parent.children.push(thead);
    // 		ancestors.push({ item: thead, children: [] });
    // 	},
    // });

    ascend(0); // finish and assign children for all remaining items
  }
}

export class TestCase {
  constructor(
    private readonly workflow: string,
    private readonly name: string,
    private readonly triggerMocks: any,
    private readonly actionMocks: any,
    private readonly assertions: []
  ) {}

  getLabel() {
    return `${this.workflow}-${this.name}`;
  }

  async run(item: TestItem, options: TestRun): Promise<void> {
    const start = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));
    const duration = Date.now() - start;
    const message = TestMessage.diff(`Expected ${item.label}`, 'String(this.expected)', 'String(actual)');
    message.location = new Location(item.uri, item.range);
    options.failed(item, message, duration);
  }
}
