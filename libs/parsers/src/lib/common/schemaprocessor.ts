
import { getIntl } from '@microsoft-logic-apps/intl';
import { aggregate, clone, equals, hasProperty, isNullOrUndefined } from '@microsoft-logic-apps/utils';
import * as SwaggerConstants from './constants';
import { dereferenceRefSchema , getEnum, getParameterDynamicSchema, getParameterDynamicValues } from './helpers/utils';

import * as ParameterKeyUtility from './helpers/keysutility';
import type { SchemaProperty } from '../models/operation';

export type Schema = OpenAPIV2.Schema;
type SchemaObject = OpenAPIV2.SchemaObject;

export interface ParentPropertyInfo {
    arrayName?: string;
    isArray?: boolean;
    visibility?: string;
}

// NOTE(tonytang): Below options are internal and should not be passed in except when called by the schema processor itself.
export interface InternalSchemaProcessorOptions {
    arrayOutputDepth?: number;
    isNested?: boolean;
    permission?: string;
}

export interface SchemaProcessorOptions extends InternalSchemaProcessorOptions {
    expandOneOf?: boolean;
    selectAllOneOfSchemas?: boolean;
    data?: any;
    dataKeyPrefix?: string;

    currentKey?: string;
    excludeAdvanced?: boolean;
    excludeInternal?: boolean;

    /**
     * Do not expand array outputs if set to true, i.e., treat the array as a scalar. Default is true.
     */
    expandArrayOutputs?: boolean;
    expandArrayOutputsDepth?: number;
    fileParameterAware?: boolean;
    includeParentObject?: boolean;
    isInputSchema?: boolean;
    keyPrefix?: string;

    /**
     * @member {any} metadata
     * Metadata returned by swagger-parser for the entire API definition with a possibly empty set of cyclical schema
     * definitions.
     */
    metadata?: any;

    parentProperty?: ParentPropertyInfo;
    prefix?: string;
    required?: boolean;
    summaryPrefix?: string;
    titlePrefix?: string;
    useAliasedIndexing?: boolean;
    outputKey?: string;
}

export class SchemaProcessor {
    constructor(private options: SchemaProcessorOptions = {}) {
        this.options = {
            arrayOutputDepth: 0,
            excludeAdvanced: false,
            excludeInternal: true,
            expandArrayOutputs: true,
            expandArrayOutputsDepth: 0,
            isInputSchema: false,
            required: false,
            ...options,
        };
    }

    getSchemaProperties(schema: Schema): SchemaProperty[] {
        schema = this._dereferenceRefSchema(schema) as SchemaObject;

        let properties: SchemaProperty[];
        switch (schema.type) {
            case SwaggerConstants.Types.Array:
                properties = this._getArrayProperties(schema);
                break;

            case SwaggerConstants.Types.Boolean:
            case SwaggerConstants.Types.Integer:
            case SwaggerConstants.Types.Null:
            case SwaggerConstants.Types.Number:
            case SwaggerConstants.Types.String:
            case undefined:
                properties = this._getScalarProperties(schema);
                break;

            case SwaggerConstants.Types.Object:
                // TODO(nimrodg): this condition will go away once Button trigger can fupport Object in the UI
                if (
                    this.options.fileParameterAware &&
                    schema.properties?.[SwaggerConstants.FILE_PARAMETER_KEYS.CONTENT] &&
                    schema.properties?.[SwaggerConstants.FILE_PARAMETER_KEYS.FILENAME]
                ) {
                    properties = this._getFileProperties(schema);
                } else {
                    properties = this._getObjectProperties(schema, this.options.keyPrefix, this.options.titlePrefix, this.options.summaryPrefix);
                }
                break;

            default:
                properties = [];
                break;
        }

        properties = properties
            .filter(property => !(this.options.excludeInternal && equals(property.visibility, SwaggerConstants.Visibility.Internal)))
            .filter(property => !(this.options.excludeAdvanced && equals(property.visibility, SwaggerConstants.Visibility.Advanced)));

        return this._sortProperties(properties);
    }

