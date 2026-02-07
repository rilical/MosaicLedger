import { Badge, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';

export default function ExportPage() {
  return (
    <div className="pageStack" style={{ maxWidth: 980 }}>
      <div className="pageHeader">
        <h1 className="pageTitle">Export</h1>
        <div className="pageMeta">
          <div className="pageTagline">Poster export (SVG/PNG) is next.</div>
          <Badge>soon</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Poster</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="small" style={{ display: 'grid', gap: 8 }}>
            <div>
              This page is a scaffold. The intended export is a single artifact: Mosaic mural + plan
              summary, downloadable as SVG/PNG.
            </div>
            <div>
              For hackathon stability, export must respect Privacy Mode once implemented (no
              merchant names when enabled).
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
