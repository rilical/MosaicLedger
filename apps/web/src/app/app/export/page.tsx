import { Badge, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';

export default function ExportPage() {
  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 980 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div className="h1" style={{ fontSize: 20 }}>
            Export
          </div>
          <div className="small">Poster export (SVG/PNG) is next.</div>
        </div>
        <Badge>soon</Badge>
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
