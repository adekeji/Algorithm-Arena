// Provisions an Azure Static Web App with Managed Functions, an Azure AI
// Search service for retrieval grounding, and wires Foundry + Search settings
// as SWA app settings. The relay function (api/src/functions/chat.ts) performs
// top-k retrieval before calling chat-completions.
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

@description('Location for the Static Web App. SWA Standard is available in a small set of regions (e.g. eastus2, westus2, centralus, westeurope, eastasia).')
param swaLocation string = 'eastus2'

@description('SWA SKU. Standard required for custom domains, app settings, and managed Functions at scale.')
param swaSku string = 'Standard'

@description('Azure AI Search service name (must be globally unique).')
param searchServiceName string = 'srch-${swaName}'

@description('Region for the Azure AI Search service.')
param searchLocation string = 'centralus'

@description('Name of the Azure AI Search index used for catalog retrieval.')
param searchIndexName string = 'algorithm-catalog'

resource foundry 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: foundryAccountName
}

resource search 'Microsoft.Search/searchServices@2024-03-01-preview' = {
  name: searchServiceName
  location: searchLocation
  sku: {
    name: 'basic'
  }
  properties: {
    replicaCount: 1
    partitionCount: 1
    hostingMode: 'default'
    publicNetworkAccess: 'enabled'
  }
}

resource swa 'Microsoft.Web/staticSites@2024-04-01' = {
  name: swaName
  location: swaLocation
  sku: {
    name: swaSku
    tier: swaSku
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
    FOUNDRY_API_KEY: foundry.listKeys().key1
    SEARCH_ENDPOINT: 'https://${search.name}.search.windows.net'
    SEARCH_INDEX: searchIndexName
    SEARCH_QUERY_KEY: search.listQueryKeys().value[0].key
  }
}

output staticWebAppName string = swa.name
output defaultHostname string = swa.properties.defaultHostname
output searchServiceName string = search.name
output searchEndpoint string = 'https://${search.name}.search.windows.net'
#disable-next-line outputs-should-not-contain-secrets
output deploymentToken string = swa.listSecrets().properties.apiKey