    // TODO(uxteam): Might have to redo for handling primitive arrays
    private _getArrayProperties(schema: SchemaObject, skipParent = false): SchemaProperty[] {
        const itemsSchema = (this._dereferenceRefSchema(schema.items as Schema) || {}) as SchemaObject;
        const itemsType = itemsSchema.type;
        const arrayOutputs = skipParent ? [] : this._getScalarProperties(schema);
        const isReadOnlyInputParameter = this.options.isInputSchema && this._isReadOnlyParameter(schema);

        if (this.options.expandArrayOutputs && !this._isInternalParameter(schema) && !isReadOnlyInputParameter) {
            if (this.options.expandArrayOutputsDepth === undefined || (this.options.arrayOutputDepth as number) > this.options.expandArrayOutputsDepth) {
                return arrayOutputs;
            }

            if (this.options.parentProperty) {
                this.options.parentProperty.arrayName = this.options.prefix;
                this.options.parentProperty.isArray = true;
                this.options.parentProperty.visibility = this._getVisibility(schema);
            } else {
                this.options.parentProperty = {
                    arrayName: this._getName(),
                    isArray: true,
                    visibility: this._getVisibility(schema),
                };
            }

            // NOTE(psamband): Reset the prefix only while expanding array properties for outputs.
            if (!this.options.isInputSchema) {
                this.options.prefix = undefined;
            }

            const summary = schema[SwaggerConstants.ExtensionProperties.Summary];
            const intl = getIntl();
            // NOTE(johnwa): always apply array name as prefix for input schema
            const title = this.options.isInputSchema
                ? schema.title || (this.options.currentKey === ParameterKeyUtility.WildIndexSegment
                    ? intl.formatMessage({ defaultMessage: 'Item', description: 'Label for single item inside an array.' })
                    : this.options.currentKey)
                : schema.title;
            const originalTitlePrefix = this.options.titlePrefix;
            const originalSummaryPrefix = this.options.summaryPrefix;
            const itemSummary = itemsSchema[SwaggerConstants.ExtensionProperties.Summary];
            this.options.titlePrefix = this._concatenateString(originalTitlePrefix, itemsSchema.title ? undefined : title);
            this.options.summaryPrefix = this._concatenateString(originalSummaryPrefix, itemSummary ? undefined : summary);
            this.options.currentKey = ParameterKeyUtility.WildIndexSegment;
            (this.options.arrayOutputDepth as number)++;

            const itemParameter = this._getPropertyDetails(itemsSchema, /* schema */ undefined, /* isArrayItems */ true) as SchemaProperty;
            arrayOutputs.push(itemParameter);

            if (itemsType === SwaggerConstants.Types.Object) {
                if (itemsSchema[SwaggerConstants.ExtensionProperties.DynamicSchema]) {
                    return this._getScalarProperties(itemsSchema).concat(arrayOutputs);
                } else {
                    const keyPrefix = this.options.keyPrefix ? `${this.options.keyPrefix}.${ParameterKeyUtility.WildIndexSegment}` : `$.${ParameterKeyUtility.WildIndexSegment}`;
                    const itemsOutputs = this._getObjectPropertyOutputs(itemsSchema, keyPrefix, this.options.titlePrefix, this.options.summaryPrefix);
                    if (itemsOutputs.length) {
                        return itemsOutputs.concat(arrayOutputs);
                    }
                }
            } else if (itemsType === SwaggerConstants.Types.Array) {
                this.options.keyPrefix = itemParameter.key;
                this.options.prefix = itemParameter.name;

                const nestArrayOutputs = this._getArrayProperties(itemsSchema, /* skipParent */ true);
                if (nestArrayOutputs.length) {
                    return nestArrayOutputs.concat(arrayOutputs);
                }
            }
        }

        return arrayOutputs;
    }

