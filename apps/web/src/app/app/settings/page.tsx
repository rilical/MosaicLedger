'use client';

import * as React from 'react';
import { SettingsDrawer } from '../../../components/SettingsDrawer';
import { Button, Card, CardBody, CardHeader, CardTitle } from '../../../components/ui';

function forgetThisDevice() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith('mosaicledger.')) keys.push(k);
    }
    for (const k of keys) window.localStorage.removeItem(k);
  } catch {
    // ignore
  }
}

export default function SettingsPage() {
  const [done, setDone] = React.useState(false);

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 980 }}>
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="small">
              Runtime flags are stored locally so judges can flip Demo/Judge modes without a
              rebuild.
            </div>

            <div className="buttonRow">
              <SettingsDrawer />
              <Button
                variant="danger"
                onClick={() => {
                  forgetThisDevice();
                  setDone(true);
                }}
              >
                Forget this device
              </Button>
            </div>

            {done ? (
              <div className="small">Local cached settings cleared.</div>
            ) : (
              <div className="small">
                This clears localStorage keys under the `mosaicledger.*` prefix (flags and future
                caches).
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
