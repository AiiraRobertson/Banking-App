# Bank App - Azure Deployment & CI/CD Setup

## 🎯 What's Been Configured

Your bank app is now ready for deployment to Azure with automated CI/CD! Here's what's been set up:

### Infrastructure as Code (Bicep)
- ✅ Main bicep template: `.azure/infra/main.bicep`
- ✅ Parameters file: `.azure/infra/main.parameters.json`
- ✅ All resources follow Azure best practices with proper naming, RBAC, and monitoring

### Deployment Automation
- ✅ PowerShell deployment script: `.azure/deploy.ps1`
- ✅ GitHub Actions workflow: `.github/workflows/deploy.yml`
- ✅ Health check endpoint added to backend: `/health`

### Documentation
- ✅ Detailed deployment guide: `.azure/DEPLOYMENT_GUIDE.md`
- ✅ Bicep infrastructure files with all required configurations

---

## 🚀 Quick Start - Choose Your Deployment Method

### Option 1: Automated Deployment via GitHub Actions (RECOMMENDED)

**Best for:** Continuous deployment, team environments, automated testing

#### Setup (One-time)

1. **Generate Azure Credentials for GitHub:**
```powershell
# Run this command in PowerShell
az login
az ad sp create-for-rbac `
  --name "bank-app-cicd" `
  --role "Contributor" `
  --scopes "/subscriptions/f8cdef31-a31e-4b4a-93e4-5f571e91255a"
```

2. **Copy the JSON output** - you'll need all of it!

3. **Add to GitHub Secrets:**
   - Go to your GitHub repository
   - Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `AZURE_CREDENTIALS`
   - Value: Paste the entire JSON from step 1

#### Deploy

Simply push to main branch:
```bash
git add .
git commit -m "Deploy bank app to Azure"
git push origin main
```

View deployment at: GitHub repo → Actions → Latest workflow run

---

### Option 2: Manual Deployment via PowerShell Script

**Best for:** Quick testing, local development deployments

1. **Open PowerShell as Administrator**

2. **Navigate to project:**
```powershell
cd c:\Users\CROWN HP\bank-app
```

3. **Run deployment script:**
```powershell
.\.azure\deploy.ps1
```

4. **Follow the prompts:**
   - Authenticate with Azure
   - Script will automatically:
     - Create resource group
     - Deploy infrastructure
     - Build applications
     - Deploy to App Services

---

## 📊 What Gets Deployed

### Azure Resources
| Resource | Purpose | Cost/Month |
|----------|---------|-----------|
| App Service (Backend) | Node.js API server | ~$25 |
| App Service (Frontend) | React static hosting | ~$25 |
| Storage Account | Database persistence | ~$1 |
| Managed Identity | Secure authentication | Free |
| Application Insights | Monitoring & logging | ~$10 |
| Log Analytics | Centralized logs | ~$30 |

**Total: ~$91/month**

### Application Architecture
```
┌─────────────────────┐
│   Frontend (React)  │
│   App Service       │
├─────────────────────┤
│   Static Files (Dist)│
│   Port: 3000        │
└─────────────────────┘
           ↓ HTTPS
┌─────────────────────┐
│  Backend (Node.js)  │
│  App Service        │
├─────────────────────┤
│  Express API        │
│  Port: 3000         │
└─────────────────────┘
           ↓
┌─────────────────────┐
│  Storage Account    │
│  Database Files     │
└─────────────────────┘
```

---

## 🔧 Azure Resource Details

### Backend App Service
- **Runtime:** Node.js 20 LTS
- **Environment Variables:**
  - `PORT=3000`
  - `NODE_ENV=production`
  - Application Insights enabled
- **Features:**
  - User-assigned Managed Identity
  - CORS enabled for all origins
  - Diagnostic logs to Log Analytics
  - Health check endpoint: `/health`

### Frontend App Service
- **Runtime:** Node.js 20 LTS (for static serving)
- **Environment Variables:**
  - `VITE_API_URL` (auto-configured to backend)
  - Application Insights enabled
- **Features:**
  - User-assigned Managed Identity
  - Serves React built dist folder
  - Automatic redirects for SPA routing

### Storage Account
- **Type:** Standard LRS (Locally Redundant)
- **Security:** 
  - Local auth disabled
  - Anonymous blob access disabled
  - Managed Identity access via RBAC
- **Purpose:** Database file persistence

---

## 📝 Environment & Configuration

### Production Environment
- `environmentName`: `prod`
- `location`: `eastus`
- All resources have HTTPS enabled
- Minimum TLS 1.2 enforced

### CORS Configuration
- All origins allowed (configured in bicep)
- Can be restricted by editing `.azure/infra/main.bicep`

### Health Check
Backend provides health status at:
```
GET https://<backend-url>/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-04-25T10:30:00.000Z"
}
```

---

## 🔍 Monitoring & Logs

### View Application Logs
```bash
# Backend logs
az webapp log tail --resource-group bank-app-rg --name <backend-app-name>

