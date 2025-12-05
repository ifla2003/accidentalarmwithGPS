## Deployment & CI/CD Setup

This project is configured for continuous deployment to a Hostinger KVM VPS using GitHub Actions.

### Directory layout on the VPS

Expected layout on the VPS filesystem:

- **App root**: `$VPS_APP_DIR` → e.g. `/home/testatozas-ucasaapp/htdocs/ucasaapp.testatozas.in`
  - `server/` → Node/Express backend (contains `index.js`, `package.json`, etc.)
  - `server/build/` → React production build served by Express:
    - In `server/index.js` the static middleware uses `express.static(path.join(__dirname, "build"))`

Make sure you have cloned this repository into `$VPS_APP_DIR` so that the structure on the VPS matches the repo.

### Required software on the VPS

- Node.js (v18+ recommended) and `npm`
- Optional but recommended: `pm2` to manage the Node process
  - Install: `npm install -g pm2`

### GitHub secrets

In the GitHub repository settings, under **Settings → Secrets and variables → Actions**, define:

- **`VPS_HOST`**: The IP address or hostname of your VPS.
- **`VPS_USER`**: The SSH user (e.g. `testatozas-ucasaapp`).
- **`VPS_SSH_KEY`**: Private SSH key for passwordless login to the VPS (contents of your `id_ed25519` or `id_rsa`).
  - The matching public key must be in the VPS user's `~/.ssh/authorized_keys`.
- **`VPS_APP_DIR`**: Absolute path to the app root on the VPS, e.g. `/home/testatozas-ucasaapp/htdocs/ucasaapp.testatozas.in`.

### Frontend workflow (`.github/workflows/frontend-deploy.yml`)

- **Trigger**: Push to `main`/`master` that changes anything under `client/**`.
- **Steps**:
  - Check out the repo.
  - Install frontend dependencies with `npm ci` in `client/`.
  - Run `npm run build`.
  - Upload `client/build/` to the VPS, into `$VPS_APP_DIR/server/build/`.

Because the backend `index.js` serves static files from `server/build`, any change to the React app that gets built and pushed will be immediately reflected in production.

### Backend workflow (`.github/workflows/backend-deploy.yml`)

- **Trigger**: Push to `main`/`master` that changes anything under `server/**`.
- **Steps**:
  - Check out the repo.
  - Use `rsync` over SSH to sync the local `server/` directory to `$VPS_APP_DIR/server/` on the VPS (excluding `node_modules`).
  - SSH into the VPS to:
    - Run `npm ci --omit=dev` inside `$VPS_APP_DIR/server`.
    - Restart the Node process using `pm2` with the app name `ucasaapp`:
      - `pm2 restart ucasaapp || pm2 start index.js --name ucasaapp`
      - `pm2 save`

If `pm2` is not installed, the workflow falls back to starting `node index.js` with `nohup`. For a reliable production setup, install and use `pm2` or a systemd service.

### One-time VPS preparation

1. **Clone the repo** to the expected directory:
   - `cd /home/testatozas-ucasaapp/htdocs`
   - `git clone <your-repo-url> ucasaapp.testatozas.in`
2. **Install backend dependencies** once (the workflow will keep them updated):
   - `cd /home/testatozas-ucasaapp/htdocs/ucasaapp.testatozas.in/server`
   - `npm ci --omit=dev`
3. **Install pm2** (recommended):
   - `npm install -g pm2`
   - `pm2 start index.js --name ucasaapp`
   - `pm2 save`
4. **(Optional) Configure your web server** (Apache/nginx) to proxy `ucasaapp.testatozas.in` to the Node server port (default `5000`), if you're not exposing Node directly.

After this initial setup, pushes to GitHub will automatically:

- Rebuild and deploy the React frontend when files under `client/` change.
- Sync backend changes under `server/`, reinstall dependencies, and restart the Node process.


