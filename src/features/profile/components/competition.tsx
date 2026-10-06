import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline, Rect } from 'react-native-svg';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Sticker } from '@/constants/theme';
import { SuitIcon } from '@/features/coinche/components/suit-icon';
import { plural } from '@/features/coinche/format';
import { percent } from '@/features/coinche/scoring';
import type { Rating } from '@/features/social/api';
import type { Game } from '@/features/coinche/types';
import {
  contractRates,
  weeklyActivity,
  type ContractBucket,
  type HeadToHead,
  type WeekActivity,
} from '@/features/stats/player-stats';
import { playerBadges, playerRecords, type Badge, type GameRecord, type PlayerRecords } from '@/features/stats/records';

const SUITS = ['hearts', 'spades', 'diamonds', 'clubs'] as const;

/** Cote Elo : valeur, meilleure cote, et courbe d'évolution. */
export function EloCard({ rating }: { rating: Rating }) {
  const [width, setWidth] = useState(0);
  const height = 56;
  const values = rating.history;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 20);
  const x = (i: number) => (i / Math.max(values.length - 1, 1)) * width;
  const y = (v: number) => 4 + (1 - (v - min) / span) * (height - 8);
  const delta = values.length > 1 ? values[values.length - 1] - values[values.length - 2] : 0;

  return (
    <View style={styles.elo}>
      <View style={styles.eloHeader}>
        <View>
          <ThemedText type="caption" themeColor="onPrimaryMuted">
            Cote
          </ThemedText>
          <View style={styles.eloValueRow}>
            <ThemedText type="title" themeColor="onPrimary">
              {rating.elo}
            </ThemedText>
            {delta !== 0 ? (
              <ThemedText type="smallBold" style={{ color: delta > 0 ? Colors.gold : Colors.teamAOnDark }}>
                {delta > 0 ? `+${delta}` : delta}
              </ThemedText>
            ) : null}
          </View>
        </View>
        <View style={styles.eloMeta}>
          <ThemedText type="small" themeColor="onPrimaryMuted">
            Meilleure {rating.bestElo}
          </ThemedText>
          <ThemedText type="small" themeColor="onPrimaryMuted">
            {rating.games} partie{rating.games > 1 ? 's' : ''} classée{rating.games > 1 ? 's' : ''}
          </ThemedText>
        </View>
      </View>
      {rating.games > 0 ? (
        <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
          {width > 0 ? (
            <Svg width={width} height={height}>
              <Polyline
                points={values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
                fill="none"
                stroke={Colors.gold}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <Circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={4} fill={Colors.gold} />
            </Svg>
          ) : null}
        </View>
      ) : (
        <ThemedText type="small" themeColor="onPrimaryMuted">
          La cote bouge sur les parties classées (à choisir au lancement, entre amis). Battre plus fort que toi et gagner
          largement rapporte plus. Les 10 premières font vite bouger la cote.
        </ThemedText>
      )}
    </View>
  );
}

/** Parties par semaine sur les 12 dernières semaines. */
export function ActivityChart({ weeks }: { weeks: WeekActivity[] }) {
  const [width, setWidth] = useState(0);
  const height = 64;
  const max = Math.max(1, ...weeks.map((w) => w.games));
  const gap = 4;
  const barWidth = width > 0 ? (width - gap * (weeks.length - 1)) / weeks.length : 0;
  const total = weeks.reduce((n, w) => n + w.games, 0);

  return (
    <Section title="Activité">
      <Card style={styles.activity}>
        <View style={styles.activityHeader}>
          <ThemedText type="smallBold">{plural(total, 'partie')} en 12 semaines</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            cette semaine : {weeks[weeks.length - 1]?.games ?? 0}
          </ThemedText>
        </View>
        <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
          {width > 0 ? (
            <Svg width={width} height={height}>
              {weeks.map((week, i) => {
                const h = week.games === 0 ? 3 : 6 + (week.games / max) * (height - 6);
                return (
                  <Rect
                    key={week.weekStart}
                    x={i * (barWidth + gap)}
                    y={height - h}
                    width={barWidth}
                    height={h}
                    rx={3}
                    fill={week.games === 0 ? Colors.surfaceMuted : i === weeks.length - 1 ? Colors.teamA : Colors.primary}
                  />
                );
              })}
            </Svg>
          ) : null}
        </View>
      </Card>
    </Section>
  );
}

