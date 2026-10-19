# Contributing

## Local generate

```bash
npm ci
npm run generate
```

Output: `_site/` (uncommitted). Root `README.md` is rewritten from live Open VSX data.

## Release-triggered rebuilds

The Pages workflow listens for `repository_dispatch` with `event_type: extension-published`.

On each extension repo that publishes to Marketplace / Open VSX:

1. Create an Actions secret `DIRECTORY_DISPATCH_TOKEN` — a PAT that can create repository dispatches on `bobrowsse-tech/vscode-extensions` (classic `repo` or fine-grained with Contents: Read + Actions: Write on that repo).
2. Merge the publish-workflow step that calls:

```bash
gh api repos/bobrowsse-tech/vscode-extensions/dispatches \
  -f event_type=extension-published \
  -f "client_payload[extension]=${GITHUB_REPOSITORY#*/}"
```

Without the secret, the step skips and publishes still succeed. Daily cron remains the safety net.
