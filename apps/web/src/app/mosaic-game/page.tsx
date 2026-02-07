import { redirect } from 'next/navigation';

export default function MosaicGameRoute(): never {
  // Extra canvas side-quest lives under /game/index.html.
  redirect('/game/index.html');
}