    // TODO(nimrodg): This should go away once Button ui supports Object type parameters. for now - convert the object to scalar and sets contentHint to FILE.
    private _getFileProperties(schema: SchemaObject): SchemaProperty[] {
        const clonedSchema = clone(schema);
        clonedSchema.type = SwaggerConstants.Types.String;
        clonedSchema.format = SwaggerConstants.FormatByte;
        clonedSchema['contentHint'] = 'FILE';
        delete clonedSchema.properties;
        return this._getScalarProperties(clonedSchema);
    }

    private _getObjectProperties(schema: SchemaObject, keyPrefix: string | undefined, titlePrefix: string | undefined, summaryPrefix: string | undefined): SchemaProperty[] {
        const properties: SchemaProperty[] = [];
        const propertyOutputs = this._getObjectPropertyOutputs(schema, keyPrefix, titlePrefix, summaryPrefix);

        if (hasProperty(schema, SwaggerConstants.ExtensionProperties.DynamicSchema)) {
            const property = this._getPropertyDetails(schema);
            if (property) {
                properties.push(property);
            }

            return properties;
        } else {
            if (propertyOutputs.length) {
                return propertyOutputs;
            } else {
                return this._getScalarProperties(schema);
            }
        }
    }

    private _getObjectPropertyOutputs(schema: SchemaObject, keyPrefix: string | undefined, titlePrefix: string | undefined, summaryPrefix: string | undefined): SchemaProperty[] {
        const properties: Record<string, Schema> = schema.properties || {};
        const requiredProperties = schema.required || [];
        const keys = Object.keys(properties);
        const permission = schema[SwaggerConstants.ExtensionProperties.Permission] || this.options.permission;
        const isReadOnlyInputParameter = this.options.isInputSchema && this._isReadOnlyParameter(schema);
        const summary = schema[SwaggerConstants.ExtensionProperties.Summary];
        let schemaProperties: SchemaProperty[] = [];
        titlePrefix = this._concatenateString(titlePrefix, schema.title);
        summaryPrefix = this._concatenateString(summaryPrefix, summary);

        if (keys.length && !this._isInternalParameter(schema) && !isReadOnlyInputParameter) {
            const outputs = keys.map(key => {
                const childOutput = properties[key] as SchemaObject;

                let parentKeyPrefix = keyPrefix || this.options.keyPrefix;
                parentKeyPrefix = parentKeyPrefix ? parentKeyPrefix : '$';

                const childAlias = childOutput[SwaggerConstants.ExtensionProperties.Alias];
                const childPropertyName = this.options.useAliasedIndexing && !!childAlias ? childAlias : key;

                const encodedChildPropertyName = ParameterKeyUtility.encodePropertySegment(childPropertyName);
                const childKeyPrefix = parentKeyPrefix ? `${parentKeyPrefix}.${encodedChildPropertyName}` : encodedChildPropertyName;
                const prefix =
                    this.options.useAliasedIndexing && childAlias
                        ? childAlias
                        : this.options.prefix
                        ? `${this.options.prefix}.${encodedChildPropertyName}`
                        : encodedChildPropertyName;
                const required = isNullOrUndefined(this.options.required)
                    ? requiredProperties.indexOf(key) !== -1
                    : this.options.required && requiredProperties.indexOf(key) !== -1;
                const parentProperty = { ...this.options.parentProperty, visibility: this._getVisibility(schema) };

                const processor = new SchemaProcessor({
                    expandOneOf: this.options.expandOneOf,
                    selectAllOneOfSchemas: this.options.selectAllOneOfSchemas,
                    data: this.options.data,
                    dataKeyPrefix: this.options.dataKeyPrefix,
                    arrayOutputDepth: this.options.arrayOutputDepth,
                    currentKey: key,
                    excludeAdvanced: this.options.excludeAdvanced,
                    excludeInternal: this.options.excludeInternal,
                    expandArrayOutputs: this.options.expandArrayOutputs,
                    expandArrayOutputsDepth: this.options.expandArrayOutputsDepth,
                    fileParameterAware: this.options.fileParameterAware,
                    includeParentObject: this.options.includeParentObject,
                    isInputSchema: this.options.isInputSchema,
                    useAliasedIndexing: this.options.useAliasedIndexing,
                    isNested: true,
                    keyPrefix: childKeyPrefix,
                    metadata: this.options.metadata,
                    parentProperty,
                    permission,
                    prefix,
                    required,
                    summaryPrefix,
                    titlePrefix,
                });

                return processor.getSchemaProperties(childOutput);
            });

            schemaProperties = aggregate(outputs);
        }

        if (this.options.includeParentObject && !isReadOnlyInputParameter) {
            const name = this._getName() as string;

            schemaProperties.push({
                alias: schema[SwaggerConstants.ExtensionProperties.Alias],
                default: schema.default,
                description: schema.description,
                dynamicValues: getParameterDynamicValues(schema),
                dynamicSchema: getParameterDynamicSchema(schema),
                format: schema.format,
                isInsideArray: this.options.parentProperty && this.options.parentProperty.isArray,
                isNested: this.options.isNested,
                isNotificationUrl: schema[SwaggerConstants.ExtensionProperties.NotificationUrl],
                key: keyPrefix || this.options.keyPrefix || '$',
                parentArray: this.options.parentProperty && this.options.parentProperty.arrayName,
                permission,
                name,
                readOnly: schema.readOnly,
                recommended: schema[SwaggerConstants.ExtensionProperties.SchedulerRecommendation],
                required: this.options.required,
                schema,
                summary: this._getSummary(summary, ''),
                title: this._getTitle(schema.title || schema[SwaggerConstants.ExtensionProperties.Summary], this.options.currentKey as string),
                type: SwaggerConstants.Types.Object,
                visibility: this._getVisibility(schema),
            });
        }

        return this._sortProperties(schemaProperties);
    }

