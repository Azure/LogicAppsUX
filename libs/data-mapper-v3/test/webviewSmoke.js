const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

async function run() {
    const messages = [];
    const browserErrors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => browserErrors.push(error));

    const dom = new JSDOM('<!doctype html><html><head></head><body><div id="app"></div></body></html>', {
        pretendToBeVisual: true,
        runScripts: 'outside-only',
        url: 'https://webview.test/',
        virtualConsole
    });

    dom.window.acquireVsCodeApi = () => ({
        postMessage: message => messages.push(message),
        getState: () => undefined,
        setState: () => undefined
    });
    dom.window.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };

    const bundle = fs.readFileSync(path.join(__dirname, '..', 'out', 'webview', 'webview.js'), 'utf8');
    dom.window.eval(bundle);
    await new Promise(resolve => setTimeout(resolve, 25));

    assert.equal(messages[0]?.type, 'ready');
    assert.ok(dom.window.document.querySelector('[data-ui-framework="react"]'));
    assert.ok(dom.window.document.querySelector('[data-component="mapper-app"]'));

    const schema = {
        filePath: 'schema.xsd',
        rootElement: {
            name: 'Root',
            path: '/Root',
            children: [{
                name: 'Value',
                path: '/Root/Value',
                dataType: 'xs:string',
                children: [{
                    name: 'Inner',
                    path: '/Root/Value/Inner',
                    dataType: 'xs:string',
                    children: [],
                    attributes: []
                }],
                attributes: []
            }],
            attributes: []
        }
    };
    const map = {
        name: 'Smoke Map',
        sourceSchema: { location: 'source.xsd' },
        targetSchema: { location: 'target.xsd' },
        pages: [{ id: 'page1', name: 'Page 1', links: [], functoids: [] }]
    };

    dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
        data: {
            type: 'init',
            data: {
                map,
                sourceSchema: schema,
                targetSchema: schema,
                functoids: [{
                    id: 107,
                    name: 'String Concatenate',
                    category: 'String',
                    tooltip: 'Concatenate values'
                }]
            }
        }
    }));
    await new Promise(resolve => setTimeout(resolve, 50));

    const document = dom.window.document;
    assert.equal(document.querySelector('.toolbar-map-name')?.textContent?.trim(), '📐 Smoke Map');
    assert.equal(document.querySelectorAll('biztalk-schema-tree').length, 2);
    assert.equal(document.querySelectorAll('.tree-node').length, 6);
    assert.ok(document.querySelector('biztalk-functoid-palette .palette-item'));
    assert.ok(document.querySelector('biztalk-mapping-canvas svg.mapping-svg'));

    document.querySelector('#btn-copilot')
        .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 25));
    const copilotPrompt = document.querySelector('#copilot-prompt');
    assert.ok(copilotPrompt);
    assert.equal(copilotPrompt.value, 'Take the XSLT file and generate the map.');
    document.querySelector('#copilot-add-context')
        .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(messages.at(-1).type, 'browseCopilotContext');
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
        data: {
            type: 'copilotContextChanged',
            data: {
                files: [{ id: 'file:///sample.xslt', name: 'sample.xslt', size: 2048 }]
            }
        }
    }));
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(document.querySelector('.copilot-context-file span').textContent, 'sample.xslt');
    document.querySelector('.copilot-remove-context')
        .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(messages.at(-1).type, 'removeCopilotContext');
    assert.equal(messages.at(-1).data.id, 'file:///sample.xslt');
    copilotPrompt.value = 'Rename this map to Copilot Map';
    copilotPrompt.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    copilotPrompt.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        bubbles: true
    }));
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(JSON.stringify(messages.at(-1)), JSON.stringify({
        type: 'copilotPrompt',
        data: { prompt: 'Rename this map to Copilot Map', activePage: 0 }
    }));
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
        data: {
            type: 'copilotResult',
            data: {
                success: true,
                applied: true,
                message: 'Renamed the map',
                map: { ...map, name: 'Copilot Map' }
            }
        }
    }));
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(document.querySelector('.toolbar-map-name')?.textContent?.trim(), '📐 Copilot Map');
    assert.match(document.querySelector('.copilot-result')?.textContent, /Renamed the map/);

    document.querySelector('.page-tab')
        .dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 25));
    const pageNameInput = document.querySelector('.page-name-input');
    assert.ok(pageNameInput);
    pageNameInput.value = 'Main Mapping';
    pageNameInput.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true
    }));
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(map.pages[0].name, 'Main Mapping');
    assert.equal(document.querySelector('.page-tab').textContent.trim(), 'Main Mapping');
    assert.equal(document.querySelector('.page-delete-btn').disabled, true);

    document.querySelector('#btn-add-page')
        .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(map.pages.length, 2);
    document.querySelector('.page-delete-btn[data-page="1"]')
        .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(map.pages.length, 1);
    assert.equal(map.pages[0].name, 'Main Mapping');

    const sourceInnerNode = Array.from(
        document.querySelectorAll('biztalk-schema-tree.source-tree .tree-node')
    ).find(node => node.dataset.path === '/Root/Value/Inner');
    sourceInnerNode.dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(document.querySelector('.schema-properties-panel .schema-property-name').textContent, 'Inner');
    assert.equal(document.querySelector('.schema-property-xpath').textContent.trim(), '/Root/Value/Inner');
    assert.match(document.querySelector('.schema-property-list').textContent, /Data type\s*xs:string/);
    document.querySelector('#schema-properties-close')
        .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 25));

    const sourceTree = document.querySelector('biztalk-schema-tree.source-tree');
    sourceTree.querySelector('button[title="Collapse All"]')
        .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(document.querySelectorAll('.tree-node').length, 5);

    sourceTree.querySelector('button[title="Expand All"]')
        .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(document.querySelectorAll('.tree-node').length, 6);

    const categoryHeader = document.querySelector('biztalk-functoid-palette .category-header');
    categoryHeader.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(document.querySelectorAll('biztalk-functoid-palette .palette-item').length, 0);
    categoryHeader.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 25));

    const sourceConnector = Array.from(
        document.querySelectorAll('biztalk-schema-tree.source-tree .tree-node')
    ).find(node => node.dataset.path === '/Root/Value/Inner')?.querySelector('.node-connector');
    const targetConnector = Array.from(
        document.querySelectorAll('biztalk-schema-tree.target-tree .tree-node')
    ).find(node => node.dataset.path === '/Root/Value/Inner')?.querySelector('.node-connector');
    sourceConnector.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    targetConnector.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(map.pages[0].links.length, 1);
    assert.ok(document.querySelector('.mapping-links-overlay [data-link-id]'));
    document.querySelector('.mapping-links-overlay [data-link-id] path')
        .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(
        document.querySelector('.mapping-links-overlay [data-link-id] .mapping-link')
            .getAttribute('stroke'),
        '#007fd4'
    );

    document.querySelector('biztalk-functoid-palette .palette-item')
        .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 25));

    assert.equal(map.pages[0].functoids.length, 1);
    const canvas = document.querySelector('biztalk-mapping-canvas');
    assert.ok(canvas.querySelector('.functoid-node'));
    canvas.querySelector('.functoid-node text')
        .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(
        canvas.querySelector('.functoid-node .functoid-body').tagName.toLowerCase(),
        'circle'
    );
    assert.equal(
        canvas.querySelector('.functoid-node .functoid-body').getAttribute('stroke'),
        '#007fd4'
    );

    const zoomIn = canvas.querySelector('button[title="Zoom In"]');
    zoomIn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(canvas.querySelector('[data-zoom]')?.textContent, '110%');
    assert.match(canvas.querySelector('.functoid-node').getAttribute('transform'), /scale\(1\.1\)/);

    const pathBeforeScroll = document.querySelector('.mapping-links-overlay [data-link-id] path').getAttribute('d');
    canvas.scrollLeft = 20;
    canvas.scrollTop = 10;
    canvas.dispatchEvent(new dom.window.Event('scroll'));
    await new Promise(resolve => setTimeout(resolve, 25));
    const pathAfterScroll = document.querySelector('.mapping-links-overlay [data-link-id] path').getAttribute('d');
    assert.equal(pathAfterScroll, pathBeforeScroll);

    const droppedFunctoid = {
        id: 107,
        name: 'String Concatenate',
        category: 'String'
    };
    const dropEvent = new dom.window.Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperties(dropEvent, {
        clientX: { value: 110 },
        clientY: { value: 66 },
        dataTransfer: {
            value: {
                getData: type => type === 'functoid' ? JSON.stringify(droppedFunctoid) : '',
                dropEffect: 'copy'
            }
        }
    });
    canvas.querySelector('svg.mapping-svg').dispatchEvent(dropEvent);
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(map.pages[0].functoids.length, 2);
    assert.ok(Math.abs(map.pages[0].functoids[1].x - (130 / 1.1)) < 0.001);
    assert.ok(Math.abs(map.pages[0].functoids[1].y - (76 / 1.1)) < 0.001);

    const initialX = map.pages[0].functoids[0].x;
    const initialY = map.pages[0].functoids[0].y;
    canvas.querySelector('.functoid-node text').dispatchEvent(
        new dom.window.MouseEvent('mousedown', { bubbles: true, clientX: 100, clientY: 100 })
    );
    canvas.querySelector('svg.mapping-svg').dispatchEvent(
        new dom.window.MouseEvent('mousemove', { bubbles: true, clientX: 155, clientY: 144 })
    );
    canvas.querySelector('svg.mapping-svg').dispatchEvent(
        new dom.window.MouseEvent('mouseup', { bubbles: true, clientX: 155, clientY: 144 })
    );
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.ok(Math.abs(map.pages[0].functoids[0].x - initialX - 50) < 0.001);
    assert.ok(Math.abs(map.pages[0].functoids[0].y - initialY - 40) < 0.001);

    const edgeDragStartX = map.pages[0].functoids[0].x;
    const edgeDragStartY = map.pages[0].functoids[0].y;
    canvas.querySelector('.functoid-node .functoid-body').dispatchEvent(
        new dom.window.MouseEvent('mousedown', { bubbles: true, clientX: 132, clientY: 100 })
    );
    canvas.querySelector('svg.mapping-svg').dispatchEvent(
        new dom.window.MouseEvent('mousemove', { bubbles: true, clientX: 154, clientY: 133 })
    );
    canvas.querySelector('svg.mapping-svg').dispatchEvent(
        new dom.window.MouseEvent('mouseup', { bubbles: true, clientX: 154, clientY: 133 })
    );
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.ok(Math.abs(map.pages[0].functoids[0].x - edgeDragStartX - 20) < 0.001);
    assert.ok(Math.abs(map.pages[0].functoids[0].y - edgeDragStartY - 30) < 0.001);

    const editableFunctoid = map.pages[0].functoids[0];
    map.pages[0].links.push(
        {
            id: 'functoid-input-1',
            sourceId: '/Root/Value',
            sourcePath: '/Root/Value',
            targetId: editableFunctoid.id,
            sourceType: 'schemaNode',
            targetType: 'functoid'
        },
        {
            id: 'functoid-input-2',
            sourceId: '/Root/Value/Inner',
            sourcePath: '/Root/Value/Inner',
            targetId: editableFunctoid.id,
            sourceType: 'schemaNode',
            targetType: 'functoid'
        }
    );
    editableFunctoid.inputLinks = ['functoid-input-1', 'functoid-input-2'];
    editableFunctoid.parameters = [
        { index: 1, type: 'constant', value: '-middle-' }
    ];
    canvas.querySelector('.functoid-node').dispatchEvent(
        new dom.window.MouseEvent('dblclick', { bubbles: true })
    );
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(document.querySelectorAll('.functoid-input-row').length, 3);
    assert.equal(document.querySelectorAll('.functoid-default-input').length, 3);

    document.querySelector('[data-input-action="down"][data-index="0"]')
        .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 25));
    document.querySelector('[data-input-action="up"][data-index="2"]')
        .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 25));
    const defaultInputs = document.querySelectorAll('.functoid-default-input');
    const defaultInput = defaultInputs[1];
    defaultInput.value = '-suffix';
    defaultInput.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    document.querySelector('#properties-save')
        .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 25));

    assert.deepEqual(
        JSON.parse(JSON.stringify(
            editableFunctoid.parameters.map(parameter => [parameter.type, parameter.value])
        )),
        [
            ['constant', '-middle-'],
            ['link', 'functoid-input-2'],
            ['link', 'functoid-input-1']
        ]
    );
    assert.equal(editableFunctoid.parameters[1].defaultValue, '-suffix');
    assert.deepEqual(
        JSON.parse(JSON.stringify(editableFunctoid.inputLinks)),
        ['functoid-input-2', 'functoid-input-1']
    );

    const currentCanvas = document.querySelector('biztalk-mapping-canvas');
    for (let index = 0; index < 15; index++) {
        currentCanvas.querySelector('button[title="Zoom Out"]')
            .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 0));
    }
    assert.equal(currentCanvas.querySelector('[data-zoom]')?.textContent, '10%');
    assert.equal(currentCanvas.querySelector('button[title="Zoom Out"]').disabled, true);

    assert.ok(messages.some(message => message.type === 'update'));
    assert.deepEqual(browserErrors, []);

    dom.window.close();
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
