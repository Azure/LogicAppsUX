import type { OperationManifest } from '@microsoft-logic-apps/utils';
import { getObjectPropertyValue, map } from '@microsoft-logic-apps/utils';
import type { InputParameter, OutputParameter} from '../models/operation';
import { toInputParameter } from '../models/operation';
import { OutputsProcessor } from '../common/outputprocessor';
import type { SchemaProcessorOptions } from '../common/schemaprocessor';
import { SchemaProcessor } from '../common/schemaprocessor';
import * as SwaggerConstants from '../common/constants';

export interface SplitOnAliasMetadata {
    alias?: string;
    propertyName?: string;
    required?: boolean;
}

export function getSplitOnArrayAliasMetadata(schema: Swagger.Schema, required: boolean, propertyName?: string): SplitOnAliasMetadata {
    if (schema.type === SwaggerConstants.Types.Array) {
        return {
            alias: <any>schema[SwaggerConstants.ExtensionProperties.Alias],
            propertyName,
            required,
        };
    } else if (schema.type === SwaggerConstants.Types.Object) {
        const keys = Object.keys(schema.properties || {});

        if (keys.length === 1) {
            const firstKey = keys[0];
            const propertyRequired = required && (schema.required || []).indexOf(firstKey) !== -1;
            return getSplitOnArrayAliasMetadata(schema.properties?.[firstKey] as Swagger.Schema, propertyRequired, firstKey);
        }
    }

    return {};
}

export class ManifestParser {
    private _operationManifest: OperationManifest;

    constructor(operationManifest: OperationManifest) {
        this._operationManifest = operationManifest;
    }

    /**
     * Gets the input parameters indexed by key.
     * @arg {boolean} includeParentObject - The value indicating whether to include parent object.
     * @arg {number} expandArrayDepth - The depth of expanding array.
     * @return {Record<string, InputParameter>}
     */
    public getInputParameters(includeParentObject: boolean, expandArrayDepth: number, expandOneOf?: boolean, input?: any): Record<string, InputParameter> {
        if (!this._operationManifest.properties.inputs) {
            return {};
        }

        const schemaProcessorOptions: SchemaProcessorOptions = {
            expandOneOf,
            data: input,
            dataKeyPrefix: 'inputs.$',
            expandArrayOutputs: expandArrayDepth > 0,
            expandArrayOutputsDepth: expandArrayDepth,
            includeParentObject,
            required: !this._operationManifest.properties.isInputsOptional,
            isInputSchema: true,
            keyPrefix: 'inputs.$',
            excludeAdvanced: false,
            excludeInternal: true,
            useAliasedIndexing: true,
        };

        const schemaProperties = new SchemaProcessor(schemaProcessorOptions).getSchemaProperties(this._operationManifest.properties.inputs);
        const inputParameters = schemaProperties.map(item => toInputParameter(item, !this._operationManifest.properties.autoCast));

        return map(inputParameters, 'key');
    }

    /**
     * Gets the output parameters indexed by key.
     * @arg {boolean} includeParentObject - The value indicating whether to include parent object.
     * @arg {number} expandArrayDepth - The depth of expanding array.
     * @arg {boolean} [expandOneOf] - The value indicating if one of should be expanded.
     * @arg {any} [outputs] - The outputs.
     * @arg {boolean} [selectAllOneOfSchemas=false] - The value indicating if all one of schemas should be selected.
     * @return {Record<string, InputParameter>}
     */
    public getOutputParameters(includeParentObject: boolean, expandArrayDepth: number, expandOneOf?: boolean, outputs?: any, selectAllOneOfSchemas = false): Record<string, OutputParameter> {
        if (!this._operationManifest.properties.outputs) {
            return {};
        }

        const schemaProcessorOptions: SchemaProcessorOptions = {
            expandOneOf,
            data: outputs,
            dataKeyPrefix: '$',
            selectAllOneOfSchemas,
            expandArrayOutputs: expandArrayDepth > 0,
            expandArrayOutputsDepth: expandArrayDepth,
            includeParentObject,
            required: !this._operationManifest.properties.isOutputsOptional,
            isInputSchema: false,
            excludeAdvanced: false,
            excludeInternal: true,
            useAliasedIndexing: true,
            outputKey: SwaggerConstants.OutputKeys.Outputs,
        };

        const selectedManifestOutputsSchema = this.getOutputsSchema(outputs);

        const schemaProperties = new SchemaProcessor(schemaProcessorOptions).getSchemaProperties(selectedManifestOutputsSchema as Swagger.Schema);
        const outputParameters = schemaProperties.map(item => OutputsProcessor.convertSchemaPropertyToOutputParameter(item, SwaggerConstants.OutputSource.Outputs, 'outputs'));

        /*
         * NOTE(trbaratc): Filtering the object output parameter representing outputs because it is not currently handled properly during serialization, etc.
         * If we decide in the future we want to support an "outputs" token for open api, we can remove this and add handling for it.
         */
        const filteredOutputParameters = !this._operationManifest.properties.includeRootOutputs
            ? outputParameters.filter(parameter => parameter.key !== 'outputs.$')
            : outputParameters;

        return map(filteredOutputParameters, SwaggerConstants.OutputMapKey);
    }

    private getOutputsSchema(outputs: any | undefined): Swagger.Schema | undefined {
        const alternativeSchema = this.getAlternativeOutputSchema(outputs);

        return alternativeSchema || this._operationManifest.properties.outputs;
    }

    private getAlternativeOutputSchema(outputs: any | undefined): Swagger.Schema | undefined {
        if (!outputs) {
            return undefined;
        }

        const altOutputs = this._operationManifest.properties.alternativeOutputs;

        if (!altOutputs) {
            return undefined;
        }

        const outputsKey = getObjectPropertyValue(outputs, altOutputs.keyPath, /* caseInsensitive */ false);

        if (outputsKey === undefined) {
            return undefined;
        }

        return altOutputs.schemas[outputsKey] || altOutputs.defaultSchema;
    }
}
