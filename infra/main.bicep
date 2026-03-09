// ============================================================================
// DRIFT — Azure Infrastructure (Bicep)
// Provisions all Azure resources for the DRIFT travel planner
// ============================================================================

targetScope = 'subscription'

@description('Azure region for all resources')
param location string = 'southeastasia'

@description('Environment name')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Unique suffix for resource names')
param uniqueSuffix string = uniqueString(subscription().subscriptionId, 'drift')

var prefix = 'drift-${environment}'
var resourceGroupName = '${prefix}-rg'

// ============================================================================
// Resource Group
// ============================================================================
resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
  tags: {
    project: 'drift'
    environment: environment
  }
}

// ============================================================================
// Deploy all resources into the resource group
// ============================================================================
module resources 'modules/resources.bicep' = {
  name: 'drift-resources'
  scope: rg
  params: {
    location: location
    prefix: prefix
    uniqueSuffix: uniqueSuffix
  }
}

// ============================================================================
// Outputs
// ============================================================================
output resourceGroupName string = rg.name
output cosmosEndpoint string = resources.outputs.cosmosEndpoint
output functionAppUrl string = resources.outputs.functionAppUrl
output keyVaultName string = resources.outputs.keyVaultName
output webAppUrl string = resources.outputs.webAppUrl
