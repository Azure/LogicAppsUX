/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global __dirname, module, require */
const fs = require('node:fs');
const path = require('node:path');
const { SUITE_REGISTRY } = require('./e2e-cli-batch');

const httpMarkdownFileName = 'HTTP_TIMEOUT_LIFECYCLE_EVIDENCE.md';
const httpManifestFileName = 'HTTP_TIMEOUT_LIFECYCLE_EVIDENCE.json';
const httpCatalogGroups = Object.freeze([
  Object.freeze({
    id: 'workspace-setup',
    title: 'Workspace setup',
    description:
      'Creates the Standard Stateless workspace through the product wizard and records the transition into the reopened debug host.',
    steps: Object.freeze([
      step(
        'workspace-lifecycle-http-timeout-lifecycle-create-workspace-form-ready',
        'Create phase',
        'Open the Create Workspace form.',
        'The initial wizard is bound to the active Create Workspace webview with empty required fields and disabled progression.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-parent-folder-entered',
        'Create phase',
        'Enter the owned workspace parent folder.',
        'The wizard shows the selected parent folder and keeps progression gated until the remaining fields are valid.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-workspace-name-entered',
        'Create phase',
        'Enter the generated workspace name.',
        'The workspace name is visible in the wizard with no accepted progression inferred from unrelated fields.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-required-fields-entered',
        'Create phase',
        'Enter the Logic App and workflow names.',
        'All required naming fields are populated before the workflow type completes the form.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-type-selected',
        'Create phase',
        'Select the Standard Stateless workflow type.',
        'The requested application/workflow type is selected and the completed form can progress.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-fields-verified-top',
        'Create phase',
        'Verify the top of the completed workspace form.',
        'The top field region is visible, semantically bound, and the completed form can progress.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-fields-verified-middle',
        'Create phase',
        'Verify the middle of the completed workspace form.',
        'The middle field region is visible and remains correlated with the same completed form.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-fields-verified-bottom',
        'Create phase',
        'Verify the bottom of the completed workspace form.',
        'The lower field region is visible and the Next action remains enabled.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-review',
        'Create phase',
        'Advance to Review + create.',
        'The review page echoes the requested workspace, Logic App, workflow, and Stateless selections with Create enabled.'
      ),
    ]),
  }),
  Object.freeze({
    id: 'scenario-1',
    title: 'Scenario 1 — PT1S execution',
    description:
      'Authors Request + HTTP with a one-second timeout, saves the definition, invokes the local callback, and proves the correlated HTTP action fails with timeout evidence.',
    steps: Object.freeze([
      step(
        'http-timeout-request-pt1s-designer-ready',
        'Scenario 1 authoring',
        'Open the generated workflow in Designer.',
        'The active workflow Designer is ready before Request and HTTP authoring begins.'
      ),
      step(
        'http-timeout-request-pt1s-request-inserted',
        'Scenario 1 authoring',
        'Insert the Request trigger.',
        'The workflow canvas contains the expected Request trigger.'
      ),
      step(
        'http-timeout-request-pt1s-http-panel-ready',
        'Scenario 1 authoring',
        'Insert HTTP and open its parameter panel.',
        'The HTTP action and its active parameter panel are visible and bound to the workflow.'
      ),
      step(
        'http-timeout-request-pt1s-method-selected',
        'Scenario 1 authoring',
        'Select the HTTP method.',
        'The Method field contains the expected selection in the active HTTP panel.'
      ),
      step(
        'http-timeout-request-pt1s-uri-configured',
        'Scenario 1 authoring',
        'Configure the runner-owned delayed endpoint URI.',
        'The required URI field is populated without exposing the raw endpoint in report metadata.'
      ),
      step(
        'http-timeout-request-pt1s-timeout-configured',
        'Scenario 1 authoring',
        'Set the HTTP timeout to PT1S.',
        'The active HTTP settings show the one-second ISO-8601 timeout.'
      ),
      step(
        'http-timeout-request-pt1s-async-pattern-off',
        'Scenario 1 authoring',
        'Disable the asynchronous pattern.',
        'The asynchronous-pattern switch is visibly off for the HTTP action.'
      ),
      step(
        'http-timeout-request-pt1s-saved',
        'Scenario 1 authoring',
        'Save the PT1S workflow.',
        'The Designer save completes with the expected Request + HTTP state.'
      ),
      step(
        'http-timeout-request-pt1s-overview-empty',
        'Scenario 1 execution',
        'Open Overview before invoking the trigger.',
        'The exact workflow Overview is visible before the correlated run is created.'
      ),
      step(
        'http-timeout-request-pt1s-overview-run-triggered',
        'Scenario 1 execution',
        'Invoke the exact local callback.',
        'Overview shows the newly correlated run after the trigger request.'
      ),
      step(
        'http-timeout-request-pt1s-overview-run-failed',
        'Scenario 1 execution',
        'Wait for the correlated run to fail.',
        'The exact run is shown with Failed status.'
      ),
      step(
        'http-timeout-request-pt1s-http-action-failed',
        'Scenario 1 execution',
        'Open monitoring for the failed HTTP action.',
        'The HTTP action is selected and displays timeout-specific failure evidence.'
      ),
    ]),
  }),
  Object.freeze({
    id: 'scenario-2',
    title: 'Scenario 2 — PT24H and InvalidString validation',
    description:
      'Changes only the existing HTTP timeout to PT24H, proves runtime validation, then verifies invalid ISO-8601 input cannot overwrite the persisted valid definition.',
    steps: Object.freeze([
      step(
        'http-timeout-request-pt24h-designer-reopened',
        'Scenario 2 PT24H',
        'Reopen the same workflow Designer.',
        'The existing Request + HTTP workflow is reopened before changing its timeout.'
      ),
      step(
        'http-timeout-request-pt24h-timeout-configured',
        'Scenario 2 PT24H',
        'Change the HTTP timeout to PT24H.',
        'The active HTTP settings show the 24-hour timeout.'
      ),
      step(
        'http-timeout-request-pt24h-async-pattern-off',
        'Scenario 2 PT24H',
        'Keep the asynchronous pattern disabled.',
        'The asynchronous-pattern switch remains visibly off after the timeout change.'
      ),
      step(
        'http-timeout-request-pt24h-saved',
        'Scenario 2 PT24H',
        'Save the PT24H workflow.',
        'The Designer save completes with PT24H persisted.'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-debug-starting',
        'Scenario 2 PT24H',
        'Start debugging for PT24H runtime validation while prompt handling runs in parallel.',
        'The retained lifecycle diagnostic records the transient workbench state for the latest debug start.',
        'diagnostic'
      ),
      step(
        'workspace-lifecycle-http-timeout-lifecycle-debug-prompts-handled',
        'Scenario 2 PT24H',
        'Complete the known prompts for the PT24H debug start.',
        'The retained lifecycle diagnostic records the workbench after the latest required prompt handling.',
        'diagnostic'
      ),
      step(
        'http-timeout-request-pt24h-runtime-validation',
        'Scenario 2 PT24H',
        'Observe Functions runtime validation.',
        'The required PT24H validation text is visible in the trusted runtime output surface.'
      ),
      step(
        'http-timeout-request-invalid-designer-reopened',
        'Scenario 2 InvalidString',
        'Reopen the same workflow for invalid-value validation.',
        'The persisted PT24H workflow is visible before invalid input is entered.'
      ),
      step(
        'http-timeout-request-invalid-value-entered',
        'Scenario 2 InvalidString',
        'Enter InvalidString as the timeout.',
        'The invalid value is present in the active HTTP settings.'
      ),
      step(
        'http-timeout-request-invalid-duration',
        'Scenario 2 InvalidString',
        'Reveal the ISO-8601 validation failure.',
        'The invalid-duration message is visible and Save remains unavailable.'
      ),
      step(
        'http-timeout-request-valid-state-restored',
        'Scenario 2 InvalidString',
        'Restore the valid PT24H editor state.',
        'The Designer returns to the valid PT24H state without persisting InvalidString.'
      ),
      step(
        'http-timeout-request-scenario-2-complete-before-reset',
        'Scenario 2 completion',
        'Prove Scenario 2 completed before destructive reset.',
        'The valid Request + HTTP PT24H workflow remains visible immediately before Scenario 3 removes it.'
      ),
    ]),
  }),
  Object.freeze({
    id: 'scenario-3',
    title: 'Scenario 3 — Compose native-editor validation',
    description:
      'Clears Request + HTTP, authors Request + Compose, edits only Compose runtimeConfiguration in the native editor, and proves Designer reports the unsupported timeout.',
    steps: Object.freeze([
      step(
        'http-timeout-transition-cleared',
        'Scenario 3 transition',
        'Delete HTTP and Request through Designer.',
        'The same workflow canvas is visibly clear before Compose authoring.'
      ),
      step(
        'http-timeout-compose-authored',
        'Scenario 3 authoring',
        'Author and save Request + Compose with input test.',
        'The workflow contains the newly authored Compose action in the expected saved state.'
      ),
      step(
        'http-timeout-compose-native-editor-open',
        'Scenario 3 native editor',
        'Open the exact workflow.json in the native editor.',
        'The active native text editor is bound to the generated workflow file before replacement.'
      ),
      step(
        'http-timeout-compose-native-editor-replaced',
        'Scenario 3 native editor',
        'Insert only Compose runtimeConfiguration.requestOptions.timeout.',
        'The native editor shows the targeted PT24H Compose timeout replacement before save/close.'
      ),
      step(
        'http-timeout-compose-unsupported-error',
        'Scenario 3 validation',
        'Reopen Designer after the native edit.',
        'The newly reopened workflow Designer displays the exact unsupported-timeout error.'
      ),
    ]),
  }),
]);

