// Provisions an Azure Static Web App with Managed Functions, gives it a
// system-assigned managed identity, and assigns the data-plane roles needed
// to call the existing Foundry AI Services account.
//
// Deploy (after `az login`):
//   az deployment group create \
//     -g rg-algorithm-arena \
//     -f infra/swa.bicep \
//     -p swaName=algorithm-arena-web foundryAccountName=ai-account-skldjimkph5a6

@description('Name of the Azure Static Web App to create.')
param swaName string

@description('Existing Foundry AI Services account name in the same resource group.')
param foundryAccountName string

@description('Foundry chat deployment to broker through /api/chat.')
param foundryDeployment string = 'gpt-41-mini'

@description('Foundry chat-completions API version.')
param foundryApiVersion string = '2025-01-01-preview'

@description('Location for the Static Web App. SWA Free is only available in a small set of regions (e.g. eastus2, westus2, centralus, westeurope, eastasia).')
param swaLocation string = 'eastus2'

@description('SWA SKU. Standard is required because the relay uses a system-assigned managed identity.')
param swaSku string = 'Standard'

resource foundry 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: foundryAccountName
}

resource swa 'Microsoft.Web/staticSites@2024-04-01' = {
  name: swaName
  location: swaLocation
  sku: {
    name: swaSku
    tier: swaSku
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    buildProperties: {
      appLocation: '/'
      apiLocation: 'api'
      outputLocation: 'dist'
    }
    publicNetworkAccess: 'Enabled'
  }
}

resource swaSettings 'Microsoft.Web/staticSites/config@2024-04-01' = {
  parent: swa
  name: 'appsettings'
  properties: {
    FOUNDRY_BASE_URL: foundry.properties.endpoint
    FOUNDRY_DEPLOYMENT: foundryDeployment
    FOUNDRY_API_VERSION: foundryApiVersion
  }
}

// Cognitive Services OpenAI User: data-plane chat-completions access.
var openAiUserRoleId = '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd'
// Cognitive Services User: read account + list deployments.
var cogServicesUserRoleId = 'a97b65f3-24c7-4388-baec-2e87135dc908'

resource roleOpenAiUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(foundry.id, swa.id, openAiUserRoleId)
  scope: foundry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', openAiUserRoleId)
    principalId: swa.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource roleCogServicesUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(foundry.id, swa.id, cogServicesUserRoleId)
  scope: foundry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', cogServicesUserRoleId)
    principalId: swa.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output staticWebAppName string = swa.name
output defaultHostname string = swa.properties.defaultHostname
#disable-next-line outputs-should-not-contain-secrets
output deploymentToken string = swa.listSecrets().properties.apiKey
