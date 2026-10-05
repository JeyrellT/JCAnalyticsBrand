import { useState } from 'react';
import { t } from '../../i18n/locale';
import { attemptOperation, createRetryState, RETRY_SCENARIOS, SYNTHETIC_REQUEST, verifyOperation } from '../../tools/retry-simulator';
import '../../styles/retry-simulator.css';

export default function RetrySimulator() {
  const [scenario, setScenario] = useState('normal');
  const [state, setState] = useState(createRetryState);
  const labels = t({
    normal: 'Repetir la misma solicitud',
    'lost-response': 'Se perdió la respuesta',
    'changed-payload': 'Misma clave, otros datos',
  }, {
    normal: 'Repeat the same request',
    'lost-response': 'The response was lost',
    'changed-payload': 'Same key, different data',
  });
  const outcomes = t({
    idle: ['Listo para probar', 'Enviá la primera solicitud y observá los dos contadores.'],
    confirmed: ['Resultado confirmado', 'El destino ficticio guardó una acción y llegó su confirmación.'],
    reused: ['Se reutilizó la confirmación', 'La misma clave y los mismos datos recuperaron el resultado conocido. No se agregó otra acción.'],
    unknown: ['Resultado incierto para quien envía', 'El destino ficticio guardó la acción, pero se perdió la respuesta. Quien envía todavía no tiene confirmación.'],
    held: ['Reintento retenido para verificar', 'La solicitud sigue pendiente de comprobación. Repetirla no autoriza otra acción.'],
    conflict: ['Cambio rechazado', 'Esta clave ya identifica una solicitud de 2 unidades. Pedir 3 con la misma clave es un conflicto; la acción original se conserva.'],
    verified: ['Resultado comprobado en el destino', 'La verificación encontró el registro ficticio correspondiente. Ahora se puede reutilizar su confirmación.'],
    unresolved: ['La evidencia no alcanza', 'No se encontró un registro compatible. El caso sigue pendiente; no se asume que la acción falló.'],
  }, {
    idle: ['Ready to try', 'Send the first request and watch both counters.'],
    confirmed: ['Result confirmed', 'The fictional destination saved one action and its confirmation arrived.'],
    reused: ['Confirmation reused', 'The same key and data returned the known result. No additional action was added.'],
    unknown: ['Outcome unknown to the sender', 'The fictional destination saved the action, but its response was lost. The sender still has no confirmation.'],
    held: ['Retry held for verification', 'The request still needs to be checked. Repeating it does not authorize another action.'],
    conflict: ['Change rejected', 'This key already identifies a request for 2 units. Asking for 3 with the same key is a conflict; the original action is preserved.'],
    verified: ['Result verified at the destination', 'Verification found the matching fictional record. Its confirmation can now be reused.'],
    unresolved: ['Evidence is insufficient', 'No matching record was found. The case stays pending; the action is not assumed to have failed.'],
  });
  const operation = state.operations[0];
  const needsVerification = operation?.status === 'unknown';
  const changed = scenario === 'changed-payload';
  const [outcomeTitle, outcomeText] = outcomes[state.lastOutcome];

  function chooseScenario(value) {
    setScenario(value);
    setState(createRetryState());
  }

  function attempt(isRetry) {
    const request = isRetry && changed
      ? { ...SYNTHETIC_REQUEST, payload: { ...SYNTHETIC_REQUEST.payload, quantity: 3 } }
      : SYNTHETIC_REQUEST;
    setState(previous => attemptOperation(previous, request, {
      loseResponse: !isRetry && scenario === 'lost-response',
    }));
  }

  return (
    <section id="retry-simulator" className="retry-lab" aria-labelledby="retry-lab-title">
      <div className="retry-lab__intro">
        <span className="retry-lab__eyebrow">{t('Laboratorio interactivo · datos ficticios', 'Interactive lab · fictional data')}</span>
        <h2 id="retry-lab-title">{t('Más intentos. ¿Más acciones?', 'More attempts. More actions?')}</h2>
        <p>{t('Probá una solicitud ficticia para preparar 2 unidades de un pedido. Compará lo que sabe quien envía con lo que ocurrió en el destino.', 'Try a fictional request to prepare 2 units of an order. Compare what the sender knows with what happened at the destination.')}</p>
      </div>
      <div className="retry-lab__scenarios" role="group" aria-label={t('Elegir escenario', 'Choose a scenario')}>
        {RETRY_SCENARIOS.map((value, index) => (
          <button key={value} type="button" data-retry-scenario={value} aria-pressed={scenario === value} onClick={() => chooseScenario(value)}>
            <span aria-hidden="true">0{index + 1}</span>{labels[value]}
          </button>
        ))}
      </div>
      <dl className="retry-lab__request">
        <div><dt>{t('Clave de la operación', 'Operation key')}</dt><dd>{SYNTHETIC_REQUEST.key}</dd></div>
        <div><dt>{t('Referencia ficticia', 'Fictional reference')}</dt><dd>{SYNTHETIC_REQUEST.payload.reference}</dd></div>
        <div><dt>{t('Primera solicitud → reintento', 'First request → retry')}</dt><dd>{changed ? t('2 → 3 unidades', '2 → 3 units') : t('2 → 2 unidades', '2 → 2 units')}</dd></div>
      </dl>
      <div className="retry-lab__counters" aria-label={t('Contadores del modelo', 'Model counters')}>
        <div><strong data-retry-count="attempts">{state.attempts}</strong><span>{t('Solicitudes intentadas', 'Attempted requests')}</span></div>
        <div><strong data-retry-count="actions">{state.actualActions}</strong><span>{t('Acciones en el destino ficticio', 'Actions at the fictional destination')}</span></div>
        <div><strong data-retry-count="verifications">{state.verifications}</strong><span>{t('Verificaciones', 'Verifications')}</span></div>
      </div>
      <div className="retry-lab__actions">
        <button type="button" data-retry-action="attempt" disabled={state.attempts > 0} onClick={() => attempt(false)}>{t('1. Enviar solicitud', '1. Send request')}</button>
        <button type="button" data-retry-action="retry" disabled={state.attempts === 0} onClick={() => attempt(true)}>{changed ? t('2. Reintentar con 3 unidades', '2. Retry with 3 units') : t('2. Reintentar igual', '2. Retry unchanged')}</button>
        <button type="button" data-retry-action="verify" disabled={!needsVerification} onClick={() => setState(previous => verifyOperation(previous, SYNTHETIC_REQUEST.key))}>{t('Verificar destino ficticio', 'Verify fictional destination')}</button>
        <button type="button" className="retry-lab__reset" data-retry-action="reset" onClick={() => setState(createRetryState())}>{t('Reiniciar', 'Reset')}</button>
      </div>
      <div id="retry-result" className="retry-lab__result" data-retry-outcome={state.lastOutcome} role="status" aria-live="polite" aria-atomic="true">
        <h3>{outcomeTitle}</h3><p>{outcomeText}</p>
        <p className="retry-lab__receipt">{t('Confirmación disponible:', 'Available confirmation:')} <strong>{operation?.result || t('Todavía no disponible', 'Not available yet')}</strong></p>
        <span className="retry-lab__sr-only">{t(`${state.attempts} intentos; ${state.actualActions} acciones ficticias; ${state.verifications} verificaciones.`, `${state.attempts} attempts; ${state.actualActions} fictional actions; ${state.verifications} verifications.`)}</span>
      </div>
      {state.history.length > 0 && <div className="retry-lab__history">
        <h3>{t('Últimos pasos', 'Recent steps')}</h3>
        <ol>{state.history.slice(-6).map(entry => <li key={entry.step}><span>{entry.step.toString().padStart(2, '0')}</span>{outcomes[entry.outcome][0]}</li>)}</ol>
      </div>}
      <div className="retry-lab__footer">
        <p>{t('Modelo didáctico en memoria: no envía solicitudes, crea pedidos ni guarda registros reales. Recargar o reiniciar borra el ejercicio. No representa concurrencia ni garantiza que un servicio externo ejecute una acción exactamente una vez.', 'Teaching model in memory: it sends no requests, creates no orders and saves no real records. Reloading or resetting clears the exercise. It does not model concurrency or guarantee that an external service performs an action exactly once.')}</p>
        <a href="/downloads/retry-test-cases.csv" download>{t('Descargar casos y resultados esperados · CSV bilingüe', 'Download cases and expected results · bilingual CSV')}<span aria-hidden="true"> ↓</span></a>
      </div>
    </section>
  );
}
