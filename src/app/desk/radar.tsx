import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { FileHeader, Stamp, VaneSays } from '@/components/ui/agency';
import { Rise } from '@/components/ui/motion';
import { notify, Tap } from '@/components/ui/press';
import { Button, Card, Empty, Row, Rule, Screen, SectionTitle, Txt } from '@/components/ui/primitives';
import { isRolling, monthsUntilWindow, windowLabel, type Lead, type Region } from '@/lib/leads';
import { useSession } from '@/lib/session';
import { useDocket, useStore } from '@/lib/store';
import { liveLeads, vaneCatalogueNote, vaneOnDismiss } from '@/lib/vane';
import { color, radius, space, subsystem } from '@/theme/tokens';
import type { LeadField } from '@/lib/types';

const FIELD_FILTERS: [LeadField | 'all', string][] = [
  ['all', 'ALL'],
  ['gamedev', 'GAME DEV'],
  ['competition', 'JAMS'],
  ['scholarship', 'MONEY'],
  ['learning', 'SKILLS'],
];

const REGION_FILTERS: [Region | 'all', string][] = [
  ['all', 'ANY'],
  ['global', 'GLOBAL'],
  ['us', 'US'],
  ['mena', 'MENA'],
];

const REGION_LABEL: Record<Region, string> = {
  global: 'GLOBAL',
  us: 'US ONLY',
  mena: 'MENA',
};

/** Copies without a dependency. Web-only, which is every device KEVLAR runs on. */
async function copy(text: string): Promise<boolean> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.clipboard) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function LeadCard({ lead, onRaise, onDismiss }: { lead: Lead; onRaise: () => void; onDismiss: () => void }) {
  const say = useSession((s) => s.say);
  const gap = monthsUntilWindow(lead);
  const open = isRolling(lead) || gap === 0;

  const tint = open ? subsystem.desk : gap <= 1 ? color.warn : color.border;

  return (
    <Card tint={`${tint}66`} style={{ marginBottom: space.md }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, paddingRight: space.sm }}>
          <Txt variant="body" weight="bold" spaced tone={tint === color.border ? color.text : tint}>
            {lead.name.toUpperCase()}
          </Txt>
          <Txt variant="micro" faint style={{ marginTop: 3 }}>
            {`${windowLabel(lead)} · ${REGION_LABEL[lead.region]} · ${lead.cost.toUpperCase()}`}
          </Txt>
        </View>
        {open && <Stamp text={isRolling(lead) ? 'open' : 'window open'} tone={subsystem.desk} angle={-6} />}
      </Row>

      <Rule />

      <Txt variant="caption" style={{ lineHeight: 19 }}>
        {lead.what}
      </Txt>
      <Txt variant="caption" dim style={{ lineHeight: 19, marginTop: space.sm }}>
        {lead.why}
      </Txt>

      <View style={s.meta}>
        <Txt variant="micro" faint style={{ lineHeight: 16 }}>
          {`WHEN · ${lead.windowNote}`}
        </Txt>
        <Txt variant="micro" faint style={{ lineHeight: 16, marginTop: 3 }}>
          {`WHO · ${lead.eligibility}`}
        </Txt>
      </View>

      <Tap
        scale={0.99}
        weight="light"
        style={s.search}
        onPress={async () => {
          const ok = await copy(lead.search);
          say(
            ok
              ? `Copied. Paste that into a search — I cannot look it up for you.`
              : `Search for: ${lead.search}`,
            { mood: 'idle' }
          );
        }}>
        <Txt variant="micro" weight="bold" tone={color.mustard} numberOfLines={2}>
          {`⌕ ${lead.search}`}
        </Txt>
        <Txt variant="micro" faint style={{ marginTop: 2 }}>
          TAP TO COPY
        </Txt>
      </Tap>

      <Row style={{ gap: space.sm, marginTop: space.md }}>
        <Button label="Raise" onPress={onRaise} style={{ flex: 1 }} />
        <Button label="Not for me" kind="ghost" onPress={onDismiss} style={{ flex: 1 }} />
      </Row>
    </Card>
  );
}

