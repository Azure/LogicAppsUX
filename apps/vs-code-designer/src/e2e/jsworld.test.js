import { error, TitleBar, VSBrowser } from 'vscode-extension-tester';
import { expect } from 'chai';
import * as os from 'os';
import * as path from 'path';

// describe('Hello World Example UI Tests', () => {
//     let driver: WebDriver;

//     before(() => {
//         driver = VSBrowser.instance.driver;
//     });

//     it('Command shows a notification with the correct text', async () => {
//         const workbench = new Workbench();
//         await workbench.executeCommand('Hello World');

//         expect(await notification.getMessage()).equals('Hello World!');
//         expect(await notification.getType()).equals(NotificationType.Info);
//     });
// });

// async function notificationExists(text: string): Promise<Notification | undefined> {
//     const notifications = await new Workbench().getNotifications();
//     for (const notification of notifications) {
//         const message = await notification.getMessage();
//         if (message.indexOf(text) >= 0) {
//             return notification;
//         }
//     }
// }
async function getTitle() {
  try {
    const titleBar = new TitleBar();
    const title = await titleBar.getTitle();
    return [title, undefined];
  } catch (e) {
    if (e instanceof error.InvalidSelectorError) {
      throw e;
    }
    return [undefined, new Error((e).message)];
  }
}

describe('Open resource test', function () {
  this.timeout(30000);

  it('Single folder is open from CLI', async function () {
    let lastError = new Error('Could not get title from TitleBar.');
    const prefix = 'folder: ';

    console.log('charlie', VSBrowser, VSBrowser.instance);

    await VSBrowser.instance.driver.wait(
      async () => {
        const [title, error] = await getTitle();
        lastError = error ?? lastError;

        const index = title?.indexOf(prefix) ?? 0;

        if (index > 0) {
          let openFolderPath = title?.slice(index + prefix.length);
          if (openFolderPath) {
            if (openFolderPath.startsWith('~/')) {
              openFolderPath = path.join(os.homedir(), openFolderPath.slice(2));
            }

            expect(openFolderPath.split(' ')[0]).equals(process.cwd());
            return true;
          }
        }

        return false;
      },
      this.timeout() - 2000,
      lastError.toString()
    );
  });
});
console.log('Hello World!');