# Gets a short-lived Azure AD bearer token for Foundry data-plane calls.
# Paste the output into the app's Foundry IQ Agent token field.
az account get-access-token --resource https://cognitiveservices.azure.com/ --query accessToken -o tsv