function step(checkpoint, phase, action, expectedProof, expectedClassification = 'evidence') {
  return Object.freeze({ checkpoint, phase, action, expectedProof, expectedClassification });
}

const createWorkspaceReviewCases = Object.freeze(['review-standard', 'review-custom-code', 'review-rules-engine']);
const createWorkspaceWorkflowTypeCases = Object.freeze([
  'workflow-type-stateless',
  'workflow-type-autonomous-agent',
  'workflow-type-conversational-agent',
]);
const createWorkspaceValidationCheckpoints = Object.freeze([
  ['create-workspace-validation-workspace-parent-folder-path-rejects-non-existent-paths-invalid', 'Reject a nonexistent parent folder.'],
  ['create-workspace-validation-workspace-parent-folder-path-is-required-empty', 'Reject an empty parent folder.'],
  ['create-workspace-validation-workspace-name-starts-with-number-invalid', 'Reject a workspace name that starts with a number.'],
  ['create-workspace-validation-workspace-name-ends-with-hyphen-invalid', 'Reject a workspace name that ends with a hyphen.'],
  ['create-workspace-validation-workspace-name-ends-with-underscore-invalid', 'Reject a workspace name that ends with an underscore.'],
  ['create-workspace-validation-workspace-name-is-empty-empty', 'Reject an empty workspace name.'],
  ['create-workspace-validation-logic-app-name-starts-with-number-invalid', 'Reject a Logic App name that starts with a number.'],
  ['create-workspace-validation-logic-app-name-is-empty-empty', 'Reject an empty Logic App name.'],
  ['create-workspace-validation-logic-app-name-ends-with-hyphen-invalid', 'Reject a Logic App name that ends with a hyphen.'],
  ['create-workspace-validation-workflow-name-starts-with-number-invalid', 'Reject a workflow name that starts with a number.'],
  ['create-workspace-validation-workflow-name-is-empty-empty', 'Reject an empty workflow name.'],
  ['create-workspace-validation-workflow-name-ends-with-hyphen-invalid', 'Reject a workflow name that ends with a hyphen.'],
  ['create-workspace-standard-fields-valid', 'Complete a valid Standard form.'],
  [
    'create-workspace-validation-custom-code-folder-name-starts-with-number-invalid',
    'Reject a custom-code folder that starts with a number.',
  ],
  ['create-workspace-validation-custom-code-folder-name-is-empty-empty', 'Reject an empty custom-code folder.'],
  ['create-workspace-validation-custom-code-folder-name-ends-with-hyphen-invalid', 'Reject a custom-code folder that ends with a hyphen.'],
  [
    'create-workspace-validation-custom-code-function-namespace-starts-with-number-invalid',
    'Reject a custom-code namespace that starts with a number.',
  ],
  ['create-workspace-validation-custom-code-function-namespace-is-empty-empty', 'Reject an empty custom-code namespace.'],
  [
    'create-workspace-validation-custom-code-function-name-starts-with-number-invalid',
    'Reject a custom-code function name that starts with a number.',
  ],
  ['create-workspace-validation-custom-code-function-name-is-empty-empty', 'Reject an empty custom-code function name.'],
  ['create-workspace-custom-code-fields-valid', 'Complete a valid custom-code form.'],
  [
    'create-workspace-validation-rules-engine-folder-name-starts-with-number-invalid',
    'Reject a rules-engine folder that starts with a number.',
  ],
  ['create-workspace-validation-rules-engine-folder-name-is-empty-empty', 'Reject an empty rules-engine folder.'],
  [
    'create-workspace-validation-rules-engine-folder-name-ends-with-hyphen-invalid',
    'Reject a rules-engine folder that ends with a hyphen.',
  ],
  [
    'create-workspace-validation-rules-engine-function-namespace-contains-hyphen-invalid',
    'Reject a rules-engine namespace containing a hyphen.',
  ],
  ['create-workspace-validation-rules-engine-function-namespace-is-empty-empty', 'Reject an empty rules-engine namespace.'],
  [
    'create-workspace-validation-rules-engine-function-name-starts-with-number-invalid',
    'Reject a rules-engine function name that starts with a number.',
  ],
  ['create-workspace-validation-rules-engine-function-name-is-empty-empty', 'Reject an empty rules-engine function name.'],
  ['create-workspace-rules-engine-fields-valid', 'Complete a valid rules-engine form.'],
]);
const regenerationCases = Object.freeze([
  'vscode-single',
  'vscode-multiple',
  'vscode-repeat',
  'root-single',
  'root-multiple',
  'root-repeat',
]);

