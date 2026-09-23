// SabkiScreen AI - Deterministic Group Decision Engine
// "Math decides. AI explains." -> Yeh file "Math decides" wala hissa hai.
// Koi AI/LLM yahan ranking nahi karta. Sirf pure functions.

// ---------- Types ----------

export interface Viewer {
  id: string;
  name: string;
  /** Genre preferences, 0.0 (bilkul nahi) se 1.0 (bahut pasand) */
  prefs: Record<string, number>;
  /** Fairness Ledger credit (0 se 0.3). Base weight 1.0 + credit = effective weight */
  fairnessCredit?: number;
  /** Hard constraints (optional) */
  maxAge?: number; // is viewer ke liye max allowed age rating
  blockedGenres?: string[];
}

export interface Movie {
  id: string;
  title: string;
  genres: string[];
  runtimeMin: number;
  ageRating: number; // e.g. 0, 7, 13, 16, 18
}

export interface GroupConfig {
  weightAverage: number; // average satisfaction ka weight
  weightLeastMisery: number; // minimum satisfaction ka weight
  unknownGenreScore: number; // jab viewer ne genre rate nahi kiya
  maxRuntimeMin?: number; // group-level runtime limit
  maxFairnessCredit: number;
  ledgerDecay: number; // purana credit kitna bacha rahe (0-1)
  ledgerRate: number; // naya credit kitna jude
}

export const DEFAULT_CONFIG: GroupConfig = {
  weightAverage: 0.5,
  weightLeastMisery: 0.5,
  unknownGenreScore: 0.5,
  maxFairnessCredit: 0.3,
  ledgerDecay: 0.7,
  ledgerRate: 1.0,
};

export interface ScoredMovie {
  movie: Movie;
  perViewer: Record<string, number>; // viewerId -> satisfaction (0..1)
  average: number; // fairness-weighted average
  leastMisery: number; // minimum satisfaction
  groupScore: number; // 0..1
  matchPercent: number; // 0..100
  weakestViewerId: string;
}

export type SlateLabel = 'Best Group Match' | 'Balanced Alternative' | 'Wildcard Choice';

export interface SlateCard {
  label: SlateLabel;
  scored: ScoredMovie;
}

// ---------- Step 1: Hard constraints (safety pehle, fairness baad me) ----------

export function passesHardConstraints(
  movie: Movie,
  viewers: Viewer[],
  config: GroupConfig = DEFAULT_CONFIG,
): boolean {
  if (config.maxRuntimeMin !== undefined && movie.runtimeMin > config.maxRuntimeMin) {
    return false;
  }
  for (const v of viewers) {
    if (v.maxAge !== undefined && movie.ageRating > v.maxAge) return false;
    if (v.blockedGenres?.some((g) => movie.genres.includes(g))) return false;
  }
  return true;
}

// ---------- Step 2: Ek viewer ki satisfaction ----------

/** Movie ke genres par viewer ke scores ka average. Ek genre 0.0 ho to movie pe asar padta hai. */
export function viewerSatisfaction(
  viewer: Viewer,
  movie: Movie,
  config: GroupConfig = DEFAULT_CONFIG,
): number {
  if (movie.genres.length === 0) return config.unknownGenreScore;
  const scores = movie.genres.map((g) => viewer.prefs[g] ?? config.unknownGenreScore);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  // Agar koi genre viewer ko strongly naapasand hai (0.0), to worst genre ka bhi khayal rakho
  const worst = Math.min(...scores);
  return 0.7 * avg + 0.3 * worst;
}

// ---------- Step 3: Group score ----------

