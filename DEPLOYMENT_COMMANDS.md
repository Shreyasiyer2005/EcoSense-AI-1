# EcoSense AI - Deployment Commands

Quick reference for GitHub and Render deployment.

---

## Prerequisites

1. ✅ Sentinel Hub credentials: https://shapps.dataspace.copernicus.eu/dashboard/
2. ✅ GitHub account: https://github.com
3. ✅ Render account: https://render.com

---

## Step 1: GitHub Repository

### Create Repository (GitHub Website)

1. Go to: https://github.com/new
2. Name: `ecosense-ai`
3. Description: `Environmental monitoring platform using Sentinel-2 satellite imagery`
4. Visibility: **Public**
5. **DO NOT** initialize with README (already exists)
6. Click "Create repository"

### Push Code

```bash
# Navigate to project
cd "C:\Users\shrey\OneDrive\Desktop\EcoSenseAI_Final"

# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/ecosense-ai.git

# Verify
git remote -v

# Stage all files
git add .

# Check status
git status

# Commit
git commit -m "feat: complete EcoSense AI implementation"

# Push
git branch -M main
git push -u origin main
```

### Verify Upload

Visit: https://github.com/YOUR_USERNAME/ecosense-ai

Check:
- ✅ README.md displays
- ✅ render.yaml present
- ❌ No .env files
- ❌ No node_modules/
- ❌ No test files

---

## Step 2: Render Deployment

### Connect GitHub

1. Login: https://dashboard.render.com
2. Click: New + → Blueprint
3. Connect GitHub (authorize)
4. Select: `YOUR_USERNAME/ecosense-ai`
5. Branch: `main`
6. Click: Apply

### Configure Environment Variables

**⚠️ Set these immediately after creating services**

#### Frontend (ecosense-frontend)

```
VITE_API_BASE_URL=https://ecosense-backend.onrender.com
VITE_ML_SERVICE_URL=https://ecosense-ml-service.onrender.com
VITE_CESIUM_ION_TOKEN=
```

#### Backend (ecosense-backend)

```
NODE_ENV=production
PORT=5000
COPERNICUS_CLIENT_ID=<YOUR_SENTINEL_HUB_CLIENT_ID>
COPERNICUS_CLIENT_SECRET=<YOUR_SENTINEL_HUB_CLIENT_SECRET>
PYTHON_SERVICE_URL=https://ecosense-ml-service.onrender.com
ALLOWED_ORIGINS=https://ecosense-frontend.onrender.com
OLLAMA_BASE_URL=
LLM_PROVIDER=fallback
```

#### ML Service (ecosense-ml-service)

```
ENVIRONMENT=production
PORT=8000
MODEL_DEVICE=cpu
ALLOWED_ORIGINS=https://ecosense-backend.onrender.com,https://ecosense-frontend.onrender.com
```

---

## Step 3: Verify Deployment

### Health Checks

```bash
curl https://ecosense-backend.onrender.com/health
curl https://ecosense-ml-service.onrender.com/health
```

### Browser Test

1. Open: https://ecosense-frontend.onrender.com
2. Navigate: Analyze page
3. Search: "Mumbai"
4. Search satellite data
5. Run analysis
6. Verify all 4 tabs work

---

## Step 4: Update README

```bash
# Edit README.md, change line:
🌍 **[Live Demo](https://ecosense-frontend.onrender.com)**

# Commit
git add README.md
git commit -m "docs: add live demo URL"
git push
```

---

## Troubleshooting

### Build Fails

Check Render logs:
- Dashboard → Service → Logs tab

Common issues:
- TypeScript errors → Run `npm run build` locally first
- Missing env vars → Check dashboard → Environment tab
- Python dependencies → Check requirements.txt

### CORS Errors

Fix:
1. Backend `ALLOWED_ORIGINS` = frontend URL
2. ML Service `ALLOWED_ORIGINS` = backend + frontend URLs
3. Redeploy after changing

### Images Don't Load

Check:
1. ML Service logs for PNG generation errors
2. Backend serves `/overlays` static files
3. Network tab (F12) shows correct image URLs

---

## Costs

**Free Tier**: $0/month
- Cold start: 30-60 seconds
- Services spin down after 15 min

**Starter Tier**: $21/month ($7 × 3 services)
- Always on
- No cold starts

---

**Status**: Ready for deployment
**Time Required**: 30 minutes
**Support**: GitHub issues or Render community