function group(id, title, description, steps) {
  return Object.freeze({ id, title, description, steps: Object.freeze(steps) });
}

function simpleStep(checkpoint, phase, action, expectedProof, expectedClassification) {
  return step(checkpoint, phase, action, expectedProof, expectedClassification);
}

function createWorkspaceCompletedFieldSteps(caseLabel, stage = 'fields-verified') {
  return [
    ...['top', 'middle', 'bottom'].map((position) =>
      simpleStep(
        `create-workspace-${caseLabel}-${stage}-${position}`,
        caseLabel,
        `Inspect the ${position} of the completed form.`,
        'The expected field region remains populated and Next is enabled.'
      )
    ),
    ...(createWorkspaceCaseHasFunctionFields(caseLabel)
      ? [
          simpleStep(
            `create-workspace-${caseLabel}-${stage}-function-name`,
            caseLabel,
            'Inspect the completed function-name region.',
            'The expected function name remains populated and Next is enabled.'
          ),
        ]
      : []),
  ];
}

function createWorkspaceCaseHasFunctionFields(caseLabel) {
  return caseLabel.includes('custom-code') || caseLabel.includes('rules-engine');
}

function createWorkspaceBehaviorCatalog(includeValidation) {
  const groups = [];
  if (includeValidation) {
    groups.push(
      group(
        'initial-validation',
        'Initial form and validation',
        'Proves the Create Workspace form starts gated and the supported application shapes can reach a valid state.',
        [
          simpleStep(
            'create-workspace-initial-form-top',
            'Initial form',
            'Inspect the top of the empty form.',
            'Required top fields are empty and Next is disabled.'
          ),
          simpleStep(
            'create-workspace-initial-form-middle',
            'Initial form',
            'Inspect the middle of the empty form.',
            'The Logic App field is empty and Next remains disabled.'
          ),
          simpleStep(
            'create-workspace-initial-form-bottom',
            'Initial form',
            'Inspect the bottom of the empty form.',
            'The workflow field is empty, the form is scrolled to the bottom, and Next remains disabled.'
          ),
          ...createWorkspaceValidationCheckpoints.map(([checkpoint, action]) =>
            simpleStep(
              checkpoint,
              'Validation',
              action,
              checkpoint.endsWith('-fields-valid')
                ? 'The complete application-specific form is accepted and Next is enabled.'
                : 'The expected field-level validation is visible and Next remains disabled.'
            )
          ),
        ]
      )
    );
  }
  groups.push(
    group(
      'review-back',
      'Review and back navigation',
      'Uses the finite production review/back cases and preserves their declared order.',
      createWorkspaceReviewCases.flatMap((caseLabel) => [
        ...createWorkspaceCompletedFieldSteps(caseLabel),
        simpleStep(
          `create-workspace-${caseLabel}-review-before-back`,
          caseLabel,
          'Advance to Review + create.',
          'The review page reflects the selected case before returning to the form.'
        ),
        ...createWorkspaceCompletedFieldSteps(caseLabel, 'review-back'),
      ])
    ),
    group(
      'workflow-types',
      'Workflow type review',
      'Exercises the finite production workflow-type review cases in their source order.',
      createWorkspaceWorkflowTypeCases.flatMap((caseLabel) => [
        ...createWorkspaceCompletedFieldSteps(caseLabel),
        simpleStep(
          `create-workspace-${caseLabel}-review`,
          caseLabel,
          'Advance the selected workflow type to Review + create.',
          'The review page shows the requested workflow type with Create enabled.'
        ),
      ])
    ),
    group('cleanup', 'Application type cleanup', 'Proves switching application types removes stale case-specific fields.', [
      ...createWorkspaceCompletedFieldSteps('cleanup-custom-code'),
      simpleStep(
        'create-workspace-app-type-cleanup',
        'Cleanup',
        'Switch back to Standard after custom-code and rules-engine selections.',
        'Only the Standard fields remain active and Next is enabled.'
      ),
    ])
  );
  return groups;
}

