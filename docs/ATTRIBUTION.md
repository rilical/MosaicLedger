# Attribution (Planned Enrichment)

This project is **CSV-first** and can run fully offline. If/when we add optional enrichment
(merchant metadata, geocoding, category hints), we must follow the attribution and licensing
requirements of the upstream data sources.

## OpenStreetMap (OSM)

If we use OpenStreetMap-derived data (directly or via services like Nominatim/Overpass):

- Attribution: include **"© OpenStreetMap contributors"** in-product (e.g., footer or About).
- License: OpenStreetMap data is licensed under the **Open Database License (ODbL) 1.0**.
- Practical impact: if we distribute an OSM-derived database, ODbL's share-alike terms may apply.

References:

- https://www.openstreetmap.org/copyright
- https://opendatacommons.org/licenses/odbl/1-0/

## Wikidata

If we use Wikidata content (e.g., brand/entity metadata):

- License: Wikidata data is published under **CC0 1.0** (public domain dedication).
- Attribution: not legally required under CC0, but recommended for transparency ("Data from Wikidata").

References:

- https://www.wikidata.org/wiki/Wikidata:Licensing
- https://creativecommons.org/publicdomain/zero/1.0/
