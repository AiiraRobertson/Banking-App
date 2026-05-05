# Azure Deployment Script for Bank App
# This script deploys the infrastructure and applications to Azure

# Configuration
$subscriptionId = "f8cdef31-a31e-4b4a-93e4-5f571e91255a"
$resourceGroupName = "bank-app-rg"
$location = "eastus"
$environmentName = "prod"

Write-Host "Bank App Azure Deployment Script" -ForegroundColor Cyan

# Step 1: Login to Azure
Write-Host "`n[Step 1] Authenticating with Azure..." -ForegroundColor Yellow
az login --use-device-code

# Step 2: Set subscription
Write-Host "`n[Step 2] Setting Azure subscription..." -ForegroundColor Yellow
az account set --subscription $subscriptionId
az account show

# Step 3: Create resource group
Write-Host "`n[Step 3] Creating resource group: $resourceGroupName..." -ForegroundColor Yellow
az group create `
  --name $resourceGroupName `
  --location $location

# Step 4: Deploy infrastructure using Bicep
Write-Host "`n[Step 4] Deploying infrastructure with Bicep..." -ForegroundColor Yellow

# Generate secure JWT secret if not provided
if (-not $env:JWT_SECRET) {
    Write-Host "Generating secure JWT_SECRET..." -ForegroundColor Cyan
    # Generate a 64-character random string using .NET
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
    $jwtSecret = [Convert]::ToBase64String($bytes)
} else {
    $jwtSecret = $env:JWT_SECRET
}

Write-Host "JWT_SECRET generated (length: $($jwtSecret.Length))" -ForegroundColor Green

$bicepFile = ".\.azure\infra\main.bicep"
$parametersFile = ".\.azure\infra\main.parameters.json"

az deployment group create `
  --name "bank-app-deployment-$(Get-Date -Format 'yyyyMMddHHmmss')" `
  --resource-group $resourceGroupName `
  --template-file $bicepFile `
  --parameters $parametersFile `
  --parameters environmentName=$environmentName location=$location jwtSecret=$jwtSecret `
  --parameters @{jwtSecret=@{value=$jwtSecret}}

if ($LASTEXITCODE -ne 0) {
    Write-Host "Deployment failed!" -ForegroundColor Red
    exit 1
}

# Step 5: Get deployment outputs
Write-Host "`n[Step 5] Retrieving deployment information..." -ForegroundColor Yellow
$deployment = az deployment group show `
  --resource-group $resourceGroupName `
  --name (az deployment group list --resource-group $resourceGroupName --query '[0].name' -o tsv) `
  --query 'properties.outputs' | ConvertFrom-Json

$backendUrl = $deployment.backendAppServiceUrl.value
$frontendUrl = $deployment.frontendAppServiceUrl.value
$storageAccount = $deployment.storageAccountName.value

Write-Host "`nDeployment Completed Successfully!" -ForegroundColor Green
Write-Host "Backend URL: $backendUrl" -ForegroundColor Cyan
Write-Host "Frontend URL: $frontendUrl" -ForegroundColor Cyan
Write-Host "Storage Account: $storageAccount" -ForegroundColor Cyan

# Step 6: Build and deploy applications
Write-Host "`n[Step 6] Building applications..." -ForegroundColor Yellow

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Cyan
Set-Location client
npm install
npm run build
$frontendDist = (Get-Location).Path + "\dist"
Set-Location ..

# Step 7: Deploy backend
Write-Host "`n[Step 7] Deploying backend..." -ForegroundColor Yellow
$backendAppName = (az resource list --resource-group $resourceGroupName --query "[?type=='Microsoft.Web/sites' && contains(name, 'backend')].name" -o tsv)[0]

Write-Host "Backend App: $backendAppName"
Set-Location server
npm install
# Create deployment zip
$compress = @{
    Path = "*.js", "*.json", "db", "middleware", "models", "routes", "utils"
    DestinationPath = "..\backend-deploy.zip"
    Update = $true
}
Compress-Archive @compress
Set-Location ..

# Deploy backend
az webapp deployment source config-zip `
  --resource-group $resourceGroupName `
  --name $backendAppName `
  --src backend-deploy.zip

# Step 8: Deploy frontend
Write-Host "`n[Step 8] Deploying frontend..." -ForegroundColor Yellow
$frontendAppName = (az resource list --resource-group $resourceGroupName --query "[?type=='Microsoft.Web/sites' && contains(name, 'frontend')].name" -o tsv)[0]

Write-Host "Frontend App: $frontendAppName"

# Create frontend deployment package
$compress = @{
    Path = $frontendDist + "\*"
    DestinationPath = "frontend-deploy.zip"
    Update = $true
}
Compress-Archive @compress

# Deploy frontend
az webapp deployment source config-zip `
  --resource-group $resourceGroupName `
  --name $frontendAppName `
  --src frontend-deploy.zip

Write-Host "`n✅ All deployments completed successfully!" -ForegroundColor Green
Write-Host "Application URLs:" -ForegroundColor Cyan
Write-Host "  Backend:  $backendUrl" -ForegroundColor Green
Write-Host "  Frontend: $frontendUrl" -ForegroundColor Green