    private _getScalarProperties(schema: Schema, $schema?: Schema): SchemaProperty[] {
        const schemaProperty = this._getPropertyDetails(schema, $schema);
        if (this.options.expandOneOf && schemaProperty) {
            return this._expandOneOfProperty(schemaProperty);
        }
        return schemaProperty ? [schemaProperty] : [];
    }

    private _expandOneOfProperty(schemaProperty: SchemaProperty): SchemaProperty[] {
        if (schemaProperty.schema?.['oneOf']) {
            let schemas = schemaProperty.schema['oneOf'];
            if (!this.options.selectAllOneOfSchemas) {
                const value = ParameterKeyUtility.getValue(schemaProperty.key, <string>this.options.dataKeyPrefix, this.options.data);
                schemas = [this._selectSchema(schemaProperty.schema['oneOf'] as SchemaObject[], value)];
            }

            const schemaProcessorOptions: SchemaProcessorOptions = {
                expandArrayOutputs: false,
                expandArrayOutputsDepth: 0,
                includeParentObject: false,
                required: schemaProperty.required,
                isInputSchema: true,
                keyPrefix: schemaProperty.key,
                excludeAdvanced: false,
                excludeInternal: false,
                useAliasedIndexing: false,
            };
            const schemaProcessor = new SchemaProcessor(schemaProcessorOptions);

            const schemaProperties: SchemaProperty[] = [];
            for (const schema of schemas) {
                if (schema) {
                    schemaProperties.push(...schemaProcessor.getSchemaProperties(schema as SchemaObject));
                }
            }
            return schemaProperties;
        }

        return [schemaProperty];
    }