function loadCreateWorkspaceCaseLabels(suiteId, factoryName) {
  const registeredLabels = SUITE_REGISTRY[suiteId].expectedPhases.map((phaseId) => phaseId.slice(`${suiteId}:`.length));
  const compiledCasesPath = path.resolve(__dirname, '..', 'out', 'test', 'e2e', 'createWorkspaceCases.js');
  if (!fs.existsSync(compiledCasesPath)) {
    return registeredLabels;
  }
  const factory = require(compiledCasesPath)[factoryName];
  if (typeof factory !== 'function') {
    throw new Error(`Compiled Create Workspace case factory is missing: ${factoryName}`);
  }
  const caseLabels = factory().map((creationCase) => creationCase?.label);
  if (caseLabels.length !== registeredLabels.length || caseLabels.some((caseLabel, index) => caseLabel !== registeredLabels[index])) {
    throw new Error(`${suiteId} descriptor order differs from ${factoryName}`);
  }
  return caseLabels;
}

function matrixCatalog(suiteId, title, factoryName) {
  const cases = loadCreateWorkspaceCaseLabels(suiteId, factoryName);
  const caseSteps = (caseLabels) =>
    caseLabels.flatMap((caseLabel) => [
      ...createWorkspaceCompletedFieldSteps(caseLabel),
      simpleStep(
        `create-workspace-${caseLabel}-review`,
        caseLabel,
        'Complete the variant and advance to Review + create.',
        'The review page reflects the declared variant and Create is enabled.'
      ),
      simpleStep(
        `create-workspace-${caseLabel}-created`,
        caseLabel,
        'Verify the generated workspace artifacts after creation.',
        'A retained diagnostic records the workbench after durable artifact verification.',
        'diagnostic'
      ),
    ]);
  const description =
    'Uses the finite ordered variant contract registered for the suite; runtime-generated workspace names are not used as identities.';
  if (suiteId !== 'createWorkspaceCoreMatrix') {
    return [group('workspace-variants', title, description, caseSteps(cases))];
  }
  if (cases[0] !== 'standard-stateful') {
    throw new Error('createWorkspaceCoreMatrix ordered evidence requires Standard Stateful first');
  }
  return [
    group('workspace-variants', title, description, caseSteps(cases.slice(0, 1))),
    group(
      'workspace-cancel',
      'Workspace prompt Cancel',
      'Preserves the required supplementary prompt sequence after the core matrix has created the original Standard Stateful workspace.',
      [
        simpleStep(
          'workspace-prompt-cancel-ui-open-folder',
          'Supplementary Cancel',
          'Open the exact existing Logic App folder.',
          'The native folder picker retains the existing application path before submission.'
        ),
        simpleStep(
          'workspace-prompt-cancel-ui-preceding-no',
          'Supplementary Cancel',
          'Choose No on the preceding existing-app prompt.',
          'The real enabled No option is visible before continuing to the target prompt.'
        ),
        simpleStep(
          'workspace-prompt-cancel-ui-before',
          'Supplementary Cancel',
          'Observe the target workspace prompt before Cancel.',
          'The prompt remains visible over the unchanged original application.'
        ),
        simpleStep(
          'workspace-prompt-cancel-ui-after',
          'Supplementary Cancel',
          'Cancel the target workspace prompt.',
          'The prompt is dismissed while the original application files and view remain unchanged.'
        ),
      ]
    ),
    group('workspace-variants-remaining', 'Remaining core variants', description, caseSteps(cases.slice(1))),
  ];
}

