# Deploying

`main` holds finished work that hasn't shipped yet — pushing to it does not
change the live site. The GitHub Pages deploy (`deploy.yml`) runs only when a
release is **published** on GitHub, and it deploys the commit that release's
tag points at.

So the flow is: merge to `main` freely, then publish a release when you want
those changes live. Pushing a bare tag isn't enough — the release itself has
to be published. There's a manual "Run workflow" button on the Actions tab if
you ever need to redeploy without cutting a release.

## The github-pages environment needs a tag policy

This is repository configuration, not something in this repo, and it is easy
to lose. A `release` event runs against the **tag** ref, not a branch. If the
`github-pages` environment is restricted to deploying from `main` only — which
is how GitHub sets it up by default — then a release-triggered deploy is
rejected before it starts.

The failure is nasty to diagnose: the job completes in about two seconds with
`failure`, an **empty step list**, and no error message anywhere in the logs,
because it never got as far as running a step.

The fix is to allow tags to deploy, under
**Settings → Environments → github-pages → Deployment branches and tags**:
add a rule of type *tag* matching `*`, alongside the existing `main` branch
rule. Equivalently, via the API:

```bash
gh api -X POST \
  repos/:owner/:repo/environments/github-pages/deployment-branch-policies \
  -f name='*' -f type=tag
```

Worth re-checking if that environment is ever recreated, or if you fork this
repo and enable Pages on the fork.
