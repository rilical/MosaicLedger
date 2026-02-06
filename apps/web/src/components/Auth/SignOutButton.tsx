'use client';

import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '../../lib/supabase/browser';
import { Button } from '../ui';

export function SignOutButton() {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      onClick={async () => {
        try {
          await supabaseBrowser().auth.signOut();
        } finally {
          router.push('/login');
          router.refresh();
        }
      }}
    >
      Sign out
    </Button>
  );
}
