import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { DefaultFocus, SpatialNavigationFocusableView, SpatialNavigationRoot } from 'react-tv-space-navigation';
import { useIsFocused } from '@react-navigation/native';
import { scaledPixels } from '../hooks/useScale';
import { safeZones } from '../theme';
import { colors } from '../theme/colors';
import { useMenuContext } from '../components/MenuContext';
import FocusablePressable from '../components/FocusablePressable';
import { buildExplanationRequest, FALLBACK_EXPLANATION, fetchMovieExplanation } from '../services/bedrockExplanation';
import { Viewer, Movie, SlateCard, rankMovies, buildSlate, updateFairnessLedger } from '../engine/groupEngine';

// ---- MVP demo data (baad me real catalogue se replace karna) ----

const INITIAL_VIEWERS: Viewer[] = [
  { id: 'amit', name: 'Amit', prefs: { SciFi: 0.9, Comedy: 0.6, Drama: 0.3, Action: 0.7 } },
  { id: 'priya', name: 'Priya', prefs: { Comedy: 0.9, Drama: 0.75, SciFi: 0.5, Action: 0.3 } },
  { id: 'rahul', name: 'Rahul', prefs: { Action: 0.9, SciFi: 0.8, Horror: 0.0, Comedy: 0.5 } },
];

const CATALOGUE: Movie[] = [
  { id: 'm1', title: 'Laugh Galaxy', genres: ['SciFi', 'Comedy'], runtimeMin: 110, ageRating: 7 },
  { id: 'm2', title: 'Star Heist', genres: ['Action', 'SciFi'], runtimeMin: 125, ageRating: 13 },
  { id: 'm3', title: 'Family Ties', genres: ['Drama', 'Comedy'], runtimeMin: 100, ageRating: 0 },
  { id: 'm4', title: 'Iron Sunset', genres: ['Action', 'Drama'], runtimeMin: 130, ageRating: 13 },
];

const SESSION_SECONDS = 120;

