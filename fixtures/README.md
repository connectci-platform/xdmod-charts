# Builder fixtures

Each `fixtures/<name>.json` is one case for a producer's payload builder:

```json
{ "description": "...", "producers": ["ts", "py"], "input": { }, "expected": { } }
```

`input` is a `BuilderInput` (see `src/fixtures.ts`): the request, XDMoD's answers already fetched (series values keyed by period start, or ranked categories), today's date, and the optional probes (`latest_data_day`, `resource_days`). `expected` is the `ChartPayload` the builder must return. `producers` lists which implementations are held to the fixture: `ts` is access-mcp, `py` is xdmod-mcp. `series` and `categories` in the input are post-trim: the producer's adapter, not the builder, drops gap-connector traces, "All N Others" entries and series with no values, applies the limit, and derives `has_more` and `others_count` (as access-mcp's `trimToLimit` does). `request.limit` is informational. A producer runs every fixture that names it.

Comparison rule: deep equality between the builder's output and `expected`, except `warnings`. For `warnings` only the ordered list of `code`s is compared. The text is each producer's own.

Fixtures use synthetic names only (`cluster-a`, `user-1`), never values recorded from a real or demo XDMoD. Each rule in `rules/README.md` names the fixtures that pin it.
