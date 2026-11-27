# @connectci/xdmod-charts

The shared XDMoD chart contract used by ACCESS chat and Open OnDemand's ood-agent: a JSON Schema (`schema/chart-payload.v1.json`), the `ChartPayload` TypeScript types, and `parsePayload`, which validates an untrusted payload and returns it typed or `null`.

Version policy: the payload stays `version: 1`. Changes only add optional fields. Enumerated fields are closed, so a client that meets a value it doesn't know shows no chart, and it ignores fields it doesn't know.

Consumers pin a git tag. Each tagged commit contains the built `dist/`, so installs need no build step. Nothing is published to npm or PyPI.
