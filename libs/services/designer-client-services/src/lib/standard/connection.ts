import { BaseConnectionService } from '../base';

export class StandardConnectionService extends BaseConnectionService {
  constructor(options: any) {
    super(options);
    this._vVersion = 'V2';
  }
}
