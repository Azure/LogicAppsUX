export class Schema {
  public name: string;
  public type: string;
  public targetNamespace: string;
  public namespaces: Map<string, string>;
  public schemaTreeRoot: SchemaNode;
  private _paths: Map<string, SchemaNode> = new Map<string, SchemaNode>();

  constructor(
    name: string,
    type: string,
    targetNamespace: string,
    namespaces: Map<string, string>,
    schemaTreeRoot: SchemaNode,
    _paths: Map<string, SchemaNode>
  ) {
    this.name = name;
    this.type = type;
    this.targetNamespace = targetNamespace;
    this.namespaces = namespaces;
    this.schemaTreeRoot = schemaTreeRoot;
    this._paths = _paths;
  }

  public exists(path: string): boolean {
    return this._paths.has(path);
  }

  public find(path: string): SchemaNode | (null | undefined) {
    return this._paths.has(path) ? this._paths.get(path) : null;
  }

  public createSearchableSchema(): void {
    this._createSearchableSchema(this.schemaTreeRoot, null);
  }

  private _createSearchableSchema(node: SchemaNode, parent: SchemaNode | null): void {
    const _createSearchableSchema = this._createSearchableSchema;
    node.parent = parent;
    this.addToPathDictionary(node);

    if (node.children != null && node.children.length > 0) {
      node.children.forEach(function (child) {
        _createSearchableSchema(child, node);
      });
    }
  }

  public addToPathDictionary(schemaNode: SchemaNode): void {
    const _paths: string = schemaNode.key;

    if (this._paths.has(_paths)) {
      //TODO
      throw new Error();
      // throw new Error($"Found path {path} more than one times in schema {this.Name}, which is not supported yet.");
    }

    this._paths.set(_paths, schemaNode);
  }
}

export class SchemaNode {
  public key: string;
  public name: string;
  public namespacePrefix: string;
  public namespaceUri: string;
  public type: string;
  public jsonArray: boolean;
  public arrayItem: boolean;
  public optional: boolean;
  public repeating: boolean;
  public attribute: string;
  public level: number;
  public children: Array<SchemaNode>;

  get fullName() {
    return this.namespacePrefix ? this.namespacePrefix : this.name;
  }

  constructor(
    key: string,
    name: string,
    namespacePrefix: string,
    namespaceUri: string,
    type: string,
    jsonArray: boolean,
    arrayItem: boolean,
    optional: boolean,
    repeating: boolean,
    attribute: string,
    level: number,
    children: Array<SchemaNode>,
    _parent: SchemaNode | null
  ) {
    this.key = key;
    this.name = name;
    this.namespacePrefix = namespacePrefix;
    this.namespaceUri = namespaceUri;
    this.type = type;
    this.jsonArray = jsonArray;
    this.arrayItem = arrayItem;
    this.optional = optional;
    this.repeating = repeating;
    this.attribute = attribute;
    this.level = level;
    this.children = children;
    this._parent = _parent;
  }

  private _parent: SchemaNode | null;

  public get parent(): SchemaNode | null {
    return this._parent;
  }

  public set parent(parent: SchemaNode | null) {
    this._parent = parent;
  }
}
