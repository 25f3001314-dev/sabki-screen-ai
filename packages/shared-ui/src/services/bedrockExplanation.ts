import { Movie, SlateCard, Viewer } from '../engine/groupEngine';

declare const process: {
  env: Record<string, string | undefined>;
};

export interface ExplanationRequest {
  movie: {
    title: string;
    genres: string[];
    runtimeMin: number;
    ageRating: number;
  };
  group: Array<{
    name: string;
    match: number;
  }>;
  constraints: {
    ageSafe: boolean;
  };
  rank: number;
}

interface ExplanationResponse {
  explanation?: string;
}

interface RuntimeAbortSignal {
  readonly aborted: boolean;
}

interface RuntimeAbortController {
  signal: RuntimeAbortSignal;
  abort: () => void;
}

interface FetchResponse {
  ok: boolean;
  json: () => Promise<unknown>;
}

interface RuntimeGlobals {
  AbortController?: new () => RuntimeAbortController;
  fetch?: (
    url: string,
    options: {
      method: string;
      headers: Record<string, string>;
      body: string;
      signal?: RuntimeAbortSignal;
    },
  ) => Promise<FetchResponse>;
}

const FALLBACK_EXPLANATION =
  "Balances the group's preferences while keeping the movie within the current safety limits.";

function getExplanationApiUrl(): string | undefined {
  return typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_BEDROCK_EXPLANATION_URL : undefined;
}

export function buildExplanationRequest(card: SlateCard, viewers: Viewer[], rank: number): ExplanationRequest {
  const { movie } = card.scored;
  return {
    movie: toMoviePayload(movie),
    group: viewers.map((viewer) => ({
      name: viewer.name,
      match: Math.round((card.scored.perViewer[viewer.id] ?? 0) * 100) / 100,
    })),
    constraints: {
      ageSafe: viewers.every((viewer) => viewer.maxAge === undefined || movie.ageRating <= viewer.maxAge),
    },
    rank,
  };
}

export async function fetchMovieExplanation(
  request: ExplanationRequest,
  signal?: RuntimeAbortSignal,
): Promise<string | null> {
  const endpoint = getExplanationApiUrl();
  console.log('[Bedrock explanation] endpoint:', endpoint);
  if (!endpoint) return null;

  try {
    const runtime = globalThis as unknown as RuntimeGlobals;
    if (!runtime.fetch) return null;
    const response = await runtime.fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });
    if (!response.ok) return null;

    const data = (await response.json()) as ExplanationResponse;
    return data.explanation?.trim() || null;
  } catch (error) {
    console.error('[Bedrock explanation] request failed:', error);
    return null;
  }
}

export { FALLBACK_EXPLANATION };

function toMoviePayload(movie: Movie): ExplanationRequest['movie'] {
  return {
    title: movie.title,
    genres: movie.genres,
    runtimeMin: movie.runtimeMin,
    ageRating: movie.ageRating,
  };
}
