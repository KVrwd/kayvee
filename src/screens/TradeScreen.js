import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useSession } from '../context/SessionContext';
import { typography } from '../theme/typography';
import ScreenContainer from '../components/ScreenContainer';
import TickChart from '../components/TickChart';
import CountdownRunButton from '../components/CountdownRunButton';
import { derivSocket } from '../services/derivSocket';
import { ALL_SYMBOLS, CONTRACT_TYPES, DURATION_UNIT_LABELS } from '../services/symbols';
import { STRATEGIES, STRATEGY_DISCLAIMER, movingAverageSignal, rsiSignal } from '../services/strategies';
import { sanitizeStakeInput } from '../services/sanitize';

const MAX_POINTS = 60;
const PROPOSAL_DEBOUNCE_MS = 600;

export default function TradeScreen() {
  const { theme, radius } = useTheme();
  const { activeAccount } = useSession();

  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [symbolCode, setSymbolCode] = useState('R_10');
  const [contractTypeCode, setContractTypeCode] = useState('CALL_PUT');
  const [callIndex, setCallIndex] = useState(0);
  const [stake, setStake] = useState('1');
  const [durationValue, setDurationValue] = useState('5');
  const [durationUnit, setDurationUnit] = useState('t');
  const [barrier, setBarrier] = useState('5');
  const [strategyId, setStrategyId] = useState('manual');

  const [prices, setPrices] = useState([]);
  const [proposal, setProposal] = useState(null);
  const [proposalError, setProposalError] = useState('');
  const [buying, setBuying] = useState(false);
  const [history, setHistory] = useState([]);
  const [banner, setBanner] = useState(null);

  const contractType = CONTRACT_TYPES.find((c) => c.code === contractTypeCode) ?? CONTRACT_TYPES[0];
  const symbol = ALL_SYMBOLS.find((s) => s.code === symbolCode);

  useEffect(() => {
    derivSocket.connect();
    const unsub = derivSocket.onConnectionChange(setConnectionStatus);
    return unsub;
  }, []);

  // keep the duration unit valid whenever the contract type changes
  useEffect(() => {
    if (!contractType.durationUnits.includes(durationUnit)) {
      setDurationUnit(contractType.durationUnits[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractTypeCode]);

  // ---- live ticks for the selected symbol ----
  useFocusEffect(
    useCallback(() => {
      setPrices([]);
      const unsub = derivSocket.subscribeTicks(symbolCode, (tick) => {
        setPrices((prev) => [...prev, tick.quote].slice(-MAX_POINTS));
      });
      return unsub;
    }, [symbolCode])
  );

  // ---- transaction history (best effort) ----
  const refreshHistory = useCallback(() => {
    derivSocket
      .profitTable({ limit: 15 })
      .then((res) => {
        const rows = res?.profit_table?.transactions ?? [];
        setHistory(
          rows.map((t) => ({
            id: String(t.contract_id ?? t.transaction_id),
            label: t.shortcode || t.longcode || 'Contract',
            profit: Number(t.sell_price ?? 0) - Number(t.buy_price ?? 0),
          }))
        );
      })
      .catch(() => {});
  }, []);

  useFocusEffect(useCallback(() => { refreshHistory(); }, [refreshHistory]));

  // ---- proposal (live quote), debounced on every relevant change ----
  const proposalParams = useMemo(() => {
    const amount = Number.parseFloat(stake) || 0;
    const duration = Number.parseInt(durationValue, 10) || 0;
    const call = contractType.calls[callIndex];
    const params = {
      amount,
      basis: 'stake',
      contract_type: call,
      currency: activeAccount?.currency || 'USD',
      duration,
      duration_unit: durationUnit,
      symbol: symbolCode,
    };
    if (contractType.needsBarrier) {
      params.barrier = contractType.digitBarrier ? String(barrier) : barrier;
    }
    return params;
  }, [stake, durationValue, durationUnit, contractType, callIndex, symbolCode, barrier, activeAccount]);

  const resetToken = JSON.stringify(proposalParams);
  const timerCleanupRef = useRef(null);

  useEffect(() => {
    setProposal(null);
    setProposalError('');
    if (!symbol?.enabled) return undefined;
    if (!proposalParams.amount || !proposalParams.duration) return undefined;
    if (connectionStatus !== 'open') return undefined;

    const timer = setTimeout(() => {
      const unsub = derivSocket.subscribeProposal(proposalParams, (data, err) => {
        if (err) {
          setProposalError(err.message || 'Could not get a quote for this setup.');
          setProposal(null);
          return;
        }
        setProposalError('');
        setProposal(data);
      });
      timerCleanupRef.current = unsub;
    }, PROPOSAL_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      if (timerCleanupRef.current) timerCleanupRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken, connectionStatus]);

  const handleSelectSymbol = (s) => {
    if (!s.enabled) {
      Alert.alert('Not yet established', `${s.label} isn't available to trade yet.`);
      return;
    }
    setSymbolCode(s.code);
  };

  const handleRun = async () => {
    if (!activeAccount) {
      Alert.alert('Link an account', 'Link a Deriv account from the Accounts screen before trading.');
      return;
    }
    if (!proposal?.id) {
      Alert.alert('No quote yet', 'Wait for a live quote before running this trade.');
      return;
    }
    if (connectionStatus !== 'open') {
      Alert.alert('Interrupted', 'The connection was interrupted - reconnect and try again.');
      return;
    }

    setBuying(true);
    try {
      const result = await derivSocket.buy(proposal.id, proposal.ask_price);
      const contractId = result?.buy?.contract_id;
      setBanner({ type: 'success', text: 'Trade placed.' });

      if (contractId) {
        const unsub = derivSocket.subscribeContract(contractId, (poc) => {
          if (poc.is_sold) {
            const profit = Number(poc.profit ?? 0);
            setHistory((prev) => [
              { id: String(contractId), label: poc.display_name || symbol?.label || symbolCode, profit },
              ...prev,
            ]);
            setBanner({
              type: profit >= 0 ? 'success' : 'danger',
              text: profit >= 0 ? `Won ${profit.toFixed(2)}` : `Lost ${Math.abs(profit).toFixed(2)}`,
            });
            unsub();
          }
        });
      }
    } catch (e) {
      setBanner({ type: 'danger', text: e.message || 'Could not place that trade.' });
    } finally {
      setBuying(false);
    }
  };

  const signal =
    strategyId === 'trend' ? movingAverageSignal(prices) : strategyId === 'reversion' ? rsiSignal(prices) : null;

  return (
    <ScreenContainer>
      <Text style={[typography.h2, { color: theme.textPrimary, marginTop: 8, marginBottom: 4 }]}>Trade</Text>
      <Text style={[typography.caption, { color: theme.textSecondary, marginBottom: 16 }]}>
        {activeAccount ? `${activeAccount.nickname} - ${activeAccount.accountType === 'demo' ? 'Demo' : 'Real'}` : 'No account linked'}
      </Text>

      {banner && (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: banner.type === 'success' ? theme.success + '22' : theme.danger + '22',
              borderColor: banner.type === 'success' ? theme.success : theme.danger,
              borderRadius: radius.md,
            },
          ]}
        >
          <Text style={{ color: banner.type === 'success' ? theme.success : theme.danger, fontWeight: '700' }}>
            {banner.text}
          </Text>
        </View>
      )}

      <SectionLabel theme={theme} text="Market" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {ALL_SYMBOLS.map((s) => (
          <Chip
            key={s.code}
            label={s.label}
            active={s.code === symbolCode}
            faded={!s.enabled}
            theme={theme}
            radius={radius}
            onPress={() => handleSelectSymbol(s)}
          />
        ))}
      </ScrollView>

      <View style={{ marginTop: 12 }}>
        <TickChart prices={prices} live={connectionStatus === 'open'} />
      </View>

      <SectionLabel theme={theme} text="Contract type" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {CONTRACT_TYPES.map((c) => (
          <Chip
            key={c.code}
            label={c.label}
            active={c.code === contractTypeCode}
            theme={theme}
            radius={radius}
            onPress={() => { setContractTypeCode(c.code); setCallIndex(0); }}
          />
        ))}
      </ScrollView>

      <View style={styles.pairRow}>
        {contractType.callLabels.map((label, idx) => (
          <Pressable
            key={label}
            onPress={() => setCallIndex(idx)}
            style={[
              styles.pairButton,
              {
                backgroundColor: callIndex === idx ? theme.buttonPrimary : theme.surface,
                borderColor: theme.surfaceBorder,
                borderRadius: radius.md,
              },
            ]}
          >
            <Text style={[typography.button, { color: callIndex === idx ? theme.buttonPrimaryText : theme.textPrimary }]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {contractType.needsBarrier && (
        <>
          <SectionLabel theme={theme} text={contractType.digitBarrier ? 'Digit' : 'Barrier offset'} />
          {contractType.digitBarrier ? (
            <View style={styles.digitRow}>
              {Array.from({ length: 10 }, (_, d) => d).map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setBarrier(String(d))}
                  style={[
                    styles.digitButton,
                    {
                      backgroundColor: barrier === String(d) ? theme.buttonPrimary : theme.surface,
                      borderColor: theme.surfaceBorder,
                      borderRadius: radius.sm,
                    },
                  ]}
                >
                  <Text style={{ color: barrier === String(d) ? theme.buttonPrimaryText : theme.textPrimary, fontWeight: '700' }}>
                    {d}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <TextInput
              value={barrier}
              onChangeText={setBarrier}
              placeholder="+0.10"
              placeholderTextColor={theme.textTertiary}
              style={[styles.input, inputTheme(theme, radius)]}
            />
          )}
        </>
      )}

      <View style={styles.row2}>
        <View style={{ flex: 1 }}>
          <SectionLabel theme={theme} text="Stake" />
          <TextInput
            value={stake}
            onChangeText={(t) => setStake(sanitizeStakeInput(t))}
            keyboardType="decimal-pad"
            placeholder="1.00"
            placeholderTextColor={theme.textTertiary}
            style={[styles.input, inputTheme(theme, radius)]}
          />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <SectionLabel theme={theme} text="Duration" />
          <TextInput
            value={durationValue}
            onChangeText={(t) => setDurationValue(t.replace(/[^0-9]/g, '').slice(0, 5))}
            keyboardType="number-pad"
            placeholder="5"
            placeholderTextColor={theme.textTertiary}
            style={[styles.input, inputTheme(theme, radius)]}
          />
        </View>
      </View>

      <View style={styles.chipRow}>
        {contractType.durationUnits.map((u) => (
          <Chip
            key={u}
            label={DURATION_UNIT_LABELS[u]}
            active={u === durationUnit}
            theme={theme}
            radius={radius}
            onPress={() => setDurationUnit(u)}
          />
        ))}
      </View>

      <SectionLabel theme={theme} text="Strategy (informational only)" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
        {STRATEGIES.map((s) => (
          <Chip key={s.id} label={s.label} active={s.id === strategyId} theme={theme} radius={radius} onPress={() => setStrategyId(s.id)} />
        ))}
      </ScrollView>
      {signal && (
        <Text style={[typography.caption, { color: theme.textSecondary, marginTop: 6 }]}>
          Signal: {signal.bias} - {signal.reason}
        </Text>
      )}
      <Text style={[typography.caption, { color: theme.textTertiary, marginTop: 6, marginBottom: 4 }]}>
        {STRATEGY_DISCLAIMER}
      </Text>

      {!symbol?.enabled ? (
        <View style={[styles.notice, { backgroundColor: theme.surfaceElevated, borderRadius: radius.md }]}>
          <Text style={{ color: theme.textSecondary }}>Not yet established for this market.</Text>
        </View>
      ) : (
        <View style={styles.quoteBlock}>
          {proposalError ? (
            <Text style={[typography.caption, { color: theme.danger }]}>{proposalError}</Text>
          ) : proposal ? (
            <Text style={[typography.body, { color: theme.textSecondary }]}>
              Payout {proposal.payout} for stake {proposal.display_value ?? stake}
            </Text>
          ) : (
            <Text style={[typography.caption, { color: theme.textTertiary }]}>Getting a live quote...</Text>
          )}

          <View style={{ marginTop: 14 }}>
            <CountdownRunButton
              resetToken={resetToken}
              onRun={handleRun}
              busy={buying}
              disabled={!proposal || connectionStatus !== 'open' || !activeAccount}
              label={`Run ${contractType.callLabels[callIndex]}`}
            />
          </View>
        </View>
      )}

      <SectionLabel theme={theme} text="Recent transactions" />
      {history.length === 0 ? (
        <Text style={[typography.caption, { color: theme.textTertiary }]}>Nothing yet.</Text>
      ) : (
        history.map((h) => (
          <View key={h.id} style={[styles.historyRow, { borderColor: theme.surfaceBorder }]}>
            <Text style={[typography.body, { color: theme.textSecondary, flex: 1 }]} numberOfLines={1}>
              {h.label}
            </Text>
            <Text style={{ color: h.profit >= 0 ? theme.success : theme.danger, fontWeight: '700' }}>
              {h.profit >= 0 ? '+' : ''}{h.profit.toFixed(2)}
            </Text>
          </View>
        ))
      )}
    </ScreenContainer>
  );
}

function SectionLabel({ theme, text }) {
  return <Text style={[typography.caption, { color: theme.textTertiary, marginTop: 18, marginBottom: 8 }]}>{text.toUpperCase()}</Text>;
}

function Chip({ label, active, faded, theme, radius, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.buttonPrimary : theme.surface,
          borderColor: theme.surfaceBorder,
          borderRadius: radius.pill,
          opacity: faded ? 0.45 : 1,
        },
      ]}
    >
      <Text style={{ color: active ? theme.buttonPrimaryText : theme.textPrimary, fontSize: 13.5, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function inputTheme(theme, radius) {
  return { color: theme.textPrimary, borderColor: theme.surfaceBorder, backgroundColor: theme.surface, borderRadius: radius.md };
}

const styles = StyleSheet.create({
  banner: { borderWidth: 1, padding: 12, marginBottom: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'nowrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, marginRight: 8 },
  pairRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  pairButton: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  digitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  digitButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  input: { height: 50, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  row2: { flexDirection: 'row', marginTop: 4 },
  quoteBlock: { marginTop: 18 },
  notice: { marginTop: 18, padding: 16, alignItems: 'center' },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
