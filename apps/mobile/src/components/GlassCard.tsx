import * as React from 'react';
import { View, type ViewStyle } from 'react-native';
import { Colors } from '../theme/colors';

export function GlassCard({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View
      style={{
        backgroundColor: Colors.panel,
        borderColor: Colors.border,
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        ...style,
      }}
    >
      {children}
    </View>
  );
}