function workspaceLifecycleCreationSteps(label) {
  return [
    simpleStep(
      `workspace-lifecycle-${label}-create-workspace-form-ready`,
      'Create phase',
      'Open the Create Workspace form.',
      'The active wizard is ready with required progression gated.'
    ),
    simpleStep(
      `workspace-lifecycle-${label}-parent-folder-entered`,
      'Create phase',
      'Enter the owned parent folder.',
      'The selected parent folder is visible in the active wizard.'
    ),
    simpleStep(
      `workspace-lifecycle-${label}-workspace-name-entered`,
      'Create phase',
      'Enter the workspace name.',
      'The workspace name is visible and remains bound to the same form.'
    ),
    simpleStep(
      `workspace-lifecycle-${label}-required-fields-entered`,
      'Create phase',
      'Enter Logic App and workflow names.',
      'The required names are visible before workflow type completion.'
    ),
    simpleStep(
      `workspace-lifecycle-${label}-type-selected`,
      'Create phase',
      'Select the workflow type.',
      'The requested application and workflow type are selected.'
    ),
    ...['top', 'middle', 'bottom'].map((position) =>
      simpleStep(
        `workspace-lifecycle-${label}-fields-verified-${position}`,
        'Create phase',
        `Verify the ${position} of the completed form.`,
        'The visible field region remains correlated with the completed form and Next is enabled.'
      )
    ),
    simpleStep(
      `workspace-lifecycle-${label}-review`,
      'Create phase',
      'Advance to Review + create.',
      'The review page reflects the requested workspace contract with Create enabled.'
    ),
  ];
}

