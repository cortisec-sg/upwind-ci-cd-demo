# Upwind + GitHub CI/CD Demo

A **real, runnable** synthetic Node.js shop API with GitHub Actions build/test, Upwind's official container image scan action, optional PR scan comments, GitHub Container Registry (GHCR) publish, Upwind image-publish association, and optional manual promotion to an existing EKS cluster.

> Safe starting point: no real customer information, no real credentials, no third-party runtime dependencies in `main`, and no AWS resources created by default.

## Contents

```text
upwind-ci-cd-demo/
├── .github/workflows/ci.yml          # test → build → Upwind scan → GHCR → Upwind publish
├── .github/workflows/deploy-eks.yml  # optional manual release to existing EKS
├── .gitignore, .dockerignore
├── package.json, package-lock.json
├── src/server.js                     # tiny API, built-in Node.js HTTP server
├── public/                           # browser UI to drive requests
├── test/app.test.js                  # tests run on GitHub Actions
├── scripts/generate-traffic.js       # synthetic API requests
├── scripts/demo-risk.js              # opt-in vulnerability / IaC PR scenario
├── Dockerfile, compose.yaml
├── kubernetes/                       # namespace, deployment, service
├── terraform/                        # safe S3 IaC sample; never applied automatically
└── DEMO_RUNBOOK.md                   # client demo walkthrough
```

## 1. Run the application locally

**Requirements:** Node.js 22+, Git. Docker Desktop is optional for local containers. There are no external npm packages required for the baseline.

Open PowerShell, VS Code terminal, macOS Terminal or a Linux shell in this folder:

```bash
npm ci
npm test
npm start
```

Open <http://localhost:3000> in a browser. Use **Generate API Traffic** and **Simulate Checkout**.

In another terminal:

```bash
npm run traffic
```

Quick health check:

```bash
curl http://localhost:3000/healthz
```

On Windows PowerShell you can use `Invoke-RestMethod http://localhost:3000/healthz`.

**With Docker (if installed):**

```bash
docker compose up --build
# OR
docker build -t upwind-ci-cd-demo:local .
docker run --rm -p 3000:3000 upwind-ci-cd-demo:local
```

## 2. Create and push the first GitHub repo

1. Create a **private, empty** repository named `upwind-ci-cd-demo` using <https://github.com/new>. Do not add README, .gitignore or a license in GitHub (they are already in this folder).
2. From your local project folder:

```bash
git init -b main
git add .
git commit -m "Initial Upwind GitHub CI/CD demo"
git remote add origin https://github.com/YOUR_USERNAME/upwind-ci-cd-demo.git
git push -u origin main
```

Replace `YOUR_USERNAME` and authenticate with GitHub using your normal browser sign-in / Git Credential Manager. For organizational accounts, use its GitHub org name. If `git init -b main` isn't supported by your Git version, run `git init` then `git branch -M main` before pushing.

On the **Actions** tab, see **Build, Scan and Publish (Upwind)**. Before Upwind secrets are configured, tests and Docker build will run, but the Upwind scan and image publication are intentionally skipped.

## 3. Connect the Upwind tenant

Two distinct connections are useful:

- **GitHub repository integration:** In the Upwind console, connect your GitHub organization/repository using the GitHub App/integration available for your tenant, authorizing **only this repository**. Enable repository/SCA/IaC scans where entitled. Check Upwind's **Code** views for the repository.
- **CI image scanning:** In GitHub repository **Settings → Secrets and variables → Actions → Repository secrets**, create:
  - `UPWIND_CLIENT_ID` — credential issued by your Upwind tenant.
  - `UPWIND_CLIENT_SECRET` — its matching secret.

Do **not** store these values in `.env`, committed YAML, source code, or screenshots. Upwind's official image scan action is in [this repository](https://github.com/upwindsecurity/shiftleft-create-image-scan-event-action) and its publish event action is [here](https://github.com/upwindsecurity/shiftleft-create-image-publish-event-action). Note that the GitHub App may require a separate Upwind feature entitlement; the image action alone does **not** enable every source scanning feature.

Re-run the main-branch workflow using **Actions → Build, Scan and Publish (Upwind) → Run workflow**. Expected sequence: tests pass; Docker image builds; Upwind image scan runs; workflow optionally enforces Upwind policy; image is pushed to **GHCR**; Upwind image-publish event is sent. The image is tagged with the commit SHA, not `latest`.

> On a private GHCR package, EKS needs an image pull secret and the pod's service account must be configured to use it. Alternatively, for this **synthetic demo image only**, make the GHCR package public in the package settings. GitHub repository privacy and GHCR package visibility are independent.

### Optional: enable a pipeline security gate

Under **Settings → Secrets and variables → Actions → Variables**, configure:

