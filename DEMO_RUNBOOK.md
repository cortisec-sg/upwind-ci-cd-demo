# Upwind GitHub and CI/CD Client Demo Runbook

## Objective
Show code to container scanning, GitHub Actions findings, PR remediation, registry publishing and optional AWS EKS runtime correlation.

## Preparation
1. Open the GitHub repository and connect it to the Upwind GitHub integration.
2. Configure GitHub Actions secrets UPWIND_CLIENT_ID and UPWIND_CLIENT_SECRET.
3. Run the build/test/image scan workflow on main.
4. If runtime correlation is required, configure AWS OIDC, EKS deployment and install Upwind sensors in the selected tenant region.

## Walkthrough
1. Show the synthetic web application locally with `npm ci && npm test && npm start`.
2. Show successful baseline GitHub Actions workflow.
3. Create a temporary branch: `git switch -c demo/security-findings`.
4. Run `npm run demo:risk`, commit, push and open a pull request.
5. Show the Upwind image scan and any SCA/IaC findings enabled in the tenant.
6. Run `npm run demo:fix`, commit and push to show remediation.
7. Merge only corrected code and review image publishing.
8. Optionally deploy approved image to EKS and explain runtime prioritization.

## Warnings
Never deploy the intentionally vulnerable branch or apply insecure Terraform.
The CI pipeline intentionally skips Upwind scanning until credentials are configured.
GHCR images may be private and require an image pull secret for EKS.
Upwind findings depend on tenant entitlements and available scanning rules.
