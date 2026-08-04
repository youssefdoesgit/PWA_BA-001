import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Vane } from '@/components/ui/agency';
import { Rise, useTypewriter } from '@/components/ui/motion';
import { notify, Tap } from '@/components/ui/press';
import { Card, Empty, Row, Rule, Screen, SectionTitle, Txt } from '@/components/ui/primitives';
import { DAY, dueLabel } from '@/lib/date';
import { useSession } from '@/lib/session';
import { isDone, openTasks, sortTasks, taskProgress, useDocket, useStore } from '@/lib/store';
import { vaneBriefing, vaneOnDone, vaneOnUndo, weeklyRate } from '@/lib/vane';
import { color, glyph, radius, space, subsystem } from '@/theme/tokens';
import type { BriefTone } from '@/lib/bric';
import type { Task, Track } from '@/lib/types';

const TONE: Record<BriefTone, string> = {
  urgent: color.expense,
  warn: color.warn,
  info: color.transfer,
  good: color.income,
};

const PRIORITY_TONE = [color.border, color.mustard, color.expense];

type Filter = 'all' | 'due' | 'active' | 'done';

const FILTERS: [Filter, string][] = [
  ['all', 'ALL'],
  ['due', 'DATED'],
  ['active', 'ACTIVE'],
  ['done', 'DONE'],
];

/** Deadline badge. Colour carries the urgency so the text can stay plain. */
function DueBadge({ due }: { due: number }) {
  const left = due - Date.now();
  const tone = left < 0 ? color.expense : left < 3 * DAY ? color.warn : color.textFaint;
  return (
    <Txt variant="micro" weight="bold" tone={tone}>
      {dueLabel(due).toUpperCase()}
    </Txt>
  );
}

function TaskRow({
  task,
  track,
  onOpen,
  onToggle,
  first,
}: {
  task: Task;
  track?: Track;
  onOpen: () => void;
  onToggle: () => void;
  first: boolean;
}) {
  const done = isDone(task);
  const progress = taskProgress(task);
  const total = task.steps.length;

  return (
    <Row
      style={[s.row, first ? null : { borderTopWidth: 1, borderTopColor: color.border }]}>
      {/* Priority runs down the left edge — readable without occupying a word. */}
      <View style={[s.priority, { backgroundColor: PRIORITY_TONE[task.priority] }]} />

      <Pressable hitSlop={10} onPress={onToggle} style={{ padding: 2 }}>
        <View
          style={[
            s.box,
            done && { backgroundColor: subsystem.desk, borderColor: subsystem.desk },
          ]}>
          {done && (
            <Txt variant="micro" weight="bold" tone={color.accentText}>
              ✓
            </Txt>
          )}
        </View>
      </Pressable>

      <Tap scale={0.995} weight="light" style={{ flex: 1, marginLeft: space.md }} onPress={onOpen}>
        <Txt
          variant="caption"
          weight={done ? 'regular' : 'bold'}
          dim={done}
          numberOfLines={2}
          style={done ? { textDecorationLine: 'line-through' } : undefined}>
          {task.title}
        </Txt>

        <Row style={{ gap: space.sm, marginTop: 3, flexWrap: 'wrap' }}>
          {track && (
            <Txt variant="micro" tone={track.color}>
              {`${track.icon} ${track.name.toUpperCase()}`}
            </Txt>
          )}
          {task.status === 'blocked' && (
            <Txt variant="micro" weight="bold" tone={color.warn}>
              BLOCKED
            </Txt>
          )}
          {task.status === 'active' && !done && (
            <Txt variant="micro" weight="bold" tone={subsystem.desk}>
              ACTIVE
            </Txt>
          )}
          {total > 0 && (
            <Txt variant="micro" faint>
              {`${Math.round(progress * total)}/${total} STEPS`}
            </Txt>
          )}
          {task.due !== undefined && !done && <DueBadge due={task.due} />}
        </Row>
      </Tap>

      <Txt variant="caption" tone={color.textFaint}>
        {glyph.arrow}
      </Txt>
    </Row>
  );
}

