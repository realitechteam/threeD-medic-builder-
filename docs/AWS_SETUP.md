# AWS App Runner CI/CD Setup

Your App Runner service is already running at:
- **Region**: ap-southeast-2 (Sydney)
- **Service**: threed-medic-builder

## Option 1: App Runner Auto-Deploy (Recommended)

App Runner can auto-deploy directly from GitHub - no GitHub Actions needed!

### Check if already enabled:
1. Go to [App Runner Console](https://ap-southeast-2.console.aws.amazon.com/apprunner/home?region=ap-southeast-2#/services)
2. Select your service → **Configuration**
3. Under **Source**, check if **Automatic deployment** is ON

If enabled, just push to your GitHub repo and App Runner deploys automatically!

---

## Option 2: GitHub Actions Trigger

If you prefer GitHub Actions control, use the workflow in `.github/workflows/deploy.yml`.

### Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |

### IAM Policy Required

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "apprunner:StartDeployment",
        "apprunner:DescribeService"
      ],
      "Resource": "arn:aws:apprunner:ap-southeast-2:463609501908:service/threed-medic-builder/*"
    }
  ]
}
```

---

## Quick Deploy

```bash
git add .
git commit -m "Update"
git push origin main
```

Check deployment status at your [App Runner Dashboard](https://ap-southeast-2.console.aws.amazon.com/apprunner/home?region=ap-southeast-2#/services).
