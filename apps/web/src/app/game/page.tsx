import { redirect } from 'next/navigation';

export default function GameRoute(): never {
  // AppLovin prize game is a single-file static bundle at /game.html.
  // Keep /game as the canonical route for navigation + demos.
  redirect('/game.html');
}
