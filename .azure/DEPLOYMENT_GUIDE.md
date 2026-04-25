# Azure Deployment & CI/CD Setup Guide

## Overview
This guide explains how to deploy the Bank App to Azure and set up automated CI/CD pipeline using GitHub Actions.

## Prerequisites
- Azure CLI installed (will be installed automatically)
- GitHub repository with push access
- Azure subscription ID: `f8cdef31-a31e-4b4a-93e4-5f571e91255a`

## Architecture
```
┌─────────────────────────────────────────────────┐
│          GitHub Repository                       │
│  ┌──────────────────────────────────────────┐   │
│  │  .github/workflows/deploy.yml            │   │
│  │  (GitHub Actions CI/CD Pipeline)         │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
                      │
                      │ triggers on push to main
                      ▼
        ┌─────────────────────────────┐
        │   Build & Test              │
        │  - Build Frontend (React)   │
        │  - Install Backend deps     │
        └─────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ Deploy to Azure             │
        │  - Create Resource Group    │
        │  - Deploy Bicep template    │
        │  - Deploy Backend (App Svc) │
        │  - Deploy Frontend (App Svc)│
        └─────────────────────────────┘
```

## Deployment Methods

### Method 1: Automated Deployment with GitHub Actions (Recommended)

#### Step 1: Generate Azure Credentials
Run this command in your local terminal:
```powershell
az login
az ad sp create-for-rbac `
  --name "bank-app-cicd" `
  --role "Contributor" `
  --scopes "/subscriptions/f8cdef31-a31e-4b4a-93e4-5f571e91255a"
```

This will output JSON like:
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "f8cdef31-a31e-4b4a-93e4-5f571e91255a",
  "tenantId": "...",
  "activeDirectoryEndpointUrl": "...",
  "resourceManagerEndpointUrl": "...",
  "activeDirectoryGraphResourceId": "...",
  "sqlManagementEndpointUrl": "...",
  "galleryEndpointUrl": "...",
  "managementEndpointUrl": "..."
}
```

#### Step 2: Add GitHub Secret
1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `AZURE_CREDENTIALS`
5. Value: Paste the entire JSON output from Step 1

#### Step 3: Push to Main Branch
```bash
git add .
git commit -m "Add Azure deployment configuration"
git push origin main
```

The GitHub Actions workflow will automatically:
1. Build your frontend and backend
2. Create Azure resources using Bicep
3. Deploy both applications
4. Run health checks
5. Post a summary of deployment

**View Deployment Status:**
Go to your GitHub repo → Actions → Select the latest workflow run

### Method 2: Manual Deployment Using PowerShell Script

#### Step 1: Install Azure CLI
Azure CLI will be installed automatically when you run the deployment script. If you want to install it manually:
```powershell
winget install Microsoft.AzureCLI
# Restart PowerShell after installation
```

#### Step 2: Run Deployment Script
```powershell
# From the project root directory
cd c:\Users\CROWN HP\bank-app
.\.azure\deploy.ps1
```

The script will:
1. Prompt you to authenticate with Azure
2. Set your subscription
3. Create a resource group
4. Deploy infrastructure
5. Build applications
6. Deploy to App Services

#### Step 3: Verify Deployment
Once complete, you'll see URLs for:
- Backend API: `https://<backend-app>.azurewebsites.net`
- Frontend: `https://<frontend-app>.azurewebsites.net`

## Infrastructure Components

### Azure Resources Created
1. **App Service (Backend)**
   - Node.js 20 LTS
   - Hosts Express API
   - Connected to Storage Account

2. **App Service (Frontend)**
   - Serves built React application
   - Static file hosting

3. **Storage Account**
   - For database persistence
   - Secure access via Managed Identity

4. **Managed Identity**
   - Secure authentication
   - RBAC-based access control

5. **Application Insights**
   - Performance monitoring
   - Error tracking
   - Custom metrics

6. **Log Analytics Workspace**
   - Centralized logging
   - Query and analysis

## Environment Variables

### Backend (.env)
```env
PORT=3000
NODE_ENV=production
DATABASE_URL=<auto-configured>
APPLICATIONINSIGHTS_CONNECTION_STRING=<auto-configured>
```

### Frontend (.env)
```env
VITE_API_URL=https://<backend-url>.azurewebsites.net
```

## Monitoring & Logs

### View Application Logs
```bash
# Backend logs
az webapp log tail --resource-group bank-app-rg --name <backend-app-name>

# Frontend logs
az webapp log tail --resource-group bank-app-rg --name <frontend-app-name>
```

### View Application Insights
1. Azure Portal → Resource Group: `bank-app-rg`
2. Click Application Insights resource
3. View metrics, logs, and diagnostics

## Scaling

### Increase Performance
```bash
# Scale up to Premium tier
az appservice plan update \
  --name azpb<token> \
  --resource-group bank-app-rg \
  --sku P1V2
```

### Auto-scaling (Optional)
```bash
az monitor autoscale create \
  --resource-group bank-app-rg \
  --resource-name azpb<token> \
  --resource-type "Microsoft.Web/serverfarms" \
  --min-count 1 \
  --max-count 5 \
  --count 2
```

## Troubleshooting

### Deployment Fails
1. Check Azure CLI login: `az account show`
2. Verify subscription: `az account list`
3. Check resource group: `az group list --query "[?name=='bank-app-rg']"`

### Application Not Running
1. Check logs: `az webapp log tail --resource-group bank-app-rg --name <app-name>`
2. Check Application Insights
3. Verify environment variables in Azure Portal

### CORS Errors
CORS is pre-configured in the Bicep template. If you need to add domains:
1. Update `.azure/infra/main.bicep` - modify the `cors` configuration
2. Redeploy infrastructure

## Cost Estimation

**Monthly Costs (approximate, US East region):**
- App Service Plan S1 × 2: ~$50/month
- Storage Account (Standard LRS): ~$1/month
- Application Insights: ~$10/month
- Log Analytics Workspace: ~$30/month

**Total: ~$90/month**

For cost optimization:
- Use Dev/Test tier for non-production
- Set up auto-scaling based on traffic
- Use Azure Reserved Instances for long-term savings

## Next Steps

1. **Deploy using GitHub Actions** (Recommended):
   - Generate Azure credentials
   - Add `AZURE_CREDENTIALS` secret to GitHub
   - Push to main branch

2. **Or Deploy Manually**:
   - Run `.\.azure\deploy.ps1` script
   - Monitor deployment progress

3. **Monitor Application**:
   - Check Application Insights
   - Set up alerts for errors
   - Monitor performance metrics

4. **Setup Custom Domain** (Optional):
   - Purchase domain
   - Configure DNS records
   - Bind to App Services

## Support

For more information:
- [Azure CLI Documentation](https://learn.microsoft.com/en-us/cli/azure/)
- [App Service Documentation](https://learn.microsoft.com/en-us/azure/app-service/)
- [Bicep Documentation](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
