import { XMLParser } from 'fast-xml-parser';

const orderedChildren = Symbol('orderedXsdChildren');

type XsdObject = Record<string, any> & {
    [orderedChildren]?: Array<{ name: string; value: any }>;
};

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    allowBooleanAttributes: true,
    parseAttributeValue: true,
    trimValues: true,
    preserveOrder: true
});

export function parseOrderedXsd(xml: string): any {
    const parsed = parser.parse(xml);
    const root = parsed.find((entry: any) =>
        Object.keys(entry).some(name => name.split(':').pop() === 'schema')
    );
    if (!root) {
        return {};
    }
    return convertEntry(root);
}

export function getOrderedXsdChildren(
    container: any
): Array<{ name: string; value: any }> {
    return container?.[orderedChildren] ?? Object.entries(container || {})
        .filter(([name]) => !name.startsWith('@_') && name !== '#text')
        .flatMap(([name, value]) =>
            (Array.isArray(value) ? value : [value]).map(item => ({
                name,
                value: item
            }))
        );
}

function convertEntry(entry: any): any {
    const elementName = Object.keys(entry)
        .find(name => name !== ':@' && name !== '#text');
    if (!elementName) {
        return entry['#text'];
    }
    return {
        [elementName]: convertElement(entry[elementName], entry[':@'])
    };
}

function convertElement(children: any[], attributes?: Record<string, any>): XsdObject {
    const result: XsdObject = { ...(attributes || {}) };
    const order: Array<{ name: string; value: any }> = [];
    for (const childEntry of children || []) {
        if (childEntry['#text'] !== undefined) {
            result['#text'] = childEntry['#text'];
            continue;
        }
        const name = Object.keys(childEntry)
            .find(key => key !== ':@' && key !== '#text');
        if (!name) {
            continue;
        }
        const value = convertElement(childEntry[name], childEntry[':@']);
        order.push({ name, value });
        if (result[name] === undefined) {
            result[name] = value;
        } else if (Array.isArray(result[name])) {
            result[name].push(value);
        } else {
            result[name] = [result[name], value];
        }
    }
    Object.defineProperty(result, orderedChildren, {
        value: order,
        enumerable: false
    });
    return result;
}