export function scoreMovie(
  movie: Movie,
  viewers: Viewer[],
  config: GroupConfig = DEFAULT_CONFIG,
): ScoredMovie {
  const perViewer: Record<string, number> = {};
  let weightedSum = 0;
  let weightTotal = 0;
  let minScore = Infinity;
  let weakestViewerId = viewers[0].id;

  for (const v of viewers) {
    const s = viewerSatisfaction(v, movie, config);
    perViewer[v.id] = s;
    const effectiveWeight = 1 + (v.fairnessCredit ?? 0); // Fairness Ledger yahin kaam karta hai
    weightedSum += s * effectiveWeight;
    weightTotal += effectiveWeight;
    if (s < minScore) {
      minScore = s;
      weakestViewerId = v.id;
    }
  }

  const average = weightedSum / weightTotal;
  const groupScore =
    (config.weightAverage * average + config.weightLeastMisery * minScore) /
    (config.weightAverage + config.weightLeastMisery);

  return {
    movie,
    perViewer,
    average,
    leastMisery: minScore,
    groupScore,
    matchPercent: Math.round(groupScore * 100),
    weakestViewerId,
  };
}

// ---------- Step 4: Ranking (constraints + veto ke baad) ----------

export function rankMovies(
  movies: Movie[],
  viewers: Viewer[],
  options: { vetoedMovieIds?: string[]; config?: GroupConfig } = {},
): ScoredMovie[] {
  const config = options.config ?? DEFAULT_CONFIG;
  const vetoed = new Set(options.vetoedMovieIds ?? []);
  return movies
    .filter((m) => !vetoed.has(m.id))
    .filter((m) => passesHardConstraints(m, viewers, config))
    .map((m) => scoreMovie(m, viewers, config))
    .sort((a, b) => b.groupScore - a.groupScore || b.leastMisery - a.leastMisery);
}

// ---------- Step 5: 3-card slate ----------

export function buildSlate(ranked: ScoredMovie[]): SlateCard[] {
  if (ranked.length === 0) return [];
  const slate: SlateCard[] = [];

  // Card 1: Best Group Match = sabse upar
  const best = ranked[0];
  slate.push({ label: 'Best Group Match', scored: best });
  const rest = ranked.slice(1);

  // Card 2: Balanced Alternative = bachi hui me sabse achha least-misery
  if (rest.length > 0) {
    const balanced = [...rest].sort(
      (a, b) => b.leastMisery - a.leastMisery || b.groupScore - a.groupScore,
    )[0];
    slate.push({ label: 'Balanced Alternative', scored: balanced });

    // Card 3: Wildcard = alag genre wala, jiska score theek ho
    const used = new Set(slate.map((c) => c.scored.movie.id));
    const usedGenres = new Set(slate.flatMap((c) => c.scored.movie.genres));
    const remaining = rest.filter((r) => !used.has(r.movie.id));
    const wildcard =
      remaining.find((r) => r.movie.genres.some((g) => !usedGenres.has(g))) ?? remaining[0];
    if (wildcard) slate.push({ label: 'Wildcard Choice', scored: wildcard });
  }
  return slate;
}

// ---------- Step 6: Fairness Ledger update (movie chunne ke baad) ----------

/**
 * Jis viewer ki satisfaction group average se kam thi, use agle session ke liye
 * thoda credit milta hai. Credit hamesha 0 se maxFairnessCredit ke beech rehta hai,
 * aur purana credit dheere dheere ghatta hai (decay), taaki koi permanently favored na ho.
 */
export function updateFairnessLedger(
  viewers: Viewer[],
  chosen: ScoredMovie,
  config: GroupConfig = DEFAULT_CONFIG,
): Viewer[] {
  const values = viewers.map((v) => chosen.perViewer[v.id]);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  return viewers.map((v) => {
    const shortfall = Math.max(0, mean - chosen.perViewer[v.id]);
    const raw = (v.fairnessCredit ?? 0) * config.ledgerDecay + shortfall * config.ledgerRate;
    const credit = Math.min(config.maxFairnessCredit, Math.max(0, raw));
    return { ...v, fairnessCredit: Math.round(credit * 1000) / 1000 };
  });
}