    private _selectSchema(schemas: SchemaObject[], data: any): SchemaObject {
        for (const schema of schemas) {
            if (data !== undefined) {
                let match = false;
                for (const uniqueProperty of schema['x-ms-oneof-unique-properties']) {
                    if (data[uniqueProperty] !== undefined) {
                        match = true;
                        break;
                    }
                }
                if (match) {
                    return schema;
                }
            }
        }

        return schemas[0];
    }

    private _dereferenceRefSchema(schema: Schema | undefined): SchemaObject | undefined {
        if (isNullOrUndefined(schema)) {
            return schema;
        }

        /**
         * $ref exists in a schema only after inlining $refs when the $ref would have introduced a cyclical schema
         * definition so look up the $ref in swagger-parser metadata and resolve its type as follows:
         * - type === 'object' → Treat the schema as an object schema with no known properties.
         */
        const { $ref } = schema;
        if ($ref) {
            const { metadata } = this.options;
            schema = dereferenceRefSchema($ref, metadata);
        }

        return schema;
    }

    /*
     * Gets the name of the parameter, which will be used as a key.
     * If the parameter has a path, use that as the name. With no path it is either the body or an array item reference.
     */
    private _getName(): string | undefined {
        if (!this.options.prefix && !this.options.isInputSchema) {
            const { parentProperty } = this.options;
            if (parentProperty && parentProperty.isArray) {
                return parentProperty.arrayName && parentProperty.arrayName !== SwaggerConstants.OutputKeys.Body
                    ? `${parentProperty.arrayName}-${SwaggerConstants.OutputKeys.Item}`
                    : SwaggerConstants.OutputKeys.Item;
            } else {
                return this.options.outputKey || SwaggerConstants.OutputKeys.Body;
            }
        }

        // NOTE(psamband): Prefix is not well defined for items in array of primitive types. Hence explicitly setting the name.
        if (
            this.options.isInputSchema &&
            this.options.parentProperty &&
            this.options.parentProperty.isArray &&
            this.options.parentProperty.arrayName &&
            this.options.currentKey === ParameterKeyUtility.WildIndexSegment
        ) {
            return `${this.options.parentProperty.arrayName}.${ParameterKeyUtility.WildIndexSegment}`;
        }

        return this.options.prefix || this.options.currentKey;
    }

    private _getPropertyDetails(inputSchema: SchemaObject, $schema?: SchemaObject, isArrayItems = false): SchemaProperty | undefined {
        const { isInputSchema, parentProperty, permission: $permission, required: $required } = this.options;

        let keyPrefix = this.options.keyPrefix ? this.options.keyPrefix : '$';
        keyPrefix = isArrayItems ? `${keyPrefix}.${ParameterKeyUtility.WildIndexSegment}` : keyPrefix;

        const name = this._getName();
        const schema = $schema || inputSchema;
        const $default = schema.default;
        const contentHint = schema[SwaggerConstants.ExtensionProperties.ContentHint];
        const description = schema.description;
        const dynamicallyAdded = schema[SwaggerConstants.ExtensionProperties.DynamicallyAdded];
        const editor = schema[SwaggerConstants.ExtensionProperties.Editor];
        const editorOptions = schema[SwaggerConstants.ExtensionProperties.EditorOptions];
        const encode = schema[SwaggerConstants.ExtensionProperties.Encode];
        const $enum = getEnum(schema, $required);
        const format = <string>schema.format;
        const itemSchema = this._dereferenceRefSchema(schema.items as Schema);
        const isInsideArray = parentProperty && parentProperty.isArray;
        const isNested = this.options.isNested;
        const isNotificationUrl = schema[SwaggerConstants.ExtensionProperties.NotificationUrl];
        const parentArray = parentProperty && parentProperty.arrayName;
        const permission = schema[SwaggerConstants.ExtensionProperties.Permission] || $permission;
        const readOnly = schema.readOnly;
        const recommended = schema[SwaggerConstants.ExtensionProperties.SchedulerRecommendation];
        const required = $required;
        let title = this._getTitle(schema.title || schema[SwaggerConstants.ExtensionProperties.Summary], this.options.currentKey as string);
        const summary = this._getSummary(schema[SwaggerConstants.ExtensionProperties.Summary], '');
        const type = <string>schema.type || SwaggerConstants.Types.Any;
        const visibility = this._getVisibility(schema);
        const alias = schema[SwaggerConstants.ExtensionProperties.Alias];

        // Exclude read-only parameters from input schema, i.e., objects in Swagger body parameters.
        if (isInputSchema && this._isReadOnlyParameter(schema)) {
            return undefined;
        }

        if (!title && isInputSchema) {
            title = 'Body';
        }

        return {
            alias,
            contentHint,
            default: $default,
            description,
            dynamicallyAdded,
            dynamicSchema: getParameterDynamicSchema(schema),
            dynamicValues: getParameterDynamicValues(schema),
            editor,
            editorOptions,
            encode,
            enum: $enum,
            format,
            itemSchema,
            isInsideArray,
            isNested,
            isNotificationUrl,
            key: keyPrefix,
            name: name || title,
            parentArray,
            permission,
            readOnly,
            recommended,
            required,
            schema,
            summary,
            title,
            type,
            visibility,
        };
    }

