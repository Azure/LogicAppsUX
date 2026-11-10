import { createRoot } from 'react-dom/client';
import { Loading } from './Loading';
import { cancelPending } from './rpc';
import '@xyflow/react/dist/style.css';
import './styles.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('The LML editor host did not provide a #root element.');
}
const root = createRoot(container);
let failed = false;

function showFailure(error: unknown): void {
  if (failed) {
    return;
  }
  failed = true;
  cancelPending('The LML editor could not start.');
  const message = error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error);
  setTimeout(() => {
    root.render(
      <main className="lml-status">
        <h1>Unable to start LML editor</h1>
        <pre role="alert">{message}</pre>
        <button type="button" onClick={() => window.location.reload()}>
          Retry
        </button>
      </main>
    );
  }, 0);
}

window.addEventListener('error', (event) => showFailure(event.error ?? event.message));
window.addEventListener('unhandledrejection', (event) => showFailure(event.reason));

root.render(<Loading />);
import('./Editor')
  .then(({ default: Editor }) => {
    if (!failed) {
      root.render(<Editor />);
    }
  })
  .catch(showFailure);
