const exclusions = new Map([
  ['Basics-principles-of-Maps\\ComoFuncinamOsMapas\\Mapas\\Map1.btm', 'Source schema is not loaded'],
  [
    'Built-in-Functoids-Scripting-Functoid-and-Custom-Functoids\\BuiltInVSScriptingVSCustomFunctoids\\MappingMultipleDates\\MappingMultipleDatesUsingCustomFunctoid.btm',
    'Unregistered custom functoid 10302',
  ],
  [
    'Canonical-Data-Model-Pattern\\CanonicalDataModelPattern\\01-Solution\\ServiceSchemasToCanonical\\AddUserPlatformBToCanonicalMap.btm',
    'Unregistered custom functoid 10000',
  ],
  [
    'Canonical-Data-Model-Pattern\\CanonicalDataModelPattern\\01-Solution\\ServiceSchemasToCanonical\\AddUserToCanonicalMap.btm',
    'Unregistered custom functoid 10000',
  ],
  [
    'Canonical-Data-Model-Pattern\\CanonicalDataModelPattern\\01-Solution\\ServiceSchemasToCanonical\\ChangeUserInfoToCanonicalMap.btm',
    'Unregistered custom functoid 10000',
  ],
  [
    'Canonical-Data-Model-Pattern\\CanonicalDataModelPattern\\01-Solution\\ServiceSchemasToCanonical\\ChangeUserPasswordToCanonicalMap.btm',
    'Unregistered custom functoid 10000',
  ],
  [
    'Canonical-Data-Model-Pattern\\CanonicalDataModelPattern\\01-Solution\\ServiceSchemasToCanonical\\RemoveUserToCanonicalMap.btm',
    'Unregistered custom functoid 10000',
  ],
  ['Canonical-Data-Model-Pattern\\CanonicalDataModelPattern\\02-Solution\\OrderToSimpleOrderMap.btm', 'Unregistered custom functoid 10000'],
  ['Conditional-Pattern\\WorkingWithConditions\\01-CheckDataExistence\\CheckDataExistenceMap.btm', 'Unregistered custom functoid 10100'],
  ['Conditional-Pattern\\WorkingWithConditions\\02-IfThen\\CommonConditionsMap.btm', 'Unregistered custom functoid 10000'],
  ['Conditional-Pattern\\WorkingWithConditions\\02-IfThen\\CommonConditionsMapImproved.btm', 'Unregistered custom functoid 10000'],
  ['Conditional-Pattern\\WorkingWithConditions\\03-IfThenElse\\IfThenElseMapSol2.btm', 'Unregistered custom functoid 10100'],
  ['How-to-create-a-custom-If-Then-Else-Functoid\\IfThenElseOperations\\IfThenElseInAnEasyWay.btm', 'Unregistered custom functoid 10900'],
  ['How-to-use-Database-Lookup-Functoid\\DatabaseLookup\\MapConstantValues.btm', 'Unregistered custom functoid 10203'],
  ['Splitter-Pattern\\MappingWorkingWithMultipleOutputMessages\\TransformManyToManyOrders.btm', 'Unregistered custom functoid 10000'],
  [
    'Splitter-Pattern\\MappingWorkingWithMultipleOutputMessages\\TransformManyToManyOrdersFunctoids.btm',
    'Unregistered custom functoid 10000',
  ],
  [
    'Splitter-Pattern\\MappingWorkingWithMultipleOutputMessages\\TransformManyToManyOrdersGVariable.btm',
    'Unregistered custom functoid 10000',
  ],
  ['Splitter-Pattern\\MappingWorkingWithMultipleOutputMessages\\TransformOneToManyOrders.btm', 'Unregistered custom functoid 10000'],
  ['Working-with-Constant-Values\\WorkingWithConstantValues\\MapConstantValues.btm', 'Unregistered custom functoids 10000 and 10200-10205'],
]);

exports.getLearningPathExclusion = (relativePath) => exclusions.get(relativePath.replace(/\//g, '\\'));

// Keep the original Windows corpus IDs on every host.
exports.compareLearningPathPaths = (left, right) => {
  const first = left.replace(/\//g, '\\');
  const second = right.replace(/\//g, '\\');
  return first < second ? -1 : first > second ? 1 : 0;
};
