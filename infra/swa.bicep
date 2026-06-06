// Provisions an Azure Static Web App with Managed Functions and wires the
// Foundry chat-completions endpoint + API key as app settings so the relay
// function (api/src/functions/chat.ts) can broker tokenless browser calls.
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
  }
}

output staticWebAppName string = swa.name
output defaultHostname string = swa.properties.defaultHostname
#disable-next-line outputs-should-not-contain-secrets
output deploymentToken string = swa.listSecrets().properties.apiKey