export default function DecisionScreen() {
  const { isOpen: isMenuOpen } = useMenuContext();
  const isScreenFocused = useIsFocused();
  const isActive = isScreenFocused && !isMenuOpen;

  const [viewers, setViewers] = useState<Viewer[]>(INITIAL_VIEWERS);
  const [vetoedIds, setVetoedIds] = useState<string[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  // 2-minute decision timer
  useEffect(() => {
    if (selectedTitle) return;
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, selectedTitle]);

  const slate: SlateCard[] = useMemo(() => {
    const ranked = rankMovies(CATALOGUE, viewers, { vetoedMovieIds: vetoedIds });
    return buildSlate(ranked);
  }, [viewers, vetoedIds]);

  useEffect(() => {
    const cancellationToken = { aborted: false };

    const loadExplanations = async () => {
      const results = await Promise.all(
        slate.map(async (card, index) => {
          const explanation = await fetchMovieExplanation(
            buildExplanationRequest(card, viewers, index + 1),
            cancellationToken,
          );
          return [card.scored.movie.id, explanation] as const;
        }),
      );

      if (cancellationToken.aborted) return;
      setExplanations((previous) => ({
        ...previous,
        ...Object.fromEntries(results.filter((entry): entry is [string, string] => entry[1] !== null)),
      }));
    };

    void loadExplanations();
    return () => {
      cancellationToken.aborted = true;
    };
  }, [slate, viewers]);

  const handleVeto = useCallback((movieId: string) => {
    setVetoedIds((prev) => [...prev, movieId]);
  }, []);

  const handleSelect = useCallback((card: SlateCard) => {
    setSelectedTitle(card.scored.movie.title);
    setViewers((prev) => updateFairnessLedger(prev, card.scored));
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <SpatialNavigationRoot isActive={isActive}>
      <View style={styles.container}>
        <Text style={styles.heading}>Aaj kya dekhein?</Text>

        {!selectedTitle && (
          <Text style={styles.timer}>
            ⏱ {minutes}:{seconds}
          </Text>
        )}

        {selectedTitle ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>Chuna gaya: {selectedTitle} 🎬</Text>
          </View>
        ) : (
          <View style={styles.row}>
            {slate.map((card, index) => (
              <DecisionCard
                key={card.scored.movie.id}
                card={card}
                autoFocus={index === 0}
                explanation={explanations[card.scored.movie.id] ?? FALLBACK_EXPLANATION}
                onVeto={() => handleVeto(card.scored.movie.id)}
                onSelect={() => handleSelect(card)}
              />
            ))}
          </View>
        )}
      </View>
    </SpatialNavigationRoot>
  );
}

function DecisionCard({
  card,
  autoFocus,
  explanation,
  onVeto,
  onSelect,
}: {
  card: SlateCard;
  autoFocus: boolean;
  explanation: string;
  onVeto: () => void;
  onSelect: () => void;
}) {
  const { scored, label } = card;

  const selectButton = <FocusablePressable text="Select" onSelect={onSelect} style={styles.selectBtn} />;

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardTitle}>{scored.movie.title}</Text>
      <Text style={styles.cardScore}>{scored.matchPercent}% Match</Text>
      <Text style={styles.cardGenres}>{scored.movie.genres.join(' • ')}</Text>

      <View style={styles.viewerBreakdown}>
        {Object.entries(scored.perViewer).map(([id, val]) => (
          <Text key={id} style={styles.viewerLine}>
            {id}: {Math.round(val * 100)}%
          </Text>
        ))}
      </View>

      <Text style={styles.why}>Why this? {explanation}</Text>

      <View style={styles.buttonRow}>
        {autoFocus ? <DefaultFocus>{selectButton}</DefaultFocus> : selectButton}
        <FocusablePressable text="Veto" onSelect={onVeto} style={styles.vetoBtn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: scaledPixels(safeZones.titleSafe.horizontal),
    paddingVertical: scaledPixels(safeZones.titleSafe.vertical),
  },
  heading: {
    fontSize: scaledPixels(32),
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: scaledPixels(10),
  },
  timer: {
    fontSize: scaledPixels(22),
    color: colors.text,
    marginBottom: scaledPixels(20),
  },
  row: {
    flexDirection: 'row',
  },
  card: {
    width: scaledPixels(360),
    backgroundColor: colors.cardElevated,
    borderRadius: scaledPixels(12),
    padding: scaledPixels(24),
    marginRight: scaledPixels(24),
  },
  cardLabel: {
    fontSize: scaledPixels(16),
    color: colors.focus,
    fontWeight: 'bold',
    marginBottom: scaledPixels(8),
  },
  cardTitle: {
    fontSize: scaledPixels(28),
    color: colors.text,
    fontWeight: 'bold',
    marginBottom: scaledPixels(6),
  },
  cardScore: {
    fontSize: scaledPixels(22),
    color: colors.text,
    marginBottom: scaledPixels(6),
  },
  cardGenres: {
    fontSize: scaledPixels(16),
    color: colors.text,
    opacity: 0.7,
    marginBottom: scaledPixels(14),
  },
  viewerBreakdown: {
    marginBottom: scaledPixels(14),
  },
  viewerLine: {
    fontSize: scaledPixels(14),
    color: colors.text,
    opacity: 0.8,
  },
  why: {
    fontSize: scaledPixels(14),
    color: colors.text,
    opacity: 0.85,
    marginBottom: scaledPixels(20),
  },
  buttonRow: {
    flexDirection: 'row',
    gap: scaledPixels(12),
  },
  selectBtn: {},
  vetoBtn: {
    backgroundColor: '#7a1f1f',
  },
  resultBox: {
    marginTop: scaledPixels(40),
  },
  resultText: {
    fontSize: scaledPixels(30),
    color: colors.text,
    fontWeight: 'bold',
  },
});