function msnWeatherCatalog() {
  const label = 'standard';
  return [
    group(
      'workspace-setup',
      'Workspace setup',
      'Creates the Standard Stateful workspace through the production wizard.',
      workspaceLifecycleCreationSteps(label)
    ),
    group(
      'designer-authoring',
      'Designer authoring',
      'Authors Request, MSN Weather, and Response through the active Designer and proves the required Azure connection state.',
      [
        simpleStep(
          `workspace-lifecycle-${label}-warmup-designer-ready`,
          'Warmup',
          'Open the warmup Designer.',
          'The warmup canvas is ready.'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-authoring-designer-ready`,
          'Authoring',
          'Open the authoring Designer.',
          'The active authoring canvas is ready.'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-trigger-panel-open`,
          'Authoring',
          'Open trigger discovery.',
          'The active discovery panel is visible.'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-request-search-entered`,
          'Authoring',
          'Search for Request.',
          'The Request search is visible in discovery.'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-request-trigger-added`,
          'Authoring',
          'Insert Request.',
          'The Request trigger is visible on the canvas.'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-msn-weather-search-entered`,
          'Authoring',
          'Search for current weather.',
          'The weather search is visible in discovery.'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-msn-weather-action-added`,
          'Authoring',
          'Insert Get current weather.',
          'The MSN Weather action is visible on the canvas.'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-msn-weather-action-configured`,
          'Authoring',
          'Configure the weather location.',
          'The required location is visible in the active action panel.'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-get-current-weather-connected`,
          'Authoring',
          'Wait for the action connection.',
          'The active MSN Weather action visibly reports Connected.'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-action-panel-open`,
          'Authoring',
          'Open action discovery for Response.',
          'The active action discovery panel is visible.'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-response-search-entered`,
          'Authoring',
          'Search for Response.',
          'The Response search is visible in discovery.'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-response-action-added`,
          'Authoring',
          'Insert Response.',
          'The Response action is visible on the canvas.'
        ),
        simpleStep(
          'workspace-lifecycle-standard-response-body-focused',
          'Response configuration',
          'Focus the Response body editor.',
          'The active Response body editor has focus.'
        ),
        simpleStep(
          'workspace-lifecycle-standard-response-body-picker-open',
          'Response configuration',
          'Open dynamic content.',
          'The expected weather action section and Body token are visible.'
        ),
        simpleStep(
          'workspace-lifecycle-standard-response-body-token-selected',
          'Response configuration',
          'Select the weather Body token.',
          'The token is inserted from the expected source action.'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-response-body-configured`,
          'Response configuration',
          'Verify the configured Response body.',
          'The active Response panel contains the selected weather token.'
        ),
      ]
    ),
    group(
      'runtime',
      'Debug and run verification',
      'Starts the generated runtime, invokes the workflow from Overview, and opens action-level monitoring evidence.',
      [
        simpleStep(
          `workspace-lifecycle-${label}-debug-starting`,
          'Debug',
          'Start debugging while prompt handling proceeds.',
          'A retained transition diagnostic records the debug start.',
          'diagnostic'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-debug-prompts-handled`,
          'Debug',
          'Complete known debug prompts.',
          'A retained transition diagnostic records the post-prompt workbench.',
          'diagnostic'
        ),
        simpleStep(`workspace-lifecycle-${label}-overview-open`, 'Run', 'Open Overview.', 'The exact workflow Overview is ready.'),
        simpleStep(
          `workspace-lifecycle-${label}-overview-run-clicked`,
          'Run',
          'Click Run trigger.',
          'Overview shows the newly initiated run.'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-overview-run-succeeded`,
          'Run',
          'Wait for the exact run to succeed.',
          'The correlated run is shown as Succeeded.'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-overview-run-details-opened`,
          'Monitoring',
          'Open run details.',
          'The monitoring canvas shows MSN Weather and Response.'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-msn-weather-result-opened-loading`,
          'Monitoring',
          'Open the weather action while its result loads.',
          'A retained transition diagnostic records the selected weather action before result details settle.',
          'diagnostic'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-msn-weather-result-opened`,
          'Monitoring',
          'Open the weather action result.',
          'The weather action shows Succeeded.'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-response-result-opened-loading`,
          'Monitoring',
          'Open the Response action while its result loads.',
          'A retained transition diagnostic records the selected Response action before result details settle.',
          'diagnostic'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-response-result-opened`,
          'Monitoring',
          'Open the Response result.',
          'The Response action shows Succeeded.'
        ),
        simpleStep(
          `workspace-lifecycle-${label}-msn-weather-response-verified`,
          'Monitoring',
          'Verify the response payload evidence.',
          'The selected Response action shows the expected allowlisted weather response markers.'
        ),
      ]
    ),
  ];
}

function statelessVariablesCatalog() {
  const label = 'stateless-variables';
  return [
    group(
      'workspace-setup',
      'Workspace setup',
      'Creates the Standard Stateless workspace through the production wizard.',
      workspaceLifecycleCreationSteps(label)
    ),
    group(
      'designer-authoring',
      'Designer authoring',
      'Authors the two-variable workflow and binds both variable tokens in declared order.',
      [
        simpleStep(
          `workspace-lifecycle-${label}-warmup-designer-ready`,
          'Prepare phase',
          'Open the warmup Designer.',
          'The generated design-time workspace is ready.'
        ),
        simpleStep(
          'stateless-variables-initialize-two-variables',
          'Run phase',
          'Configure the two Initialize variables rows.',
          'The canvas shows the initialized variable action.'
        ),
        ...['v1', 'v2'].flatMap((variable) => [
          simpleStep(
            `workspace-lifecycle-response-variable-${variable}-focused`,
            'Run phase',
            `Focus Response body for ${variable}.`,
            'The active Response editor is focused.'
          ),
          simpleStep(
            `workspace-lifecycle-response-variable-${variable}-picker-open`,
            'Run phase',
            `Open dynamic content for ${variable}.`,
            'The Variables section exposes the ordered variable tokens.'
          ),
          simpleStep(
            `workspace-lifecycle-response-variable-${variable}-token-selected`,
            'Run phase',
            `Select ${variable}.`,
            'The requested variable token is inserted into Response.'
          ),
        ]),
      ]
    ),
    group(
      'history',
      'Enabled Stateless history',
      'Uses stable occurrence identities emitted by the capture source; runtime run names are neither sorted nor exposed.',
      [1, 2].map((occurrence) =>
        simpleStep(
          `stateless-variables-history-occurrence-${occurrence}`,
          `History occurrence ${occurrence}`,
          `Invoke the workflow and open ordered history occurrence ${occurrence}.`,
          'The exact callback-correlated run is shown as Succeeded.'
        )
      )
    ),
  ];
}

function runAfterPersistenceCatalog() {
  const label = 'run-after-persistence';
  return [
    group(
      'workspace-setup',
      'Workspace setup',
      'Creates the Standard Stateful workspace exclusively through the production wizard.',
      workspaceLifecycleCreationSteps(label)
    ),
    group(
      'author-save',
      'Author and save',
      'Authors Request, Compose, and Compose 2 by stable node identity, then persists Failed-only Run After.',
      [
        simpleStep(
          'run-after-persistence-author-canvas',
          'Author phase',
          'Show the exact authored node identities.',
          'The Designer canvas contains the captured Request and two Compose node IDs.'
        ),
        simpleStep(
          'run-after-persistence-author-failed-only',
          'Author phase',
          'Configure Compose 2 Run After.',
          'The exact downstream panel shows only Failed checked for the exact Compose predecessor.'
        ),
        simpleStep(
          'run-after-persistence-author-saved',
          'Author phase',
          'Save the strict semantic workflow.',
          'The Failed-only UI remains visible after workflow.json passes the semantic oracle and its hash is recorded.'
        ),
      ]
    ),
    group(
      'fresh-reopen',
      'Fresh stable-host reopen',
      'Reopens the exact .code-workspace in a distinct official latest-stable host and verifies UI plus unchanged disk state.',
      [
        simpleStep(
          'run-after-persistence-reopen-canvas',
          'Reopen phase',
          'Open the persisted workflow in a fresh Designer V2 host.',
          'The canvas contains the same exact Request and Compose node IDs.'
        ),
        simpleStep(
          'run-after-persistence-reopen-failed-only',
          'Reopen phase',
          'Inspect persisted Run After without saving.',
          'The exact downstream panel still shows Failed only for the exact predecessor before the unchanged hash is asserted.'
        ),
      ]
    ),
  ];
}

function regenerationCatalog() {
  return [
    group('baseline', 'Baseline', 'Captures the untouched wizard-generated workspace before any regeneration case.', [
      simpleStep(
        'workspace-regeneration-baseline',
        'Baseline',
        'Observe the generated workspace before deletion.',
        'The baseline workbench and generated files are ready.'
      ),
    ]),
    group(
      'variants',
      'Regeneration variants',
      'Uses the six ordered production regeneration cases, with four distinct prompt/result checkpoints per case.',
      regenerationCases.flatMap((caseLabel) =>
        [
          ['before-yes', 'Observe initialization prompt.', 'The real initialization prompt offers an enabled Yes.'],
          ['before-overwrite-yes', 'Observe overwrite confirmation.', 'The distinct overwrite confirmation offers an enabled Yes.'],
          ['after-yes', 'Observe regenerated files after confirmation.', 'The required targets are restored without changing non-targets.'],
          ['reopened', 'Reopen the regenerated workspace.', 'A fresh workbench verifies the regenerated contract.'],
        ].map(([suffix, action, expectedProof]) =>
          simpleStep(`workspace-regeneration-${caseLabel}-${suffix}`, caseLabel, action, expectedProof)
        )
      )
    ),
  ];
}

function multiRootCatalog() {
  return [
    group(
      'multi-root',
      'Multi-root lifecycle',
      'Builds debug checkpoints from the ordered roots recorded by the staged final result; absolute root paths are never emitted.',
      [
        simpleStep(
          'workspace-multi-root-created',
          'Reopen phase',
          'Create and display every Logic App root.',
          'Explorer shows the complete generated root population.'
        ),
        simpleStep(
          'workspace-multi-root-reloaded',
          'Reopen phase',
          'Reload the same workbench document.',
          'The fresh extension host retains the complete ordered root population.'
        ),
        simpleStep(
          'workspace-multi-root-mapper',
          'Mapper',
          'Open Data Mapper from the Azure view.',
          'The mapper webview is loaded for the selected Logic App root.'
        ),
      ]
    ),
  ];
}

const suiteDescriptors = Object.freeze({
  unitTests: Object.freeze({
    id: 'unitTests',
    title: 'VS Code CLI Unit Tests',
    mode: 'catalog',
    buildCatalog: () => [
      group('startup', 'Workbench startup', 'Proves the unit-test extension host reached a usable empty-window state.', [
        simpleStep(
          'empty-window-startup',
          'Startup',
          'Open the isolated extension-host workbench.',
          'The workbench shell is visible before the unit test contract executes.'
        ),
      ]),
    ],
  }),
  createWorkspaceBehavior: Object.freeze({
    id: 'createWorkspaceBehavior',
    title: 'Create Workspace Behavior',
    mode: 'catalog',
    buildCatalog: () => createWorkspaceBehaviorCatalog(true),
  }),
  createWorkspaceCoreMatrix: Object.freeze({
    id: 'createWorkspaceCoreMatrix',
    title: 'Create Workspace Core Matrix',
    mode: 'catalog',
    buildCatalog: () => matrixCatalog('createWorkspaceCoreMatrix', 'Core variants', 'getCoreCreationCases'),
    evidenceDirectories: Object.freeze(['screenshots', 'workspace-cancel/screenshots']),
  }),
  createWorkspacePreviewMatrix: Object.freeze({
    id: 'createWorkspacePreviewMatrix',
    title: 'Create Workspace Preview Matrix',
    mode: 'catalog',
    buildCatalog: () => matrixCatalog('createWorkspacePreviewMatrix', 'Preview variants', 'getPreviewCreationCases'),
  }),
  createWorkspaceCodeful: Object.freeze({
    id: 'createWorkspaceCodeful',
    title: 'Create Workspace Codeful',
    mode: 'catalog',
    buildCatalog: () => matrixCatalog('createWorkspaceCodeful', 'Codeful variants', 'getCodefulCreationCases'),
  }),
  createWorkspaceBehaviorSmoke: Object.freeze({
    id: 'createWorkspaceBehaviorSmoke',
    title: 'Create Workspace Behavior Smoke',
    mode: 'catalog',
    buildCatalog: () => createWorkspaceBehaviorCatalog(false),
  }),
  msnWeatherLifecycle: Object.freeze({
    id: 'msnWeatherLifecycle',
    title: 'MSN Weather Lifecycle',
    mode: 'catalog',
    buildCatalog: msnWeatherCatalog,
  }),
  httpTimeoutLifecycle: Object.freeze({
    id: 'httpTimeoutLifecycle',
    title: 'HTTP Timeout Lifecycle',
    mode: 'catalog',
    buildCatalog: () => httpCatalogGroups,
    compatibilityAliases: Object.freeze([httpMarkdownFileName, httpManifestFileName]),
  }),
  statelessVariablesLifecycle: Object.freeze({
    id: 'statelessVariablesLifecycle',
    title: 'Stateless Variables Lifecycle',
    mode: 'catalog',
    buildCatalog: statelessVariablesCatalog,
  }),
  runAfterPersistenceLifecycle: Object.freeze({
    id: 'runAfterPersistenceLifecycle',
    title: 'Run After Persistence Lifecycle',
    mode: 'catalog',
    buildCatalog: runAfterPersistenceCatalog,
  }),
  workspaceArtifactRegeneration: Object.freeze({
    id: 'workspaceArtifactRegeneration',
    title: 'Workspace Artifact Regeneration',
    mode: 'catalog',
    buildCatalog: regenerationCatalog,
    evidenceDirectories: Object.freeze(['screenshots', 'log/regeneration/screenshots']),
  }),
  workspaceMultiRoot: Object.freeze({
    id: 'workspaceMultiRoot',
    title: 'Workspace Multi-root',
    mode: 'dynamic-catalog',
    buildCatalog: multiRootCatalog,
    evidenceDirectories: Object.freeze(['screenshots', 'workspace-multi-root/screenshots']),
  }),
});

function getSuiteDescriptor(suiteId) {
  if (!Object.hasOwn(suiteDescriptors, suiteId)) {
    throw new Error(`Unknown suite-id "${suiteId}". Known suites: ${Object.keys(suiteDescriptors).join(', ')}`);
  }
  return suiteDescriptors[suiteId];
}
module.exports = {
  getSuiteDescriptor,
  httpCatalogGroups,
  suiteDescriptors,
};
