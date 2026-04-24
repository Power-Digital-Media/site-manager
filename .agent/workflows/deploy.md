---
description: Build, push to GitHub, and deploy to Netlify production
---
1. Run git status to check for changes
2. Add all changes
3. Commit with a descriptive message
4. Push to main branch on GitHub
5. Build the project
6. Deploy to pdm-site-manager on Netlify via CLI

// turbo-all
1. `git status`
2. `git add .`
3. `git commit -m "Deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"`
4. `git push origin main`
5. `npm run build`
6. `npx netlify-cli deploy --prod --dir=dist --site=8de89ec3-8f58-43b9-98c7-1316559af2b0`
