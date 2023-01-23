import { BaseConnectionService } from '../base';

export class ConsumptionConnectionService extends BaseConnectionService {
  constructor(options: any) {
    super(options);
    this._vVersion = 'V1';
  }
}
