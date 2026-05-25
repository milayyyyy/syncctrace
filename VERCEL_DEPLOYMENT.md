# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account** - Your repository must be on GitHub, GitLab, or Bitbucket
3. **Environment Variables** - Prepare your secrets

## Deployment Steps

### Step 1: Push to Git Repository

Ensure your code is committed and pushed to GitHub:

```bash
git add .
git commit -m "Configure Vercel deployment"
git push origin main
```

### Step 2: Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Project**
3. Select **Import Git Repository**
4. Search for your repository and click **Import**

### Step 3: Configure Project Settings

When importing, configure as follows:

**Project Name:** `syncctrace`

**Root Directory:** Leave as root (default)

**Build & Output Settings:**
- Build Command: `npm run build`
- Output Directory: `frontend/dist`
- Install Command: `npm install --legacy-peer-deps` (if needed)

### Step 4: Add Environment Variables

In Vercel dashboard, go to **Settings → Environment Variables** and add:

```
VITE_API_URL=https://your-vercel-domain.vercel.app/api
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
DATABASE_URL=your_database_url
OPENAI_API_KEY=your_api_key
OPENROUTER_API_KEY=your_api_key
JWT_SECRET=your_jwt_secret
```

### Step 5: Deploy

Click **Deploy** and Vercel will:
- Build your frontend
- Build your backend APIs
- Deploy Python service (if configured as serverless)
- Generate a live URL

## Project Structure

```
syncctrace/
├── frontend/          → Deployed as static site
├── backend/           → Deployed as API routes
├── ai-service/        → Python service (API endpoint)
└── vercel.json        → Monorepo configuration
```

## Important Notes

### Frontend
- Built and deployed from `frontend/dist`
- Auto-deployed on every push to main branch

### Backend (Node.js)
- API routes should be in `backend/src/routes/`
- Configure as serverless functions or use a server adapter

### AI Service (Python)
- Requires `requirements.txt` with dependencies
- Can be wrapped in Node.js API route calling Python subprocess
- Or deployed separately to Render/Heroku

## Post-Deployment

1. **Test Your App** - Visit your Vercel domain
2. **Custom Domain** - Add in Settings → Domains
3. **Auto-Deployments** - Configure in Settings → Git
4. **Monitoring** - Check Analytics & Logs dashboard

## Troubleshooting

**Build fails?**
- Check `vercel.json` configuration
- Run `npm run build` locally first
- Verify all environment variables are set

**API routes not working?**
- Ensure backend has proper exports
- Check Vercel Function logs in dashboard

**Python service issues?**
- Python functions must have a `handler` export
- Install all dependencies in `requirements.txt`

## Additional Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy locally
vercel

# View production
vercel --prod

# Check logs
vercel logs [project-name]
```

## Support

- [Vercel Docs](https://vercel.com/docs)
- [Python on Vercel](https://vercel.com/docs/functions/serverless-functions/python)
- [Monorepo Guide](https://vercel.com/docs/concepts/monorepos)
