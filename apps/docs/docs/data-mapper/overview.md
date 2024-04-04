---
sidebar_position: 1
---

# Overview

## Purpose

To provide a graphical way to map data from a source schema to a target schema using direct mappings and functions, handling any translation between supported schema types in the backend

## Data Flow

From a fresh start, the data flow is as follows:

1. The `GET schemaTree` API translates supported schema files into a common JSON format. Additionally, an existing map definition may be loaded in at this step which will deserialize into connections
2. Connections between source schema, target schema, and function nodes are managed internally
3. The data map definition (YAML) is continuously serialized based on the above connections
4. On saving, the map definition is both outputted itself, and sent to the `generateXslt` API to generate the data map XSLT file

## Backend

### Test data

Test data (XSLTs, map definitions, schemas, etc.) to be utilized within Data Mapper can be found in the following repo: https://msazure.visualstudio.com/One/_git/AzureUX-BPM?path=/src/DataMapper&version=GBmaster

### API

#### Schema Translation - GET schemaTree

Translates any supported schema format into JSON consumed by the Data Mapper frontend

**Endpoint:** http://\{localhost:7071\}/runtime/webhooks/workflow/api/management/schemas/CBRSourceSchema/contents/schemaTree?api-version=2019-10-01-edge-preview

#### Function Manifest - GET mapTransformations

Responds with the list of available Functions and their metadata

**Endpoint:** http://\{localhost:7071\}/runtime/webhooks/workflow/api/management/mapTransformations?api-version=2019-10-01-edge-preview

#### Data Map XSLT generation - POST generateXslt

Formats a data map with all of its connections into the XSLT (.xslt) Formats

**Endpoint:** http://\{localhost:7071\}/runtime/webhooks/workflow/api/management/generateXslt

#### Test Mappings/Connections - POST testMap

Tests data map and its connections to ensure that a specified input schema value produces the expected output schema value

**Endpoint:** http://\{localhost:7071\}/runtime/webhooks/workflow/api/management/maps/\{mapXsltFilename\}/testMap
