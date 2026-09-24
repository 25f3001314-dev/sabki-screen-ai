import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Image, StyleSheet, View, Text } from 'react-native';
import { DefaultFocus, SpatialNavigationFocusableView, SpatialNavigationRoot } from 'react-tv-space-navigation';
import { CompositeNavigationProp, DrawerActions, useIsFocused, useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { scaledPixels } from '../hooks/useScale';
import { safeZones } from '../theme';
import { colors } from '../theme/colors';
import { useMenuContext } from '../components/MenuContext';
import FocusablePressable from '../components/FocusablePressable';
import DotThrobber from '../components/DotThrobber';
import { buildExplanationRequest, FALLBACK_EXPLANATION, fetchMovieExplanation } from '../services/bedrockExplanation';
import { Viewer, Movie, SlateCard, rankMovies, buildSlate, updateFairnessLedger } from '../engine/groupEngine';
import ScreenTopControls from '../components/ScreenTopControls';
import { DrawerParamList } from '../navigation/types';
import { RootStackParamList } from '../navigation/types';
import demoCatalog from '../data/demoCatalog.json';

// ---- MVP demo data (baad me real catalogue se replace karna) ----

const INITIAL_VIEWERS: Viewer[] = [
  { id: 'amit', name: 'Amit', prefs: { SciFi: 0.9, Comedy: 0.6, Drama: 0.3, Action: 0.7 } },
  { id: 'priya', name: 'Priya', prefs: { Comedy: 0.9, Drama: 0.75, SciFi: 0.5, Action: 0.3 } },
  { id: 'rahul', name: 'Rahul', prefs: { Action: 0.9, SciFi: 0.8, Horror: 0.0, Comedy: 0.5 } },
];

// Demo: jab tak baaki movies ki streams nahi hain, pehli 4 real clips reuse hoti hain
const SAMPLE_VIDEOS = (demoCatalog as Movie[]).slice(0, 4).map((m) => m.movie ?? '');
const CATALOGUE: Movie[] = (demoCatalog as Movie[]).map((m, i) => ({
  ...m,
  movie: m.movie ?? SAMPLE_VIDEOS[i % SAMPLE_VIDEOS.length],
}));

const SESSION_SECONDS = 120;
const SELECTION_TRANSITION_MS = 2500;
const DEMO_POSTER = require('../assets/images/movie.png');

type DecisionNavigationProp = CompositeNavigationProp<
  DrawerNavigationProp<DrawerParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function DecisionScreen() {
  const navigation = useNavigation<DecisionNavigationProp>();
  const { isOpen: isMenuOpen, toggleMenu } = useMenuContext();
  const isScreenFocused = useIsFocused();
  const isActive = isScreenFocused && !isMenuOpen;

  const [viewers, setViewers] = useState<Viewer[]>(INITIAL_VIEWERS);
  const [vetoedIds, setVetoedIds] = useState<string[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_SECONDS);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  // 2-minute decision timer
  useEffect(() => {
    if (selectedMovie) return;
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, selectedMovie]);

  useEffect(() => {
    if (!selectedMovie) return;
    const timer = setTimeout(() => {
      if (!selectedMovie.movie) return;
      navigation.navigate('Player', {
        movie: selectedMovie.movie,
        headerImage: selectedMovie.headerImage ?? '',
      });
    }, SELECTION_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [navigation, selectedMovie]);

  const slate: SlateCard[] = useMemo(() => {
    const ranked = rankMovies(CATALOGUE, viewers, { vetoedMovieIds: vetoedIds });
    return buildSlate(ranked);
  }, [viewers, vetoedIds]);

  useEffect(() => {
    let cancelled = false;
    const runtime = globalThis as unknown as {
      AbortController?: new () => {
        signal: { readonly aborted: boolean };
        abort: () => void;
      };
    };
    const controller = runtime.AbortController ? new runtime.AbortController() : undefined;

    const loadExplanations = async () => {
      const results = await Promise.all(
        slate.map(async (card, index) => {
          const explanation = await fetchMovieExplanation(
            buildExplanationRequest(card, viewers, index + 1),
            controller?.signal,
          );
          return [card.scored.movie.id, explanation] as const;
        }),
      );

      if (cancelled || controller?.signal.aborted) return;
      setExplanations((previous) => ({
        ...previous,
        ...Object.fromEntries(results.filter((entry): entry is [string, string] => entry[1] !== null)),
      }));
    };

    void loadExplanations();
    return () => {
      cancelled = true;
      controller?.abort();
    };
  }, [slate, viewers]);

  const handleVeto = useCallback((movieId: string) => {
    setVetoedIds((prev) => [...prev, movieId]);
  }, []);

  const handleSelect = useCallback((card: SlateCard) => {
    setSelectedMovie(card.scored.movie);
    setViewers((prev) => updateFairnessLedger(prev, card.scored));
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <SpatialNavigationRoot isActive={isActive}>
      <View style={styles.container}>
        <ScreenTopControls
          onBack={() => navigation.navigate('Home')}
          onMenu={() => {
            navigation.dispatch(DrawerActions.openDrawer());
            toggleMenu(true);
          }}
        />
        <View style={styles.headerRow}>
          <View>
            <Text selectable={false} style={styles.eyebrow}>WATCH TOGETHER</Text>
            <Text selectable={false} style={styles.heading}>What should we watch?</Text>
            <Text selectable={false} style={styles.subheading}>A pick everyone can get behind.</Text>
          </View>
          {!selectedMovie && (
            <View style={styles.timerPill}>
              <Text style={styles.timerLabel}>DECISION TIME</Text>
              <Text style={styles.timer}>
                ⏱ {minutes}:{seconds}
              </Text>
            </View>
          )}
        </View>

        {selectedMovie ? (
          <View style={styles.resultBox}>
            <Image source={getPosterSource(selectedMovie)} style={styles.selectionPoster} />
            <Text style={styles.resultText}>Chuna gaya: {selectedMovie.title}</Text>
            <DotThrobber />
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

function getPosterSource(movie: Movie) {
  return movie.headerImage ? { uri: movie.headerImage } : DEMO_POSTER;
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

  const selectButton = <FocusablePressable text="Select" onSelect={onSelect} style={styles.selectBtn} focusedStyle={styles.selectBtnFocused} />;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardLabel}>{label}</Text>
        <View style={styles.matchPill}>
          <Text style={styles.cardScore}>{scored.matchPercent}%</Text>
          <Text style={styles.matchLabel}>MATCH</Text>
        </View>
      </View>
      <Text style={styles.cardTitle}>{scored.movie.title}</Text>
      <Text style={styles.cardGenres}>{scored.movie.genres.join('  •  ')}</Text>

      <View style={styles.viewerBreakdown}>
        <Text style={styles.breakdownTitle}>GROUP MATCH</Text>
        {Object.entries(scored.perViewer).map(([id, val]) => (
          <View key={id} style={styles.viewerLine}>
            <Text style={styles.viewerName}>{id}</Text>
            <Text style={styles.viewerScore}>{Math.round(val * 100)}%</Text>
          </View>
        ))}
      </View>

      <View style={styles.whyPanel}>
        <Text style={styles.whyLabel}>WHY THIS PICK</Text>
        <Text style={styles.why}>{explanation}</Text>
      </View>

      <View style={styles.buttonRow}>
        {autoFocus ? <DefaultFocus>{selectButton}</DefaultFocus> : selectButton}
        <FocusablePressable text="Veto" onSelect={onVeto} style={styles.vetoBtn} focusedStyle={styles.vetoBtnFocused} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090B10',
    paddingHorizontal: scaledPixels(safeZones.titleSafe.horizontal),
    paddingVertical: scaledPixels(safeZones.titleSafe.vertical),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: scaledPixels(28),
    marginTop: scaledPixels(60),
  },
  eyebrow: {
    color: '#7DE2D1',
    fontSize: scaledPixels(13),
    fontWeight: '700',
    letterSpacing: scaledPixels(1.5),
    marginBottom: scaledPixels(7),
  },
  heading: {
    fontSize: scaledPixels(36),
    fontWeight: '800',
    color: colors.text,
  },
  subheading: {
    color: '#9BA4B5',
    fontSize: scaledPixels(16),
    marginTop: scaledPixels(7),
  },
  timerPill: {
    alignItems: 'flex-end',
    backgroundColor: '#151A24',
    borderColor: '#2C3546',
    borderRadius: scaledPixels(12),
    borderWidth: scaledPixels(1),
    paddingHorizontal: scaledPixels(18),
    paddingVertical: scaledPixels(11),
  },
  timer: {
    fontSize: scaledPixels(23),
    fontWeight: '800',
    color: colors.text,
  },
  timerLabel: {
    color: '#7C8799',
    fontSize: scaledPixels(10),
    fontWeight: '700',
    letterSpacing: scaledPixels(1),
    marginBottom: scaledPixels(3),
  },
  row: {
    gap: scaledPixels(16),
    flexDirection: 'row',
    width: '100%',
  },
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#141C2E',
    borderColor: '#2A3140',
    borderRadius: scaledPixels(16),
    borderWidth: scaledPixels(1),
    padding: scaledPixels(22),
    marginRight: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: scaledPixels(8) },
    shadowOpacity: 0.3,
    shadowRadius: scaledPixels(16),
    elevation: 5,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: scaledPixels(42),
  },
  cardLabel: {
    color: '#7DE2D1',
    fontSize: scaledPixels(14),
    fontWeight: '800',
    maxWidth: '60%',
    textTransform: 'uppercase',
  },
  matchPill: {
    alignItems: 'flex-end',
    backgroundColor: '#203E3E',
    borderRadius: scaledPixels(9),
    paddingHorizontal: scaledPixels(10),
    paddingVertical: scaledPixels(6),
  },
  cardTitle: {
    fontSize: scaledPixels(29),
    color: colors.text,
    fontWeight: '800',
    marginTop: scaledPixels(12),
  },
  cardScore: {
    color: '#A8FFF0',
    fontSize: scaledPixels(18),
    fontWeight: '800',
  },
  matchLabel: {
    color: '#7DE2D1',
    fontSize: scaledPixels(9),
    fontWeight: '700',
    letterSpacing: scaledPixels(0.8),
  },
  cardGenres: {
    color: '#A6AFBE',
    fontSize: scaledPixels(14),
    marginTop: scaledPixels(7),
  },
  viewerBreakdown: {
    backgroundColor: '#10141C',
    borderRadius: scaledPixels(10),
    marginTop: scaledPixels(20),
    marginBottom: scaledPixels(14),
    padding: scaledPixels(12),
  },
  breakdownTitle: {
    color: '#737F92',
    fontSize: scaledPixels(10),
    fontWeight: '800',
    letterSpacing: scaledPixels(1),
    marginBottom: scaledPixels(7),
  },
  viewerLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: scaledPixels(4),
  },
  viewerName: {
    color: '#D5DBE5',
    fontSize: scaledPixels(14),
  },
  viewerScore: {
    color: '#FFFFFF',
    fontSize: scaledPixels(14),
    fontWeight: '700',
  },
  whyPanel: {
    backgroundColor: '#202631',
    borderLeftColor: '#F5B971',
    borderLeftWidth: scaledPixels(3),
    borderRadius: scaledPixels(8),
    marginBottom: scaledPixels(20),
    padding: scaledPixels(12),
  },
  whyLabel: {
    color: '#F5B971',
    fontSize: scaledPixels(10),
    fontWeight: '800',
    letterSpacing: scaledPixels(1),
    marginBottom: scaledPixels(6),
  },
  why: {
    color: '#D6DCE5',
    fontSize: scaledPixels(14),
    lineHeight: scaledPixels(19),
  },
  buttonRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: scaledPixels(20),
    justifyContent: 'space-between',
  },
  selectBtn: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: scaledPixels(16),
  },
  vetoBtn: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#B3273B',
    borderColor: '#B3273B',
    paddingHorizontal: scaledPixels(16),
  },
  vetoBtnFocused: {
    backgroundColor: '#E5495F',
    borderColor: '#E5495F',
    transform: [{ scale: 1.12 }],
    shadowColor: '#FF6B80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: scaledPixels(24),
    elevation: 16,
  },
  selectBtnFocused: {
    transform: [{ scale: 1.12 }],
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: scaledPixels(24),
    elevation: 16,
  },
  resultBox: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: scaledPixels(40),
  },
  selectionPoster: {
    borderColor: '#2A3140',
    borderRadius: scaledPixels(14),
    borderWidth: scaledPixels(1),
    height: scaledPixels(210),
    marginBottom: scaledPixels(22),
    resizeMode: 'cover',
    width: scaledPixels(350),
  },
  resultText: {
    fontSize: scaledPixels(34),
    color: colors.text,
    fontWeight: '800',
    textAlign: 'center',
  },
});
