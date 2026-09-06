# Deploying

`main` holds finished work that hasn't shipped yet — pushing to it does not
change the live site. The GitHub Pages deploy (`deploy.yml`) runs only when a
release is **published** on GitHub, and it deploys the commit that release's
tag points at.

So the flow is: merge to `main` freely, then publish a release when you want
those changes live. Pushing a bare tag isn't enough — the release itself has
to be published. There's a manual "Run workflow" button on the Actions tab if
you ever need to redeploy without cutting a release.

## Cutting a release is one button

Dispatch **Cut release** from the Actions tab with a version and release notes.
It runs the tests, tags the commit it was dispatched against, creates the
release with the versioned `.html` attached, and then deploys — all in one run.

That last step needs explaining, because it looks redundant next to the
`release: published` trigger. A release created with the built-in
`GITHUB_TOKEN` deliberately does not raise events that start other workflows;
it's how GitHub stops a workflow from triggering itself forever. So the
release this workflow creates never fires `release: published`, and before
this the live site had to be moved by hand afterwards.

The fix is for `release.yml` to *call* `deploy.yml` rather than wait to be
triggered by it, which `workflow_call` allows. A called workflow receives the
permissions the caller grants it, so `release.yml` grants `pages: write` and
`id-token: write` on that job. The alternative — storing a personal access
token as a secret purely so the release event fires — would work too, but
means a long-lived credential in the repo for no other reason.

Releases published through the GitHub web UI still arrive the ordinary way,
via `release: published`.

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
