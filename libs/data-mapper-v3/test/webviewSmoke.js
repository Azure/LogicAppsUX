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
    const compileRequestsBefore = messages.filter(message => message.type === 'compile').length;
    document.querySelector('#btn-validate-compile')
        .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(messages.filter(message => message.type === 'compile').length, compileRequestsBefore + 1);
    assert.equal(messages.at(-1).data.pages[0].functoids.length, 1);
    assert.match(document.querySelector('.notification-warning').textContent, /no input or output links/);
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

    // The surface must include off-screen functoids, rather than just the viewport.
    const originalCoordinates = { x: editableFunctoid.x, y: editableFunctoid.y };
    editableFunctoid.x = 2400;
    editableFunctoid.y = 1800;
    currentCanvas.setZoom(1);
    const scrollPositions = new Map([
        ['src:/Root/Value', { x: 0, y: 100 }],
        ['src:/Root/Value/Inner', { x: 0, y: 150 }],
        ['tgt:/Root/Value/Inner', { x: 900, y: 150 }]
    ]);
    currentCanvas.renderWithPositions(scrollPositions, map.pages[0]);
    await new Promise(resolve => setTimeout(resolve, 25));
    const surface = currentCanvas.querySelector('svg.mapping-svg');
    assert.equal(Number(surface.getAttribute('width')), 2480);
    assert.equal(Number(surface.getAttribute('height')), 1880);
    assert.equal(dom.window.getComputedStyle(currentCanvas).overflow, 'auto');
    assert.equal(dom.window.getComputedStyle(surface).minWidth, '100%');
    assert.equal(dom.window.getComputedStyle(surface).minHeight, '100%');
    currentCanvas.setZoom(0.5);
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(Number(surface.getAttribute('width')), 1240);
    assert.equal(Number(surface.getAttribute('height')), 940);
    currentCanvas.setZoom(2);
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(Number(surface.getAttribute('width')), 4960);
    assert.equal(Number(surface.getAttribute('height')), 3760);
    const linksBeforeScroll = Array.from(document.querySelectorAll('.mapping-links-overlay .mapping-link'),
        link => link.getAttribute('d'));
    currentCanvas.scrollLeft = 200;
    currentCanvas.scrollTop = 150;
    currentCanvas.dispatchEvent(new dom.window.Event('scroll'));
    await new Promise(resolve => setTimeout(resolve, 25));
    const linksAfterScroll = Array.from(document.querySelectorAll('.mapping-links-overlay .mapping-link'),
        link => link.getAttribute('d'));
    assert.notDeepEqual(linksAfterScroll, linksBeforeScroll);
    currentCanvas.renderWithPositions(new Map(), { id: 'empty', name: 'Empty', links: [], functoids: [] });
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(Number(surface.getAttribute('width')), 0);
    assert.equal(Number(surface.getAttribute('height')), 0);
    Object.assign(editableFunctoid, originalCoordinates);
    currentCanvas.setZoom(1);
    currentCanvas.renderWithPositions(new Map(), map.pages[0]);
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.ok(Number(surface.getAttribute('width')) < 2480);
    assert.ok(Number(surface.getAttribute('height')) < 1880);

    // Browse actions leave the current map untouched until the host commits a replacement.
    for (const side of ['source', 'target']) {
        const pane = document.querySelector(`.${side}-tree`);
        const before = JSON.stringify(map);
        pane.querySelector('.tree-node').dispatchEvent(
            new dom.window.MouseEvent('contextmenu', { bubbles: true, clientX: 20, clientY: 20 })
        );
        const replace = document.querySelector('.context-menu button');
        assert.match(replace.textContent, new RegExp(`Replace ${side === 'source' ? 'Source' : 'Target'} Schema`));
        replace.click();
        assert.equal(messages.at(-1).type, 'loadSchema');
        assert.equal(messages.at(-1).side, side);
        pane.querySelector(`button[aria-label="Replace ${side} schema"]`).click();
        assert.equal(messages.at(-1).side, side);
        assert.equal(JSON.stringify(map), before);
    }
    const updatesBeforeReplacement = messages.filter(message => message.type === 'update').length;
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
        data: { type: 'schemaStateChanged', data: { map, sourceSchema: null, targetSchema: null } }
    }));
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(messages.filter(message => message.type === 'update').length, updatesBeforeReplacement);
    for (const side of ['source', 'target']) {
        const pane = document.querySelector(`.${side}-tree`);
        pane.dispatchEvent(new dom.window.MouseEvent('contextmenu', { bubbles: true }));
        const add = document.querySelector('.context-menu button');
        assert.match(add.textContent, new RegExp(`Add ${side === 'source' ? 'Source' : 'Target'} Schema`));
        add.click();
        assert.equal(messages.at(-1).side, side);
        pane.querySelector('.load-schema-btn').click();
        assert.equal(messages.at(-1).side, side);
    }
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
        data: { type: 'schemaStateChanged', data: { map, sourceSchema: schema, targetSchema: schema } }
    }));
    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(document.querySelectorAll('biztalk-schema-tree').length, 2);
    assert.equal(messages.filter(message => message.type === 'update').length, updatesBeforeReplacement);

    const focusMap = {
        ...map,
        pages: [{
            id: 'focus', name: 'Focus', functoids: [
                { ...map.pages[0].functoids[0], id: 'near', x: 200, y: 200 },
                { ...map.pages[0].functoids[0], id: 'far', x: 4000, y: 3000 }
            ],
            links: [
                { id: 'ss', sourceId: '/Root/Value/Inner', targetId: '/Root/Value/Inner',
                    sourceType: 'schemaNode', targetType: 'schemaNode' },
                { id: 'sf', sourceId: '/Root/Value/Inner', targetId: 'far',
                    sourceType: 'schemaNode', targetType: 'functoid' },
                { id: 'fs', sourceId: 'near', targetId: '/Root/Value/Inner',
                    sourceType: 'functoid', targetType: 'schemaNode' },
                { id: 'ff', sourceId: 'near', targetId: 'far',
                    sourceType: 'functoid', targetType: 'functoid' }
            ]
        }]
    };
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
        data: { type: 'schemaStateChanged', data: { map: focusMap, sourceSchema: schema, targetSchema: schema } }
    }));
    await new Promise(resolve => setTimeout(resolve, 50));
    const focusCanvas = document.querySelector('biztalk-mapping-canvas');
    Object.defineProperties(focusCanvas, {
        clientWidth: { value: 600 },
        clientHeight: { value: 400 }
    });
    const panes = Array.from(document.querySelectorAll('biztalk-schema-tree'));
    for (const pane of panes) {
        Object.defineProperties(pane, {
            clientWidth: { value: 260 },
            clientHeight: { value: 300 }
        });
        pane.querySelector('button[title="Collapse All"]').click();
    }
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.ok(!panes[0].querySelector('[data-path="/Root/Value/Inner"]'));
    const originalRect = dom.window.HTMLElement.prototype.getBoundingClientRect;
    dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
        const pane = this.closest('biztalk-schema-tree');
        const isRow = this.classList.contains('tree-node') || this.classList.contains('node-connector');
        if (pane && isRow) {
            const top = 1000 - pane.scrollTop;
            return { x: 0, y: top, left: 0, top, right: 20, bottom: top + 24, width: 20, height: 24 };
        }
        if (this.classList.contains('schema-header')) {
            return { x: 0, y: 0, left: 0, top: 0, right: 260, bottom: 40, width: 260, height: 40 };
        }
        return originalRect.call(this);
    };
    const focusSnapshot = JSON.stringify(focusMap);
    const updateCount = messages.filter(message => message.type === 'update').length;
    const selectConnection = async id => {
        const hitTarget = document.querySelector(`.mapping-links-overlay [data-link-id="${id}"] path`);
        assert.ok(hitTarget, `Connection ${id} remains selectable when its schema node is collapsed`);
        hitTarget.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 25));
    };
    await selectConnection('ss');
    for (const pane of panes) {
        assert.ok(pane.querySelector('[data-path="/Root/Value/Inner"]'));
        assert.ok(pane.scrollTop > 0);
    }
    await selectConnection('ff');
    assert.ok(Number(focusCanvas.querySelector('[data-zoom]').dataset.zoom) < 100);
    const assertFunctoidVisible = id => {
        const transform = focusCanvas.querySelector(`.functoid-node[data-id="${id}"]`).getAttribute('transform');
        const numbers = transform.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g).map(Number);
        const [x, y, zoom] = numbers;
        assert.ok(x - focusCanvas.scrollLeft - 40 * zoom >= -0.001);
        assert.ok(x - focusCanvas.scrollLeft + 40 * zoom <= 600.001);
        assert.ok(y - focusCanvas.scrollTop - 32 * zoom >= -0.001);
        assert.ok(y - focusCanvas.scrollTop + 32 * zoom <= 400.001);
    };
    assertFunctoidVisible('near');
    assertFunctoidVisible('far');
    focusCanvas.scrollLeft = 900;
    focusCanvas.scrollTop = 900;
    await selectConnection('sf');
    assertFunctoidVisible('far');
    assert.equal(focusCanvas.querySelector('[data-zoom]').dataset.zoom, '100');
    await selectConnection('fs');
    assertFunctoidVisible('near');
    assert.equal(JSON.stringify(focusMap), focusSnapshot);
    assert.equal(messages.filter(message => message.type === 'update').length, updateCount);
    focusMap.pages[0].functoids[0].x = -300;
    focusMap.pages[0].functoids[0].y = -200;
    focusCanvas.renderWithPositions(new Map(), focusMap.pages[0]);
    await new Promise(resolve => setTimeout(resolve, 25));
    await selectConnection('ff');
    assertFunctoidVisible('near');
    assertFunctoidVisible('far');
    focusCanvas.setZoom(1);
    focusCanvas.scrollLeft = 0;
    focusCanvas.scrollTop = 0;
    await new Promise(resolve => setTimeout(resolve, 25));
    focusCanvas.querySelector('.functoid-node[data-id="near"] .functoid-body').dispatchEvent(
        new dom.window.MouseEvent('mousedown', { bubbles: true, clientX: 80, clientY: 80 })
    );
    focusCanvas.querySelector('.mapping-svg').dispatchEvent(
        new dom.window.MouseEvent('mousemove', { bubbles: true, clientX: 100, clientY: 110 })
    );
    focusCanvas.querySelector('.mapping-svg').dispatchEvent(
        new dom.window.MouseEvent('mouseup', { bubbles: true, clientX: 100, clientY: 110 })
    );
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(focusMap.pages[0].functoids[0].x, -280);
    assert.equal(focusMap.pages[0].functoids[0].y, -170);
    dom.window.HTMLElement.prototype.getBoundingClientRect = originalRect;

    const legacyPath = '/Root/<Sequence>/Value/<Choice>/Inner/<Group:Fields>/Leaf';
    const legacySchema = JSON.parse(JSON.stringify(schema));
    const valueNode = legacySchema.rootElement.children[0];
    valueNode.schemaPath = '/Root/<Sequence>/Value';
    const innerNode = valueNode.children[0];
    innerNode.schemaPath = '/Root/<Sequence>/Value/<Choice>/Inner';
    innerNode.children = [{
        name: 'Leaf', path: '/Root/Value/Inner/Leaf', schemaPath: legacyPath,
        children: [], attributes: []
    }];
    const legacyMap = {
        ...map,
        pages: [{ id: 'legacy', name: 'Legacy', functoids: [], links: [{
            id: 'legacy-link', sourceId: legacyPath, sourcePath: legacyPath,
            targetId: legacyPath, targetPath: legacyPath,
            sourceType: 'schemaNode', targetType: 'schemaNode'
        }] }]
    };
    const legacyBefore = JSON.stringify(legacyMap);
    dom.window.dispatchEvent(new dom.window.MessageEvent('message', {
        data: { type: 'schemaStateChanged', data: { map: legacyMap, sourceSchema: legacySchema, targetSchema: legacySchema } }
    }));
    await new Promise(resolve => setTimeout(resolve, 50));
    for (const pane of document.querySelectorAll('biztalk-schema-tree')) {
        assert.ok(pane.querySelector('[data-path="/Root/Value/Inner/Leaf"]'));
        assert.ok(pane.getNodePosition(legacyPath));
        assert.equal(pane.getNodePosition('/Root/<Group:Wrong>/Value/Inner/Leaf'), null);
        pane.querySelector('button[title="Collapse All"]').click();
        await new Promise(resolve => setTimeout(resolve, 25));
        assert.ok(pane.getNodePosition(legacyPath));
        pane.revealNode(legacyPath);
        assert.ok(pane.querySelector('[data-path="/Root/Value/Inner/Leaf"]'));
    }
    assert.equal(JSON.stringify(legacyMap), legacyBefore);

    assert.ok(messages.some(message => message.type === 'update'));
    assert.deepEqual(browserErrors, []);

    dom.window.close();
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
