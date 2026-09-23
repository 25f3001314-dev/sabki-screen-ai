// Demo: doc ke Amit / Priya / Rahul example ke saath engine chalana
// Run: npx tsx packages/shared-ui/src/engine/demo.ts

import {
  Movie,
  Viewer,
  buildSlate,
  rankMovies,
  updateFairnessLedger,
} from './groupEngine';

let viewers: Viewer[] = [
  { id: 'amit', name: 'Amit', prefs: { 'Sci-Fi': 0.95, Comedy: 0.6, Drama: 0.4, Action: 0.6 } },
  { id: 'priya', name: 'Priya', prefs: { Drama: 0.9, Comedy: 0.85, 'Sci-Fi': 0.5, Action: 0.4 } },
  {
    id: 'rahul',
    name: 'Rahul',
    prefs: { Action: 0.9, 'Sci-Fi': 0.8, Horror: 0.0, Comedy: 0.5, Drama: 0.3 },
    maxAge: 16,
  },
];

const movies: Movie[] = [
  { id: 'm1', title: 'Star Heist', genres: ['Sci-Fi', 'Action'], runtimeMin: 118, ageRating: 13 },
  { id: 'm2', title: 'Family Ties', genres: ['Drama', 'Comedy'], runtimeMin: 104, ageRating: 7 },
  { id: 'm3', title: 'Midnight Ward', genres: ['Horror', 'Drama'], runtimeMin: 96, ageRating: 16 },
  { id: 'm4', title: 'Laugh Galaxy', genres: ['Sci-Fi', 'Comedy'], runtimeMin: 100, ageRating: 7 },
  { id: 'm5', title: 'Iron Sunset', genres: ['Action'], runtimeMin: 125, ageRating: 16 },
  { id: 'm6', title: 'Blood Moon', genres: ['Horror'], runtimeMin: 90, ageRating: 18 },
  { id: 'm7', title: 'Quiet Letters', genres: ['Drama'], runtimeMin: 110, ageRating: 7 },
];

function show(title: string, vetoed: string[] = []) {
  const ranked = rankMovies(movies, viewers, { vetoedMovieIds: vetoed });
  const slate = buildSlate(ranked);
  console.log(`\n=== ${title} ===`);
  for (const card of slate) {
    const s = card.scored;
    const detail = viewers
      .map((v) => `${v.name}:${s.perViewer[v.id].toFixed(2)}`)
      .join('  ');
    console.log(
      `${card.label.padEnd(22)} ${s.movie.title.padEnd(14)} ${String(s.matchPercent).padStart(3)}%  ` +
        `[${detail}]  min=${s.leastMisery.toFixed(2)}`,
    );
  }
  return slate;
}

// Session 1
const slate1 = show('Session 1 (fairness credit = 0)');

// Session 1 me family "Star Heist" (Balanced card) chun leti hai.
// Priya isse kam khush hai -> wo compromise kar rahi hai -> ledger me credit milega
const chosen = slate1[1].scored;
viewers = updateFairnessLedger(viewers, chosen);
console.log('\nLedger update:', viewers.map((v) => `${v.name}=+${v.fairnessCredit}`).join('  '));

// Session 2: credit ke saath (Priya ko ab zyada weight milta hai)
const slate2 = show('Session 2 (Priya ko fairness credit mila)');

// Veto: koi member top pick reject kar de
show('Session 2 + Veto (top pick hata diya)', [slate2[0].scored.movie.id]);