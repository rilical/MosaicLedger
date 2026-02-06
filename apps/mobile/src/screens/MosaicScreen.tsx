import * as React from 'react';
import { Text, View } from 'react-native';

import { GlassCard } from '../components/GlassCard';
import { MosaicMural } from '../components/MosaicMural';
import { Pill } from '../components/Pill';
import { SectionHeader } from '../components/SectionHeader';
import { Colors } from '../theme/colors';

import type { Tile } from '../mock/sample';

export function MosaicScreen({
  monthLabel,
  totalSpend,
  tiles,
}: {
  monthLabel: string;
  totalSpend: number;
  tiles: Tile[];
}) {
  const [groupBy, setGroupBy] = React.useState<'category' | 'merchant'>('category');
  const [selected, setSelected] = React.useState<Tile | null>(null);

  return (
    <View style={{ flex: 1, padding: 18, gap: 12 }}>
      <View>
        <Text style={{ color: Colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.4 }}>
          {monthLabel} mural
        </Text>
        <Text style={{ color: Colors.muted, marginTop: 6, fontSize: 13 }}>
          Total spend: ${totalSpend.toFixed(2)}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
        <Pill
          label="Group: Category"
          active={groupBy === 'category'}
          onPress={() => setGroupBy('category')}
        />
        <Pill
          label="Group: Merchant"
          active={groupBy === 'merchant'}
          onPress={() => setGroupBy('merchant')}
        />
        <Pill label="Search" onPress={() => {}} />
        <Pill label="Export" onPress={() => {}} />
      </View>

      <GlassCard style={{ padding: 12 }}>
        <MosaicMural tiles={tiles} onSelect={setSelected} />
      </GlassCard>

      <GlassCard>
        <SectionHeader
          title="Selection"
          right={selected ? <Pill label="Details" onPress={() => {}} /> : undefined}
        />
        <Text style={{ color: Colors.text, marginTop: 10, fontSize: 14, lineHeight: 20 }}>
          {selected
            ? `${selected.label} is ${((selected.value / totalSpend) * 100).toFixed(1)}% of this month. Tap again to drill down.`
            : 'Tap a tile to see what it represents, then drill down into the fragments.'}
        </Text>
        <Text style={{ color: Colors.muted, marginTop: 8, fontSize: 12, lineHeight: 17 }}>
          UI note: drill-down is stubbed in this one-shot build. The production path is category to
          merchants to transactions.
        </Text>
      </GlassCard>
    </View>
  );
}
