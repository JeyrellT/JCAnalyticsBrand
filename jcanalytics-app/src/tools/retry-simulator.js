// A deterministic teaching model. Memory is neither durable storage nor a
// concurrency boundary, and this model never contacts an external destination.
export const RETRY_SCENARIOS = ['normal', 'lost-response', 'changed-payload'];
export const SYNTHETIC_REQUEST = Object.freeze({
  key: 'DEMO-OP-017',
  payload: Object.freeze({ reference: 'DEMO-ORDER-017', quantity: 2 }),
});

export function createRetryState() {
  return {
    attempts: 0,
    actualActions: 0,
    verifications: 0,
    operations: [],
    destination: [],
    lastOutcome: 'idle',
    history: [],
  };
}

function validateRequest({ key, payload }) {
  if (typeof key !== 'string' || !key.trim() || !payload ||
      typeof payload.reference !== 'string' || !payload.reference.trim() ||
      !Number.isSafeInteger(payload.quantity) || payload.quantity < 1 ||
      Object.keys(payload).some(field => !['reference', 'quantity'].includes(field))) {
    throw new TypeError('The model requires a key, reference and positive integer quantity.');
  }
}

const samePayload = (a, b) => a.reference === b.reference && a.quantity === b.quantity;

function record(state, kind, key, outcome, quantity) {
  return {
    ...state,
    lastOutcome: outcome,
    history: [...state.history, { step: state.history.length + 1, kind, key, outcome, quantity }],
  };
}

export function attemptOperation(state, request, { loseResponse = false } = {}) {
  validateRequest(request);
  const { key, payload } = request;
  const next = { ...state, attempts: state.attempts + 1 };
  const existing = state.operations.find(operation => operation.key === key);

  if (existing) {
    if (!samePayload(existing.payload, payload)) {
      return record(next, 'attempt', key, 'conflict', payload.quantity);
    }
    // An uncertain result stays uncertain until evidence is checked. A retry
    // request must not silently turn it into another simulated destination write.
    return record(next, 'attempt', key,
      existing.status === 'confirmed' ? 'reused' : 'held', payload.quantity);
  }

  const receipt = `DEMO-RECEIPT-${state.actualActions + 1}`;
  const operation = {
    key,
    payload: { ...payload },
    status: loseResponse ? 'unknown' : 'confirmed',
    result: loseResponse ? null : receipt,
  };
  return record({
    ...next,
    actualActions: state.actualActions + 1,
    operations: [...state.operations, operation],
    destination: [...state.destination, { key, ...payload, receipt }],
  }, 'attempt', key, loseResponse ? 'unknown' : 'confirmed', payload.quantity);
}

export function verifyOperation(state, key) {
  const operation = state.operations.find(entry => entry.key === key);
  const evidence = state.destination.find(entry => entry.key === key);
  const next = { ...state, verifications: state.verifications + 1 };

  if (!operation || !evidence || !samePayload(operation.payload, evidence)) {
    // No matching evidence is not proof that an external action never happened.
    return record(next, 'verification', key, 'unresolved', operation?.payload.quantity);
  }
  return record({
    ...next,
    operations: state.operations.map(entry => entry.key === key
      ? { ...entry, status: 'confirmed', result: evidence.receipt }
      : entry),
  }, 'verification', key, 'verified', operation.payload.quantity);
}
