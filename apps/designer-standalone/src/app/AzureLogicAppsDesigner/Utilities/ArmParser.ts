//write a parser that will take an azure resource management id and parse it into it's individual parts

//example: /subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/myResourceGroup/providers/Microsoft.Logic/workflows/myWorkflow
export class ArmParser {
  private _subscriptionId: string;
  private _resourceGroup: string;
  private _provider: string;
  private _topResourceName: string;
  private _resourceType: string;
  constructor(armId: string) {
    const parts = armId.split('/');
    this._subscriptionId = parts[2];
    this._resourceGroup = parts[4];
    this._provider = parts[6];
    this._resourceType = parts[7];
    this._topResourceName = parts[8];
  }
  // this is a function that will get the topmost resource id
  public get topmostResourceId(): string {
    return `/subscriptions/${this._subscriptionId}/resourceGroups/${this._resourceGroup}/providers/${this._provider}/${this._resourceType}/${this._topResourceName}`;
  }
  public get subscriptionId(): string {
    return this._subscriptionId;
  }

  public get resourceGroup(): string {
    return this._resourceGroup;
  }

  public get provider(): string {
    return this._provider;
  }

  public get topResourceName(): string {
    return this._topResourceName;
  }
}
