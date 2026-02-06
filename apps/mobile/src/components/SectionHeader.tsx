import * as React from 'react';
import { Text, View } from 'react-native';
import { Colors } from '../theme/colors';

export function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <Text
        style={{ color: Colors.muted, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' }}
      >
        {title}
      </Text>
      {right}
    </View>
  );
}
