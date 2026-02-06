import * as React from 'react';
import { Text, View } from 'react-native';
import Svg, { G, Rect, Text as SvgText } from 'react-native-svg';

import type { Tile } from '../mock/sample';
import { Colors } from '../theme/colors';

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export function MosaicMural({ tiles, onSelect }: { tiles: Tile[]; onSelect?: (t: Tile) => void }) {
  const [selected, setSelected] = React.useState<Tile | null>(null);

  return (
    <View>
      <View
        style={{
          borderRadius: 18,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: Colors.border,
          backgroundColor: 'rgba(255,255,255,0.03)',
        }}
      >
        <Svg viewBox="0 0 1000 520" width="100%" height={280}>
          <Rect x={0} y={0} width={1000} height={520} fill="rgba(255,255,255,0.02)" />
          {tiles.map((t) => {
            const showLabel = t.w > 220 && t.h > 80;
            return (
              <G
                key={t.id}
                onPress={() => {
                  setSelected(t);
                  onSelect?.(t);
                }}
              >
                <Rect
                  x={t.x}
                  y={t.y}
                  width={t.w}
                  height={t.h}
                  rx={22}
                  fill={t.color}
                  opacity={0.92}
                />
                {showLabel ? (
                  <SvgText x={t.x + 22} y={t.y + 44} fontSize={30} fill="rgba(0,0,0,0.78)">
                    {t.label}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
        </Svg>
      </View>

      <View style={{ marginTop: 10, minHeight: 18 }}>
        {selected ? (
          <Text style={{ color: Colors.muted, fontSize: 13 }}>
            <Text style={{ color: Colors.text, fontWeight: '700' }}>{selected.label}</Text> ·{' '}
            {money(selected.value)} · {selected.count} txns
          </Text>
        ) : (
          <Text style={{ color: Colors.muted, fontSize: 13 }}>Tap a tile to explore.</Text>
        )}
      </View>
    </View>
  );
}