/** Réussite des contrats par hauteur d'annonce. */
export function ContractRates({ buckets }: { buckets: ContractBucket[] }) {
  const used = buckets.filter((b) => b.taken > 0);
  if (used.length === 0) return null;
  return (
    <Section title="Contrats réussis">
      <Card style={styles.contracts}>
        {used.map((bucket) => {
          const rate = bucket.made / bucket.taken;
          return (
            <View key={bucket.label} style={styles.contractRow}>
              <ThemedText type="smallBold" style={styles.contractLabel}>
                {bucket.label}
              </ThemedText>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${rate * 100}%`, backgroundColor: rate >= 0.5 ? Colors.success : Colors.danger }]} />
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={styles.contractValue}>
                {percent(bucket.made, bucket.taken)} · {bucket.taken}
              </ThemedText>
            </View>
          );
        })}
      </Card>
    </Section>
  );
}

function RecordRow({ label, record, format }: { label: string; record: GameRecord | null; format: (v: number) => string }) {
  if (!record) return null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/game/[id]', params: { id: record.gameId } })}
      style={({ pressed }) => [styles.recordRow, pressed && styles.pressed]}>
      <Icon name="trophy" size={16} color={Colors.gold} />
      <ThemedText style={styles.recordLabel}>{label}</ThemedText>
      <ThemedText type="smallBold">{format(record.value)}</ThemedText>
      <Icon name="chevron-right" size={14} color={Colors.textTertiary} />
    </Pressable>
  );
}

export function RecordsList({ records }: { records: PlayerRecords }) {
  const any = records.biggestComeback || records.quickestWin || records.bestRound || records.highestScore;
  if (!any) return null;
  return (
    <Section title="Records">
      <Card style={styles.records}>
        <RecordRow label="Plus grosse remontée" record={records.biggestComeback} format={(v) => `${v} pts`} />
        <RecordRow label="Victoire la plus rapide" record={records.quickestWin} format={(v) => plural(v, 'mène')} />
        <RecordRow label="Plus grosse mène" record={records.bestRound} format={(v) => `+${v}`} />
        <RecordRow label="Plus gros score" record={records.highestScore} format={(v) => String(v)} />
        {records.fannies > 0 ? (
          <View style={styles.recordRow}>
            <Icon name="flame" size={16} color={Colors.teamA} />
            <ThemedText style={styles.recordLabel}>Fanny infligées</ThemedText>
            <ThemedText type="smallBold">{records.fannies}</ThemedText>
          </View>
        ) : null}
      </Card>
    </Section>
  );
}

/** Badges : gagnés en couleur, les autres grisés avec leur progression. */
export function BadgeGrid({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length;
  return (
    <Section title={`Badges · ${earned}/${badges.length}`}>
      <View style={styles.badges}>
        {badges.map((badge, index) => (
          <View key={badge.id} style={styles.badge} accessibilityLabel={`${badge.label} : ${badge.description}`}>
            <View style={[styles.medal, badge.earned ? styles.medalEarned : styles.medalLocked]}>
              <SuitIcon
                suit={SUITS[index % SUITS.length]}
                size={20}
                color={badge.earned ? (index % 2 === 0 ? Colors.teamA : Colors.ink) : Colors.textTertiary}
              />
            </View>
            <ThemedText type="smallBold" numberOfLines={1} style={[styles.center, !badge.earned && styles.locked]}>
              {badge.label}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.center}>
              {badge.description}
            </ThemedText>
            {!badge.earned && badge.progress > 0 ? (
              <View style={styles.badgeTrack}>
                <View style={[styles.badgeFill, { width: `${badge.progress * 100}%` }]} />
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </Section>
  );
}

type PlayerCompetitionProps = {
  games: Game[];
  playerId: string;
  rating?: Rating;
};

/** Tout le bloc compétition d'un profil : cote, activité, contrats, records, badges. */
export function PlayerCompetition({ games, playerId, rating }: PlayerCompetitionProps) {
  const weeks = weeklyActivity(games, playerId);
  const buckets = contractRates(games, playerId);
  const records = playerRecords(games, playerId);
  const badges = playerBadges(games, playerId);
  return (
    <>
      {rating ? <EloCard rating={rating} /> : null}
      {games.length > 0 ? <ActivityChart weeks={weeks} /> : null}
      <ContractRates buckets={buckets} />
      <RecordsList records={records} />
      <BadgeGrid badges={badges} />
    </>
  );
}

/** Mon bilan avec et contre un joueur (sur son profil). */
export function HeadToHeadCard({ h2h, name }: { h2h: HeadToHead; name: string }) {
  if (h2h.together.games === 0 && h2h.against.games === 0) return null;
  return (
    <Section title={`Toi et ${name}`}>
      <View style={styles.h2h}>
        <View style={styles.h2hTile}>
          <ThemedText type="caption" themeColor="textSecondary">
            Ensemble
          </ThemedText>
          <ThemedText type="heading">
            {h2h.together.wins}-{h2h.together.games - h2h.together.wins}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {plural(h2h.together.games, 'partie')}
          </ThemedText>
        </View>
        <View style={styles.h2hTile}>
          <ThemedText type="caption" themeColor="textSecondary">
            Face à face
          </ThemedText>
          <ThemedText type="heading">
            {h2h.against.wins}-{h2h.against.games - h2h.against.wins}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {plural(h2h.against.games, 'partie')}
          </ThemedText>
        </View>
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  elo: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xlarge,
    padding: Spacing.three + Spacing.one,
    gap: Spacing.three,
    ...Sticker,
  },
  eloHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  eloValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  eloMeta: {
    alignItems: 'flex-end',
  },
  activity: {
    gap: Spacing.three,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contracts: {
    gap: Spacing.two + Spacing.one,
  },
  contractRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
  },
  contractLabel: {
    width: 64,
  },
  track: {
    flex: 1,
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  contractValue: {
    width: 72,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  records: {
    paddingVertical: Spacing.one,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    minHeight: 44,
  },
  recordLabel: {
    flex: 1,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.7,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  badge: {
    flexBasis: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 2,
    padding: Spacing.two,
    borderRadius: Radius.large,
    backgroundColor: Colors.surface,
  },
  medal: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  medalEarned: {
    backgroundColor: Colors.gold,
    ...Sticker,
  },
  medalLocked: {
    backgroundColor: Colors.surfaceMuted,
  },
  locked: {
    color: Colors.textSecondary,
  },
  center: {
    textAlign: 'center',
  },
  badgeTrack: {
    alignSelf: 'stretch',
    height: 4,
    marginTop: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    overflow: 'hidden',
  },
  badgeFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  h2h: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  h2hTile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    padding: Spacing.three,
    borderRadius: Radius.large,
    backgroundColor: Colors.surface,
    ...Sticker,
  },
});
