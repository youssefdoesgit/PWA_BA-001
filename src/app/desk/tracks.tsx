import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FieldLabel, FileHeader, LeaderRow } from '@/components/ui/agency';
import { Rise } from '@/components/ui/motion';
import { notify, Tap } from '@/components/ui/press';
import { Bar, Button, Card, Empty, Row, Screen, SectionTitle, Txt } from '@/components/ui/primitives';
import { useSession } from '@/lib/session';
import { isDone, loadByTrack, useDocket, useStore } from '@/lib/store';
import { color, glyph, radius, space, subsystem, swatch } from '@/theme/tokens';
import type { LeadField } from '@/lib/types';

const ICONS = ['🎓', '🎮', '📚', '🏁', '🛠️', '✍️', '🎨', '🧪', '💼', '🌍'];

const FIELDS: [LeadField, string][] = [
  ['gamedev', 'GAME DEV'],
  ['scholarship', 'SCHOLARSHIP'],
  ['competition', 'COMPETITION'],
  ['learning', 'LEARNING'],
  ['personal', 'PERSONAL'],
];

export default function Tracks() {
  const router = useRouter();
  const docket = useDocket();
  const addTrack = useStore((s) => s.addTrack);
  const removeTrack = useStore((s) => s.removeTrack);
  const say = useSession((s) => s.say);

  const [drafting, setDrafting] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [field, setField] = useState<LeadField>('gamedev');

  const load = useMemo(() => loadByTrack(docket), [docket]);
  const doneByTrack = useMemo(() => {
    const out = new Map<string, number>();
    for (const t of docket.tasks) {
      if (!isDone(t) || !t.trackId) continue;
      out.set(t.trackId, (out.get(t.trackId) ?? 0) + 1);
    }
    return out;
  }, [docket.tasks]);

  function create() {
    const clean = name.trim();
    if (!clean) return;
    addTrack({
      name: clean,
      icon,
      field,
      color: swatch[docket.tracks.length % swatch.length],
    });
    notify('success');
    say(`"${clean}" is a track now. Put something on it.`, { mood: 'idle' });
    setName('');
    setDrafting(false);
  }

  return (
    <Screen>
      <Rise>
        <FileHeader
          title="Tracks"
          code="DKT-002/T"
          subtitle="Long-running areas of effort. Everything on the board files under one of these."
        />
      </Rise>

      <Rise delay={50}>
        {docket.tracks.length === 0 ? (
          <Empty
            icon="▨"
            title="No tracks"
            body="Tracks let VANE tell the difference between a quiet week and an ambition you have quietly dropped."
          />
        ) : (
          docket.tracks.map((track) => {
            const open = load.get(track.id) ?? 0;
            const done = doneByTrack.get(track.id) ?? 0;
            const total = open + done;

            return (
              <Card key={track.id} tint={`${track.color}55`} style={{ marginBottom: space.sm }}>
                <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Row style={{ gap: space.md, alignItems: 'center', flex: 1 }}>
                    <Txt variant="title">{track.icon}</Txt>
                    <View style={{ flex: 1 }}>
                      <Txt variant="body" weight="bold" spaced tone={track.color}>
                        {track.name.toUpperCase()}
                      </Txt>
                      <Txt variant="micro" faint style={{ marginTop: 2 }}>
                        {FIELDS.find(([f]) => f === track.field)?.[1] ?? track.field.toUpperCase()}
                      </Txt>
                    </View>
                  </Row>
                  <Pressable
                    hitSlop={12}
                    onPress={() => {
                      removeTrack(track.id);
                      notify('warning');
                      say(
                        `"${track.name}" retired. Its items are still on the board, just unfiled.`,
                        { mood: 'warn' }
                      );
                    }}>
                    <Txt variant="caption" tone={color.textFaint}>
                      ✕
                    </Txt>
                  </Pressable>
                </Row>

                <View style={{ marginTop: space.md }}>
                  <LeaderRow label="Open" value={String(open)} tone={open > 0 ? track.color : color.textFaint} />
                  <LeaderRow label="Closed" value={String(done)} tone={color.income} />
                </View>

                {total > 0 && (
                  <View style={{ marginTop: space.sm }}>
                    <Bar pct={done / total} tint={track.color} segments={20} />
                  </View>
                )}

                <Tap
                  scale={0.98}
                  weight="light"
                  style={s.add}
                  onPress={() =>
                    router.push({ pathname: '/task', params: { track: track.id } })
                  }>
                  <Txt variant="micro" weight="bold" spaced tone={track.color}>
                    {`${glyph.arrow} ADD TO THIS TRACK`}
                  </Txt>
                </Tap>
              </Card>
            );
          })
        )}
      </Rise>

      <Rise delay={110}>
        <SectionTitle>New track</SectionTitle>

        {!drafting ? (
          <Button label="Add a track" kind="ghost" full onPress={() => setDrafting(true)} />
        ) : (
          <Card>
            <FieldLabel>Name</FieldLabel>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Internships, Portfolio, Arabic…"
              placeholderTextColor={color.textFaint}
              style={s.input}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={create}
            />

            <FieldLabel>Icon</FieldLabel>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: space.sm, paddingBottom: space.md }}
              style={{ flexGrow: 0 }}>
              {ICONS.map((ic) => (
                <Pressable
                  key={ic}
                  onPress={() => setIcon(ic)}
                  style={[
                    s.iconTile,
                    ic === icon && {
                      borderColor: subsystem.desk,
                      backgroundColor: `${subsystem.desk}1A`,
                    },
                  ]}>
                  <Txt variant="lead">{ic}</Txt>
                </Pressable>
              ))}
            </ScrollView>

            <FieldLabel>Kind</FieldLabel>
            <Row style={{ gap: space.sm, flexWrap: 'wrap', marginBottom: space.md }}>
              {FIELDS.map(([value, label]) => {
                const active = value === field;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setField(value)}
                    style={[
                      s.chip,
                      active && {
                        borderColor: subsystem.desk,
                        backgroundColor: `${subsystem.desk}1A`,
                      },
                    ]}>
                    <Txt
                      variant="micro"
                      weight="bold"
                      tone={active ? subsystem.desk : color.textDim}>
                      {label}
                    </Txt>
                  </Pressable>
                );
              })}
            </Row>

            <Txt variant="micro" faint style={{ marginBottom: space.md, lineHeight: 16 }}>
              Kind decides which catalogue leads VANE considers relevant to this track.
            </Txt>

            <Row style={{ gap: space.sm }}>
              <Button
                label="Cancel"
                kind="ghost"
                onPress={() => {
                  setDrafting(false);
                  setName('');
                }}
                style={{ flex: 1 }}
              />
              <Button label="Create" onPress={create} disabled={!name.trim()} style={{ flex: 1 }} />
            </Row>
          </Card>
        )}
      </Rise>
    </Screen>
  );
}

const s = StyleSheet.create({
  add: {
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: color.border,
    alignItems: 'center',
  },
  input: {
    height: 46,
    borderRadius: radius.md,
    backgroundColor: color.surfaceHi,
    borderWidth: 1,
    borderColor: color.border,
    paddingHorizontal: space.md,
    color: color.text,
    fontSize: 16,
    marginBottom: space.md,
  },
  iconTile: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    backgroundColor: color.surfaceHi,
  },
  chip: {
    paddingHorizontal: space.md,
    height: 32,
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surfaceHi,
  },
});
