# Data sources (planned)

## Bank APIs (post-CSV MVP)

- Plaid (recommended first): Link -> access token -> transactions.
- Alternative providers later: MX, Tink, Finicity.

## Enrichment (optional)

- OpenStreetMap (Nominatim / Overpass) for category hints.
- Wikidata for major-brand metadata.

## Caching

- Local JSON cache keyed by normalized merchant name.
- Never re-query the same merchant during a demo.