# Frontend logs
az webapp log tail --resource-group bank-app-rg --name <frontend-app-name>
```

### View Metrics in Azure Portal
1. Go to Azure Portal
2. Resource Group: `bank-app-rg`
3. Click on App Service
4. Monitor → Metrics (CPU, Memory, Requests)
5. Logs → Query Application Insights data

---

## ✅ Deployment Checklist

Before deploying, ensure:

- [ ] Azure CLI installed or will be installed by script
- [ ] Azure subscription ID: `f8cdef31-a31e-4b4a-93e4-5f571e91255a`
- [ ] Git repository initialized and on main branch
- [ ] For GitHub Actions: Azure credentials added as secret
- [ ] Node.js dependencies can be installed (npm install works)

---

## 🛠️ Troubleshooting

### "az command not found"
The installation takes a few minutes. After running the winget install command:
1. Wait 2-3 minutes for MSI installation to complete
2. Restart PowerShell
3. Try `az --version` again

### Deployment Script Fails
1. **Check Azure login:**
   ```bash
   az account show
   ```

2. **Verify subscription:**
   ```bash
   az account list --query "[].{name:name, subscriptionId:id}"
   ```

3. **Check resource group creation:**
   ```bash
   az group list --query "[?name=='bank-app-rg']"
   ```

### Application Not Running After Deployment
1. Check logs:
   ```bash
   az webapp log tail --resource-group bank-app-rg --name <app-name>
   ```

2. Verify environment variables in Azure Portal

3. Check Application Insights for errors

### High Costs
- Consider using Dev/Test tier for non-production
- Reduce retention in Log Analytics (currently 30 days)
- Use auto-scaling to reduce idle instances

---

## 📚 Files Created

### Infrastructure
- `.azure/infra/main.bicep` - Infrastructure as Code (Bicep)
- `.azure/infra/main.parameters.json` - Deployment parameters

### Deployment
- `.azure/deploy.ps1` - PowerShell deployment script
- `.azure/DEPLOYMENT_GUIDE.md` - Detailed guide
- `.github/workflows/deploy.yml` - GitHub Actions workflow

### Code Updates
- `server/server.js` - Added `/health` endpoint

---

## 🎓 Next Steps

1. **Deploy immediately:**
   ```bash
   # Option A: Manual PowerShell
   .\.azure\deploy.ps1
   
   # Option B: GitHub Actions (push to main after setup)
   ```

2. **Monitor deployment:**
   - GitHub Actions: View workflow runs
   - PowerShell: Watch script output

3. **Test application:**
   - Visit frontend URL
   - Test API endpoints
   - Check Application Insights

4. **Production optimization** (later):
   - Set up custom domain
   - Configure backup strategy
   - Setup alerts for errors
   - Configure auto-scaling

---

## 📞 Support Resources

- [Azure CLI Docs](https://learn.microsoft.com/cli/azure/)
- [App Service Docs](https://learn.microsoft.com/azure/app-service/)
- [Bicep Documentation](https://learn.microsoft.com/azure/azure-resource-manager/bicep/)
- [GitHub Actions Docs](https://docs.github.com/actions)

---

## 🎉 You're Ready!

Your bank app is configured for enterprise-grade Azure deployment with:
- ✅ Infrastructure as Code (Bicep)
- ✅ Automated CI/CD (GitHub Actions)
- ✅ Monitoring & Logging
- ✅ Security Best Practices
- ✅ High Availability Setup

**Choose your deployment method above and get started!**