export default function Board() {
  const router = useRouter();
  const docket = useDocket();
  const toggleTask = useStore((s) => s.toggleTask);
  const say = useSession((s) => s.say);

  const [filter, setFilter] = useState<Filter>('all');

  const brief = vaneBriefing(docket);
  const greeting = useTypewriter(brief.greeting, 74);

  const trackById = useMemo(
    () => new Map(docket.tracks.map((t) => [t.id, t])),
    [docket.tracks]
  );

  const visible = useMemo(() => {
    const open = openTasks(docket);
    switch (filter) {
      case 'due':
        return sortTasks(open.filter((t) => t.due !== undefined));
      case 'active':
        return sortTasks(open.filter((t) => t.status === 'active'));
      case 'done':
        // Newest first, and capped — the board is for what is ahead of him.
        return docket.tasks
          .filter(isDone)
          .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
          .slice(0, 25);
      default:
        return sortTasks(open);
    }
  }, [docket, filter]);

  function flip(task: Task) {
    toggleTask(task.id);
    notify(isDone(task) ? 'warning' : 'success');
    say(
      isDone(task) ? vaneOnUndo(task.title) : vaneOnDone(task.title, weeklyRate(docket) + 1),
      { mood: isDone(task) ? 'idle' : 'happy', undo: () => toggleTask(task.id) }
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Rise>
          <Card label="vane" tint={TONE[brief.items[0]?.tone ?? 'good']}>
            <Row style={{ gap: space.md, alignItems: 'flex-start' }}>
              <Vane mood={brief.mood} size={46} />
              <View style={{ flex: 1 }}>
                <Txt variant="caption" style={{ lineHeight: 19, minHeight: 38 }}>
                  {greeting}
                </Txt>
              </View>
            </Row>

            <Rule />

            {brief.items.map((item, i) => (
              <Tap
                key={item.id}
                scale={0.99}
                weight="light"
                style={[
                  s.briefRow,
                  i > 0 ? { borderTopWidth: 1, borderTopColor: color.border } : null,
                ]}
                onPress={() => item.href && router.push(item.href as never)}>
                <View style={[s.dot, { backgroundColor: TONE[item.tone] }]} />
                <Txt variant="caption" style={{ flex: 1, marginLeft: space.sm, lineHeight: 17 }}>
                  {item.text}
                </Txt>
                <Txt variant="caption" tone={color.textFaint}>
                  {glyph.arrow}
                </Txt>
              </Tap>
            ))}
          </Card>
        </Rise>

        <Rise delay={60}>
          <SectionTitle>Board</SectionTitle>
          <Row style={{ gap: space.sm, marginBottom: space.sm }}>
            {FILTERS.map(([value, label]) => {
              const active = value === filter;
              return (
                <Pressable
                  key={value}
                  onPress={() => setFilter(value)}
                  style={[
                    s.filter,
                    active && {
                      borderColor: subsystem.desk,
                      backgroundColor: `${subsystem.desk}1A`,
                    },
                  ]}>
                  <Txt
                    variant="micro"
                    weight="bold"
                    spaced
                    tone={active ? subsystem.desk : color.textDim}>
                    {label}
                  </Txt>
                </Pressable>
              );
            })}
          </Row>
        </Rise>

        <Rise delay={110}>
          {visible.length === 0 ? (
            <Empty
              icon="▤"
              title={filter === 'done' ? 'Nothing closed yet' : 'Board is clear'}
              body={
                filter === 'done'
                  ? 'Finished items collect here so you can see the rate you are actually moving at.'
                  : 'Add something with the + button, or open RADAR and let VANE suggest what is worth chasing.'
              }
            />
          ) : (
            <Card style={{ padding: 0 }}>
              {visible.map((task, i) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  track={task.trackId ? trackById.get(task.trackId) : undefined}
                  first={i === 0}
                  onOpen={() => router.push({ pathname: '/task', params: { id: task.id } })}
                  onToggle={() => flip(task)}
                />
              ))}
            </Card>
          )}
        </Rise>
      </Screen>

      <Tap weight="heavy" scale={0.9} style={s.fab} onPress={() => router.push('/task')}>
        <Txt variant="title" weight="bold" tone={color.accentText}>
          +
        </Txt>
      </Tap>
    </View>
  );
}

const s = StyleSheet.create({
  briefRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm },
  dot: { width: 7, height: 7, borderRadius: 4 },
  filter: {
    paddingHorizontal: space.md,
    height: 30,
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  row: { alignItems: 'center', paddingVertical: space.md, paddingRight: space.md, paddingLeft: 0 },
  priority: { width: 3, alignSelf: 'stretch', marginRight: space.md },
  box: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: color.borderHi,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: space.lg,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: color.transfer,
    backgroundColor: subsystem.desk,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
