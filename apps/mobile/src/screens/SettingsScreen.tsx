import * as React from 'react';
import { Text, View } from 'react-native';

import { GlassCard } from '../components/GlassCard';
import { Pill } from '../components/Pill';
import { SectionHeader } from '../components/SectionHeader';
import { Colors } from '../theme/colors';

export function SettingsScreen() {
  return (
    <View style={{ flex: 1, padding: 18, gap: 12 }}>
      <View>
        <Text style={{ color: Colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.4 }}>
          Settings
        </Text>
        <Text style={{ color: Colors.muted, marginTop: 6, fontSize: 13 }}>
          Privacy and demo stability first.
        </Text>
      </View>

      <GlassCard>
        <SectionHeader title="Data sources" />
        <Text style={{ color: Colors.text, marginTop: 10, fontSize: 14, lineHeight: 20 }}>
          MosaicLedger will support bank APIs (Plaid/open banking) plus CSV import. No credential
          scraping.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          <Pill label="Connect bank (UI)" onPress={() => {}} />
          <Pill label="Upload CSV (UI)" onPress={() => {}} />
          <Pill label="Load sample" onPress={() => {}} />
        </View>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="Exports" right={<Pill label="Poster mode" onPress={() => {}} />} />
        <Text style={{ color: Colors.text, marginTop: 10, fontSize: 14, lineHeight: 20 }}>
          Export the mural as SVG/PNG for sharing (Digital Kiln). UI-only in this build.
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
          <Pill label="Export SVG" onPress={() => {}} />
          <Pill label="Export PNG" onPress={() => {}} />
        </View>
      </GlassCard>

      <GlassCard>
        <SectionHeader title="About" />
        <Text style={{ color: Colors.muted, marginTop: 10, fontSize: 12, lineHeight: 17 }}>
          Guidance, not financial advice. This one-shot app is UI-only (generated 2026-02-06).
        </Text>
      </GlassCard>
    </View>
  );
}
