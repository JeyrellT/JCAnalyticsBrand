import { useRef, useState } from 'react';
import { t } from '../../i18n/locale';
import { EXAMPLE_A, EXAMPLE_B, RECONCILE_LIMITS, exportReconciliationCsv, formatAmount, reconcileLists } from '../../tools/reconcile';
import '../../styles/list-reconciler.css';

const labels = {
  match: t('Coincidencia', 'Match'),
  different: t('Diferencia', 'Different'),
  'only-a': t('Solo en A', 'Only in A'),
  'only-b': t('Solo en B', 'Only in B'),
  ambiguous: t('Clave repetida', 'Repeated reference'),
};
const errors = {
  text: t('Pegá una lista de texto.', 'Paste a text list.'),
  characters: t('Supera 40.000 caracteres. Dividí el archivo antes de comparar; no se recortó el texto.', 'Over 40,000 characters. Split the file before comparing; no text was truncated.'),
  rows: t('Supera 200 filas de datos. Dividí el archivo; no se comparó ninguna fila.', 'Over 200 data rows. Split the file; no rows were compared.'),
  columns: t('Usá exactamente tres campos separados por punto y coma, sin comillas.', 'Use exactly three semicolon-separated fields, without quotation marks.'),
  reference: t('La referencia debe tener texto y no contener caracteres de control.', 'The reference must contain text and no control characters.'),
  amount: t('Importe: hasta 12 dígitos enteros y 2 decimales con punto. Sin miles, comas, espacios internos ni notación científica; se permite signo negativo.', 'Amount: up to 12 whole digits and 2 decimal places with a dot. No grouping, commas, internal spaces or scientific notation; negatives are allowed.'),
  currency: t('La moneda debe tener tres letras, por ejemplo USD o CRC.', 'Currency must have three letters, such as USD or CRC.'),
  empty: t('Agregá al menos una fila de datos; el encabezado solo no alcanza.', 'Add at least one data row; a header alone is not enough.'),
};

function SourceRows({ rows }) {
  if (!rows.length) return <span className="list-reconciler__absent">{t('Ausente', 'Absent')}</span>;
  return <ul className="list-reconciler__source-rows">{rows.map((row) => <li key={row.line}>
    <strong>{formatAmount(row.amountCents)} {row.currency}</strong>
    <span>{t('Línea', 'Line')} {row.line}</span>
  </li>)}</ul>;
}

