import crypto from 'crypto';
import { format } from '../format';

function generateFullSha512(content) {
  return crypto.createHash('sha512').update(content).digest('hex');
}

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
