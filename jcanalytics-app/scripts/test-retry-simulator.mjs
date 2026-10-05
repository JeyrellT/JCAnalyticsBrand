import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attemptOperation, createRetryState, SYNTHETIC_REQUEST, verifyOperation } from '../src/tools/retry-simulator.js';

function deepFreeze(value) {
  Object.freeze(value);
  Object.values(value).filter(item => item && typeof item === 'object').forEach(deepFreeze);
  return value;
}

test('identical retries reuse the original confirmation without another action', () => {
  const initial = deepFreeze(createRetryState());
  const first = deepFreeze(attemptOperation(initial, SYNTHETIC_REQUEST));
  let state = first;
  for (let i = 0; i < 5; i++) state = deepFreeze(attemptOperation(state, SYNTHETIC_REQUEST));
  assert.equal(initial.attempts, 0);
  assert.equal(state.attempts, 6);
  assert.equal(state.actualActions, 1);
  assert.equal(state.destination.length, 1);
  assert.equal(state.operations[0].result, first.operations[0].result);
  assert.equal(state.lastOutcome, 'reused');
});

test('lost response leaves the caller uncertain while the destination contains an action', () => {
  const state = attemptOperation(createRetryState(), SYNTHETIC_REQUEST, { loseResponse: true });
  assert.equal(state.attempts, 1);
  assert.equal(state.actualActions, 1);
  assert.equal(state.operations[0].status, 'unknown');
  assert.equal(state.operations[0].result, null);
  assert.equal(state.destination[0].quantity, 2);
  assert.equal(state.lastOutcome, 'unknown');
});

test('an unknown result is held on every retry until evidence is verified', () => {
  const unknown = deepFreeze(attemptOperation(createRetryState(), SYNTHETIC_REQUEST, { loseResponse: true }));
  let held = unknown;
  for (let i = 0; i < 5; i++) held = deepFreeze(attemptOperation(held, SYNTHETIC_REQUEST));
  assert.equal(held.lastOutcome, 'held');
  assert.equal(held.attempts, 6);
  assert.equal(held.actualActions, 1);
  assert.equal(held.operations[0].result, null);
  const verified = verifyOperation(held, SYNTHETIC_REQUEST.key);
  assert.equal(verified.verifications, 1);
  assert.equal(verified.attempts, 6);
  assert.equal(verified.actualActions, 1);
  assert.equal(verified.lastOutcome, 'verified');
  assert.equal(verified.operations[0].result, verified.destination[0].receipt);
  const retried = attemptOperation(verified, SYNTHETIC_REQUEST);
  assert.equal(retried.lastOutcome, 'reused');
  assert.equal(retried.attempts, 7);
  assert.equal(retried.actualActions, 1);
  assert.equal(unknown.operations[0].status, 'unknown');
});

test('same key with changed content conflicts for confirmed and uncertain operations', () => {
  for (const loseResponse of [false, true]) {
    const first = deepFreeze(attemptOperation(createRetryState(), SYNTHETIC_REQUEST, { loseResponse }));
    const changed = { ...SYNTHETIC_REQUEST, payload: { ...SYNTHETIC_REQUEST.payload, quantity: 3 } };
    const state = attemptOperation(first, changed);
    assert.equal(state.lastOutcome, 'conflict');
    assert.equal(state.attempts, 2);
    assert.equal(state.actualActions, 1);
    assert.deepEqual(state.destination, first.destination);
    assert.deepEqual(state.operations, first.operations);
  }
});

test('an intentional new key represents a separate operation, even with identical content', () => {
  const first = attemptOperation(createRetryState(), SYNTHETIC_REQUEST);
  const second = attemptOperation(first, { ...SYNTHETIC_REQUEST, key: 'DEMO-OP-018' });
  assert.equal(second.actualActions, 2);
  assert.equal(second.operations.length, 2);
  assert.notEqual(second.operations[0].result, second.operations[1].result);
});

test('missing or inconsistent destination evidence cannot confirm or re-execute unknown work', () => {
  const first = attemptOperation(createRetryState(), SYNTHETIC_REQUEST, { loseResponse: true });
  for (const destination of [[], [{ ...first.destination[0], quantity: 7 }]]) {
    const verified = verifyOperation(deepFreeze({ ...first, destination }), SYNTHETIC_REQUEST.key);
    assert.equal(verified.lastOutcome, 'unresolved');
    assert.equal(verified.operations[0].status, 'unknown');
    assert.equal(verified.actualActions, 1);
    const retried = attemptOperation(verified, SYNTHETIC_REQUEST);
    assert.equal(retried.lastOutcome, 'held');
    assert.equal(retried.actualActions, 1);
  }
});

test('unsupported payload fields are rejected instead of silently ignored', () => {
  assert.throws(() => attemptOperation(createRetryState(), {
    ...SYNTHETIC_REQUEST, payload: { ...SYNTHETIC_REQUEST.payload, extra: 'changed' },
  }), TypeError);
  assert.throws(() => attemptOperation(createRetryState(), {
    ...SYNTHETIC_REQUEST, payload: { ...SYNTHETIC_REQUEST.payload, quantity: 0 },
  }), TypeError);
});

test('reset creates an independent empty exercise', () => {
  const used = attemptOperation(createRetryState(), SYNTHETIC_REQUEST);
  const reset = createRetryState();
  assert.equal(reset.attempts, 0);
  assert.equal(reset.actualActions, 0);
  assert.equal(reset.verifications, 0);
  assert.equal(reset.lastOutcome, 'idle');
  assert.equal(reset.history.length, 0);
  assert.equal(used.actualActions, 1);
});