- `UPWIND_BLOCK_ON` = `do_not_deploy` OR `deploy_with_caution` (choose based on tenant policy).
- `UPWIND_ENFORCE_BLOCK_POLICY` = `true` if you want Upwind's PR-block policy to be enforced.

Do not assume every scanner finding will block a PR; the policy decision comes from Upwind. For production, pin third-party GitHub Actions to reviewed immutable commit SHAs rather than floating tags/branches.

## 4. Create a security finding safely (temporary branch only)

This step **intentionally adds a known vulnerable package and misconfigurations** solely for a scanning demonstration. Do not merge or deploy the risky version.

```bash
git checkout -b demo/security-findings
npm run demo:risk
npm test
git add package.json package-lock.json kubernetes/deployment.yaml terraform/main.tf
git commit -m "Demo only: introduce scan findings"
git push -u origin demo/security-findings
```

Then, on GitHub, open a **pull request into main**. The script pins `lodash@4.17.20` (an old dependency with published advisories), changes the Kubernetes root filesystem setting from read-only to writable, and disables S3 public-ACL blocking in the Terraform sample. It does **not** include exploit payloads or execute an attack.

Upwind's PR image action can comment if the `GITHUB_TOKEN` can write pull request comments; repository integration may separately report SCA/IaC findings. Findings depend on current vulnerability intelligence, tenant entitlements, policies and scan configuration. If no finding appears, first inspect the job log and Upwind Code scans; do not imply Upwind detected something it didn't.

**Remediate on the same PR branch:**

```bash
npm run demo:fix
npm test
git add package.json package-lock.json kubernetes/deployment.yaml terraform/main.tf
git commit -m "Remediate demo findings"
git push
```

Review the scan again, close the PR without merging, and switch back to `main`: `git switch main`.

> GitHub Actions triggered by pull requests from external **forks** generally do not receive repository secrets and may not be able to post comments. Use a feature branch in the same demonstration repository.

## 5. (Optional) Deploy a scanned image to AWS EKS

**Requires:** existing EKS cluster, AWS IAM role trusted through GitHub OIDC and authorized for that cluster, `kubectl`, an approved image already published to GHCR, and Upwind sensors installed on EKS if you want runtime visibility. The repo does **not** create EKS, AWS IAM, or an Upwind sensor by itself. AWS costs may apply.

**Manual local deployment:** Edit `kubernetes/deployment.yaml` and replace `ghcr.io/REPLACE_OWNER/upwind-ci-cd-demo:REPLACE_SHA` with the actual image from the successful main-branch GHCR publish, then:

```bash
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/service.yaml
kubectl apply -f kubernetes/deployment.yaml
kubectl -n upwind-demo rollout status deployment/upwind-demo-api
kubectl -n upwind-demo port-forward service/upwind-demo-api 3000:80
```

Then open <http://localhost:3000> and run `npm run traffic` locally. The service is **ClusterIP**, not a publicly exposed load balancer.

**GitHub Actions deployment workflow (optional manual promotion):**

1. Set repository variables `AWS_REGION` (e.g., `ap-south-1`) and `EKS_CLUSTER` (existing cluster name).
2. Set GitHub Actions secret `AWS_ROLE_ARN` to a narrowly scoped AWS role with OIDC trust restricted to this repo/environment and EKS deployment rights. Configure GitHub **environment** `demo-eks` for approval as appropriate. The role also needs Kubernetes authorization (EKS access entries / RBAC).
3. Ensure EKS can pull the GHCR image (public demo package or configured `imagePullSecret`).
4. Go to **Actions → Deploy approved image to EKS (optional) → Run workflow**, and enter the full 40-character SHA of the previously published main-branch image.

There is **no automatic deployment of a vulnerable pull-request image**. The separation intentionally demonstrates a scan-first, approval-gated release.

## 6. Runtime Upwind integration

Connect your AWS account to Upwind and follow the official [Upwind Kubernetes sensor install documentation](https://docs.upwind.io/public/getting-started/install-sensor/kubernetes/install). Select the right Upwind **tenant region**: the default installer region may be `us`; do not reuse the wrong region for an APAC tenant. Verify agents:

```bash
kubectl get agent,clusteragent -n upwind
```

Check the workload in Upwind and use the traffic generator to demonstrate active requests, workload inventory, vulnerability prioritization and any runtime correlations your license and instrumentation support. **A local Node app or GitHub-only workflow does not automatically generate Upwind runtime telemetry.**

## Safety / demo cleanup

- Use **only** test data and a demo repository.
- Never commit real secrets or insecure demo changes to `main`.
- Do not `terraform apply` the insecure sample.
- Limit Upwind GitHub App installation to this repository.
- Close (rather than merge) the risk PR after the demo.
- Delete the `upwind-demo` Kubernetes namespace after the demonstration if it was only for testing.
- Shut down any EKS infrastructure that was created solely for the demo to avoid charges.

For a spoken walkthrough, see [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md).
