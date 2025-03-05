import crypto from 'crypto';
import { format } from '../format';

function generateFullSha512(content) {
  return crypto.createHash('sha512').update(content).digest('hex').slice(0, 12);
}

// Expecting output to be: 66f029ee63f7
// From here: apps\vs-code-react\src\app\designer\DesignerCommandBar\index.tsx
// Seems to go through this file's format function somehow before being parsed by the eslint rule: format.js

console.log(
  generateFullSha512(
    JSON.stringify(
      format({
        defaultMessage: 'Save',
        description: 'Button text for save',
      })
    )
  )
);
