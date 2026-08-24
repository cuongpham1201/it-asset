# Security and directory validation

## Automated gates

Every pull request runs unit tests, dependency audit, Prisma migration smoke tests, Trivy filesystem/secret/configuration scanning and image scanning. Run the HTTPS deployment baseline with:

```bash
./scripts/security-smoke.sh https://assets.example.com
```

This baseline is not a penetration test. Before production go-live, an independent tester must cover authenticated RBAC/IDOR, CSRF, session fixation and expiry, import abuse, stored XSS, SSRF, LDAP injection, Graph privilege scope, rate limiting, file upload and backup/restore access. Record findings, remediation commit and retest evidence outside the repository.

## Microsoft 365 / Entra ID

Use a dedicated app registration with application permissions `User.Read.All` and, only when group-to-role mapping is enabled, `GroupMember.Read.All`. Grant admin consent, store the client secret through AssetFlow settings, then execute:

```bash
ASSETFLOW_URL=https://assets.example.com DIRECTORY_PROVIDER=M365 ./scripts/directory-live-test.sh
```

Review discovery counts and role mappings before running a real sync:

```bash
ASSETFLOW_URL=https://assets.example.com DIRECTORY_PROVIDER=M365 DIRECTORY_RUN_SYNC=true ./scripts/directory-live-test.sh
```

## LDAP / Active Directory

Use a read-only bind account, LDAPS or StartTLS, a restricted Base DN and an explicit user filter. Import the issuing CA instead of disabling certificate verification. Run the same commands with `DIRECTORY_PROVIDER=LDAP`. Verify disabled accounts, duplicate email handling, department creation, group-to-role precedence and that secrets never appear in logs.

Real integration is accepted only when both the connection test and one controlled sync pass against the organization's tenant/directory, and the resulting people/system-user records and audit run are reviewed by an administrator.
