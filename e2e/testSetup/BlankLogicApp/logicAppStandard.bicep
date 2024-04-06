param webAppName string = uniqueString(resourceGroup().id) // Generate unique String for web app name
param location string = resourceGroup().location // Location for all resources
var appServicePlanName = toLower('AppServicePlan-${webAppName}')
var webSiteName = toLower('wapp-${webAppName}')
var storageAccountName = toLower('storage${webAppName}')
param sku string = 'WorkflowStandard'
param skuCode string = 'WS1'
param workerSize string = '3'
param workerSizeId string = '3'
param numberOfWorkers string = '1'
param netFrameworkVersion string = 'v6.0'
param ftpsState string = 'FtpsOnly'

resource appServicePlan 'Microsoft.Web/serverfarms@2020-06-01' = {
  name: appServicePlanName
  location: location
  properties: {
    name: appServicePlanName
    workerSize: workerSize
    workerSizeId: workerSizeId
    numberOfWorkers: numberOfWorkers
    maximumElasticWorkerCount: '20'
    zoneRedundant: false
  }
  sku: {
    tier: sku
    name: skuCode
  }
  kind: ''
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2022-05-01' = {
  name: storageAccountName
  location: location
  tags: {}
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    defaultToOAuthAuthentication: true
  }
}

resource appService 'Microsoft.Web/sites@2020-06-01' = {
  name: webSiteName
  location: location
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~18'
        }
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=${listKeys(storageAccount.id,'2019-06-01').keys[0].value};EndpointSuffix=core.windows.net'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=${listKeys(storageAccount.id,'2019-06-01').keys[0].value};EndpointSuffix=core.windows.net'
        }
        {
          name: 'AzureFunctionsJobHost__extensionBundle__id'
          value: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows'
        }
        {
          name: 'AzureFunctionsJobHost__extensionBundle__version'
          value: '[1.*, 2.0.0)'
        }
        {
          name: 'APP_KIND'
          value: 'workflowApp'
        }
      ]
      cors: {}
      use32BitWorkerProcess: false
      ftpsState: ftpsState
      netFrameworkVersion: netFrameworkVersion
    }
    clientAffinityEnabled: false
    virtualNetworkSubnetId: null
    publicNetworkAccess: 'Enabled'
    httpsOnly: true
  }
  kind: 'functionapp,workflowapp'
}

resource zipDeploy 'Microsoft.Web/sites/extensions@2021-02-01' = {
  name: any('ZipDeploy')
  parent: appService
  properties: {
    packageUri: 'https://raw.githubusercontent.com/Azure/LogicAppsUX/e2eTesting/e2e/testSetup/BlankLogicApp/zipStuff.zip'
  }
}