    private _getSummary(summary: string, key: string): string {
        const summaryText = summary || key,
            summaryPrefix = this.options.summaryPrefix;

        return summaryPrefix && summaryText ? `${summaryPrefix} ${summaryText}` : summaryText;
    }

    private _getTitle(title: string, key: string): string {
        const intl = getIntl();
        const titleText = title
            ? title
            : key === ParameterKeyUtility.WildIndexSegment
                ? intl.formatMessage({ defaultMessage: 'Item', description: 'Label for single item inside an array.' })
                : key;
        const titlePrefix = this.options.titlePrefix || this.options.summaryPrefix;

        return titlePrefix && titleText ? `${titlePrefix} ${titleText}` : titleText;
    }

    private _getVisibility(schema: SchemaObject): string {
        return schema[SwaggerConstants.ExtensionProperties.Visibility] || (this.options.parentProperty ? this.options.parentProperty.visibility : '');
    }

    private _sortProperties(parameters: SchemaProperty[]): SchemaProperty[] {
        const sortedParameters: SchemaProperty[] = [];

        parameters.forEach(parameter => {
            if (parameter.required) {
                sortedParameters.push(parameter);
            }
        });

        parameters.forEach(parameter => {
            if (!parameter.required && equals(parameter.visibility, SwaggerConstants.Visibility.Important)) {
                sortedParameters.push(parameter);
            }
        });

        parameters.forEach(parameter => {
            if (
                !parameter.required &&
                !equals(parameter.visibility, SwaggerConstants.Visibility.Important) &&
                !equals(parameter.visibility, SwaggerConstants.Visibility.Advanced)
            ) {
                sortedParameters.push(parameter);
            }
        });

        parameters.forEach(parameter => {
            if (!parameter.required && !equals(parameter.visibility, SwaggerConstants.Visibility.Important) && equals(parameter.visibility, SwaggerConstants.Visibility.Advanced)) {
                sortedParameters.push(parameter);
            }
        });

        return sortedParameters;
    }

    private _isReadOnlyParameter(schema: SchemaObject): boolean {
        const readOnly = schema.readOnly;
        const permission = schema[SwaggerConstants.ExtensionProperties.Permission] || this.options.permission;
        return readOnly || equals(permission, SwaggerConstants.Permissions.ReadOnly);
    }

    private _isInternalParameter(schema: SchemaObject): boolean {
        return equals(schema[SwaggerConstants.ExtensionProperties.Visibility], SwaggerConstants.Visibility.Internal);
    }

    private _concatenateString(left: string | undefined, right: string | undefined): string | undefined {
        return left && right ? `${left} ${right}` : right || left;
    }
}
