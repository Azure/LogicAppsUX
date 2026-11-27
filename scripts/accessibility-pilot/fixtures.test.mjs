import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readJson = (path, base) => JSON.parse(readFileSync(new URL(path, base), 'utf8'));
const inventory = readJson('../../accessibility-pilot/journey-inventory.json', import.meta.url);
const fixtureDirectory = new URL('../../__mocks__/workflows/', import.meta.url);

// These are prerequisites in the checked-in workflow definitions. This check never renders Designer or credits a journey.
const checkFixture = (id, check) => {
  test(`fixture prerequisite: ${id}`, () => {
    const journey = inventory.find((entry) => entry.id === id);
    assert.ok(journey, `Missing journey: ${id}`);
    const { definition } = readJson(journey.fixtureFile, fixtureDirectory);
    assert.ok(definition, `${journey.fixtureFile} has no workflow definition`);
    check(definition);
  });
};

checkFixture('nested-graph', ({ actions }) => {
  const scope = actions.Switch;
  assert.equal(scope?.type, 'Switch', 'The nested branch must belong to a Switch node');
  const condition = scope.cases?.Conditional_Case?.actions?.Condition;
  assert.equal(condition?.type, 'If', 'Conditional Case must contain the Condition node');
  assert.equal(condition?.actions?.Terminate?.type, 'Terminate', 'The true branch must contain the Terminate node');
});

checkFixture('details-open-close', ({ triggers }) => {
  assert.equal(triggers.manual?.type, 'Request', 'The node used to open and dismiss details must be present');
});

checkFixture('action-discovery-insertion', ({ actions }) => {
  const condition = actions.Verify_property_changes;
  assert.equal(condition?.type, 'If', 'The existing action used in search must be present');
  assert.equal(condition?.else?.actions?.Terminate?.type, 'Terminate', 'The condition must still contain its named branch action');
});

checkFixture('token-editing', ({ actions }) => {
  const initializer = actions.Initialize_ArrayVariable;
  assert.equal(initializer?.type, 'InitializeVariable', 'The fixture must initialize a variable before editing its token');
  const variables = initializer.inputs?.variables;
  assert.ok(
    variables?.some(({ name, type }) => name === 'ArrayVariable' && type === 'array'),
    'ArrayVariable must be available to the picker'
  );
  const parseJson = actions.Parse_JSON;
  assert.equal(parseJson?.type, 'ParseJson', 'The editor being tested must belong to a Parse JSON operation');
  assert.ok(Object.hasOwn(parseJson.runAfter ?? {}, 'Initialize_ArrayVariable'), 'Parse JSON must follow the variable initializer');
  assert.ok(parseJson.inputs?.content?.startsWith('@'), 'The existing content expression must be present');
});

checkFixture('validation-recovery', ({ actions }) => {
  const http = actions.HTTP;
  assert.equal(http?.type, 'Http', 'The URI being tested must belong to an HTTP operation');
  const uri = new URL(http.inputs?.uri);
  assert.ok(
    uri.protocol === 'http:' || uri.protocol === 'https:',
    'The fixture needs an initial HTTP URI before introducing a validation error'
  );
});