export default function Radar() {
  const router = useRouter();
  const docket = useDocket();
  const dismissLead = useStore((s) => s.dismissLead);
  const updateSettings = useStore((s) => s.updateSettings);
  const say = useSession((s) => s.say);

  const [field, setField] = useState<LeadField | 'all'>('all');
  const [region, setRegion] = useState<Region | 'all'>('all');

  const dismissed = docket.settings.dismissedLeads ?? [];

  const visible = useMemo(() => {
    const now = new Date();
    return liveLeads(docket)
      .filter((l) => field === 'all' || l.field === field)
      .filter((l) => region === 'all' || l.region === region)
      .sort((a, b) => {
        // Anything with a real window outranks the always-on entries — a
        // deadline is information, "this exists" is not.
        const ar = isRolling(a) ? 1 : 0;
        const br = isRolling(b) ? 1 : 0;
        if (ar !== br) return ar - br;
        return monthsUntilWindow(a, now) - monthsUntilWindow(b, now);
      });
  }, [docket, field, region]);

  return (
    <Screen>
      <Rise>
        <FileHeader
          title="Radar"
          code="DKT-002/R"
          subtitle="Things worth chasing, filed by when they open."
        />
      </Rise>

      <Rise delay={40}>
        <VaneSays mood="think" compact>
          {vaneCatalogueNote()}
        </VaneSays>
      </Rise>

      <Rise delay={90}>
        <SectionTitle>Filter</SectionTitle>
        <Row style={{ gap: space.sm, flexWrap: 'wrap' }}>
          {FIELD_FILTERS.map(([value, label]) => {
            const active = value === field;
            return (
              <Pressable
                key={value}
                onPress={() => setField(value)}
                style={[
                  s.chip,
                  active && { borderColor: subsystem.desk, backgroundColor: `${subsystem.desk}1A` },
                ]}>
                <Txt variant="micro" weight="bold" tone={active ? subsystem.desk : color.textDim}>
                  {label}
                </Txt>
              </Pressable>
            );
          })}
        </Row>
        <Row style={{ gap: space.sm, flexWrap: 'wrap', marginTop: space.sm }}>
          {REGION_FILTERS.map(([value, label]) => {
            const active = value === region;
            return (
              <Pressable
                key={value}
                onPress={() => setRegion(value)}
                style={[
                  s.chip,
                  active && { borderColor: color.mustard, backgroundColor: `${color.mustard}1A` },
                ]}>
                <Txt variant="micro" weight="bold" tone={active ? color.mustard : color.textDim}>
                  {label}
                </Txt>
              </Pressable>
            );
          })}
        </Row>
      </Rise>

      <Rise delay={140}>
        <SectionTitle>{`${visible.length} on radar`}</SectionTitle>

        {visible.length === 0 ? (
          <Empty
            icon="◌"
            title="Nothing matches"
            body="Loosen the filters, or restore what you have dismissed at the bottom of this screen."
          />
        ) : (
          visible.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onRaise={() => router.push({ pathname: '/task', params: { lead: lead.id } })}
              onDismiss={() => {
                dismissLead(lead.id);
                notify('warning');
                say(vaneOnDismiss(), { mood: 'idle' });
              }}
            />
          ))
        )}
      </Rise>

      {dismissed.length > 0 && (
        <Rise delay={200}>
          <SectionTitle>Dismissed</SectionTitle>
          <Card>
            <Txt variant="caption" dim style={{ lineHeight: 19 }}>
              {`${dismissed.length} ${dismissed.length === 1 ? 'lead is' : 'leads are'} hidden. Anything already raised onto the board is hidden too, and comes back if you delete the item.`}
            </Txt>
            <Button
              label="Restore all"
              kind="ghost"
              full
              style={{ marginTop: space.md }}
              onPress={() => {
                updateSettings({ dismissedLeads: [] });
                notify('success');
                say('Radar cleared. Everything is back on it.', { mood: 'idle' });
              }}
            />
          </Card>
        </Rise>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  chip: {
    paddingHorizontal: space.md,
    height: 30,
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  meta: {
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  search: {
    marginTop: space.md,
    padding: space.sm,
    borderWidth: 1,
    borderColor: `${color.mustard}44`,
    borderRadius: radius.md,
    backgroundColor: color.surfaceHi,
  },
});
