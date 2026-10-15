// PLACEHOLDER v5-B: lo reemplaza el agente del brief creativo (vista imprimible A4).
export default function BriefPrint({ params, audience = 'team' }) {
  return (
    <main className="p-8">
      <h1 className="font-display text-2xl font-bold">Brief creativo #{params.id}</h1>
      <p className="text-sm text-muted">Vista imprimible ({audience}).</p>
    </main>
  );
}