export default function ListReconciler() {
  const [listA, setListA] = useState('');
  const [listB, setListB] = useState('');
  const [result, setResult] = useState(null);
  const [notice, setNotice] = useState('');
  const resultRef = useRef(null);

  const update = (side, value) => {
    (side === 'a' ? setListA : setListB)(value);
    setResult(null);
    setNotice(t('Texto modificado. Compará nuevamente para actualizar el resultado.', 'Text changed. Compare again to update the result.'));
  };
  const compare = () => {
    setResult(reconcileLists(listA, listB));
    setNotice('');
    requestAnimationFrame(() => resultRef.current?.focus());
  };
  const loadExample = () => {
    setListA(EXAMPLE_A);
    setListB(EXAMPLE_B);
    setResult(null);
    setNotice(t('Ejemplo sintético cargado: 7 filas en A y 6 en B. Presioná Comparar listas.', 'Synthetic example loaded: 7 rows in A and 6 in B. Select Compare lists.'));
  };
  const clear = () => {
    setListA('');
    setListB('');
    setResult(null);
    setNotice(t('Listas y resultado borrados de esta herramienta.', 'Lists and result cleared from this tool.'));
  };
  const download = () => {
    if (!result?.ok) return;
    const url = URL.createObjectURL(new Blob([exportReconciliationCsv(result)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'list-comparison.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(t('Reporte preparado: una fila por registro de origen. Los códigos de estado son estables en inglés.', 'Report prepared: one row per source record. Status codes remain in English.'));
  };

  return <section className="list-reconciler" data-tool="list-reconciler" id="list-reconciler" aria-labelledby="reconciler-heading">
    <div className="list-reconciler__heading">
      <span className="journal-eyebrow">{t('Herramienta gratuita · en tu navegador', 'Free tool · in your browser')}</span>
      <h2 id="reconciler-heading">{t('Dos listas. Cada diferencia, visible.', 'Two lists. Every difference, visible.')}</h2>
      <p>{t('Compará por referencia exacta. Un importe igual no vincula registros; una clave repetida queda pendiente de revisión.', 'Compare by exact reference. Equal amounts do not link records; a repeated reference stays open for review.')}</p>
    </div>
    <div className="list-reconciler__format" id="reconciler-format">
      <code>reference;amount;currency</code>
      <p>{t('Hasta 200 filas y 40.000 caracteres por lista. Ejemplo: 001;125.50;USD. Encabezado opcional en inglés o referencia;importe;moneda. Punto decimal, máximo 2 decimales y 12 dígitos enteros; sin separadores de miles ni comillas. Se aceptan negativos. Las líneas vacías se ignoran.', 'Up to 200 rows and 40,000 characters per list. Example: 001;125.50;USD. Optional English header or referencia;importe;moneda. Decimal dot, up to 2 decimal places and 12 whole digits; no grouping separators or quotation marks. Negatives are accepted. Blank lines are ignored.')}</p>
      <p>{t('Se recortan espacios al inicio y final de cada campo. La referencia conserva mayúsculas y ceros iniciales; la moneda pasa a mayúsculas. Su código debe tener tres letras: no se verifica que sea una moneda oficial.', 'Leading and trailing spaces are trimmed from each field. Reference case and leading zeros stay intact; currency becomes uppercase. Its code must have three letters: official currency validity is not checked.')}</p>
    </div>
    <div className="list-reconciler__inputs">
      {[['a', listA], ['b', listB]].map(([side, value]) => <div key={side}>
        <label htmlFor={`reconciler-${side}`}>{t('Lista', 'List')} {side.toUpperCase()} <span>{value.length.toLocaleString(t('es-CR', 'en-US'))} / {RECONCILE_LIMITS.characters.toLocaleString(t('es-CR', 'en-US'))}</span></label>
        <textarea id={`reconciler-${side}`} value={value} onChange={(event) => update(side, event.target.value)} rows={9} spellCheck={false} autoComplete="off" aria-describedby="reconciler-format reconciler-privacy" placeholder={'reference;amount;currency\n001;125.50;USD'} />
      </div>)}
    </div>
    <div className="list-reconciler__actions">
      <button type="button" className="list-reconciler__primary" data-action="compare" onClick={compare}>{t('Comparar listas', 'Compare lists')} <span aria-hidden="true">↗</span></button>
      <button type="button" data-action="example" onClick={loadExample}>{t('Cargar ejemplo', 'Load example')}</button>
      <button type="button" data-action="reset" onClick={clear}>{t('Borrar todo', 'Clear all')}</button>
    </div>
    <p id="reconciler-privacy" className="list-reconciler__privacy">{t('La comparación procesa el texto localmente: esta herramienta no lo envía, guarda ni registra en analítica. No modifica tus archivos. Usá Borrar todo para vaciar la herramienta.', 'The comparison processes text locally: this tool does not send, save or record it in analytics. Your files stay unchanged. Use Clear all to empty the tool.')}</p>
    <div className="list-reconciler__downloads">
      <a href="/downloads/list-a-example.csv" download>{t('Descargar ejemplo A', 'Download example A')}</a>
      <a href="/downloads/list-b-example.csv" download>{t('Descargar ejemplo B', 'Download example B')}</a>
    </div>
    <p className="list-reconciler__notice" role="status">{notice}</p>
    {result && <div className="list-reconciler__result" data-result={result.ok ? 'success' : 'error'} ref={resultRef} tabIndex={-1} aria-label={t('Resultado de la comparación', 'Comparison result')}>
      {!result.ok ? <div className="list-reconciler__errors" role="alert">
        <h3>{t('Revisá estas entradas antes de comparar', 'Review these inputs before comparing')}</h3>
        <p>{t('No se generó una comparación parcial.', 'No partial comparison was generated.')}</p>
        <ul>{result.errors.map((error, index) => <li key={index}><strong>{t('Lista', 'List')} {error.side.toUpperCase()}{error.line ? ` · ${t('línea', 'line')} ${error.line}` : ''}:</strong> {errors[error.code]}</li>)}</ul>
      </div> : <>
        <div className="list-reconciler__result-heading"><div><h3>{t('Un resultado por referencia', 'One result per reference')}</h3><p>{result.rowCounts.a} {t('filas en A', 'rows in A')} · {result.rowCounts.b} {t('filas en B', 'rows in B')} · {result.groups.length} {t('referencias distintas', 'distinct references')}</p></div><button type="button" data-action="export" onClick={download}>{t('Descargar reporte CSV', 'Download CSV report')}</button></div>
        <div className="list-reconciler__counts">{Object.entries(result.counts).map(([status, count]) => <div key={status} className={`list-reconciler__count list-reconciler__count--${status}`}><strong>{count}</strong><span>{labels[status]}</span></div>)}</div>
        <p className="list-reconciler__result-note">{t('Los conteos son referencias, no filas. Una clave repetida en cualquiera de las listas deja todo el grupo sin emparejar. Diferencia significa importe o moneda distintos; no se convierte moneda ni se aplica tolerancia.', 'Counts represent references, not rows. A reference repeated in either list leaves the entire group unpaired. Different means unequal amount or currency; there is no currency conversion or tolerance.')}</p>
        <div className="list-reconciler__table-wrap" tabIndex={0} role="region" aria-label={t('Detalle de referencias, desplazable horizontalmente', 'Reference details, horizontally scrollable')}>
          <table><caption>{t('Se conserva cada fila y su número de línea original.', 'Every row and its original line number are retained.')}</caption><thead><tr><th scope="col">{t('Referencia', 'Reference')}</th><th scope="col">{t('Estado', 'Status')}</th><th scope="col">{t('Lista A', 'List A')}</th><th scope="col">{t('Lista B', 'List B')}</th></tr></thead><tbody>{result.groups.map((group) => <tr key={group.reference} data-status={group.status} data-reference={group.reference}><th scope="row">{group.reference}</th><td><span className={`list-reconciler__status list-reconciler__status--${group.status}`}>{labels[group.status]}</span></td><td><SourceRows rows={group.a} /></td><td><SourceRows rows={group.b} /></td></tr>)}</tbody></table>
        </div>
        <p className="list-reconciler__result-note">{t('El CSV exporta cada registro por separado: no inventa pares dentro de grupos repetidos. Una referencia que podría iniciar una fórmula lleva un apóstrofo de protección. Importá la columna reference como texto para conservar ceros.', 'The CSV exports each source record separately: it never invents pairs within repeated groups. References that could start a formula receive a protective apostrophe. Import the reference column as text to retain zeros.')}</p>
      </>}
    </div>}
  </section>;
}
