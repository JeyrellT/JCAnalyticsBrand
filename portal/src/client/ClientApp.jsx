// PLACEHOLDER v5: el agente del portal de clientes reemplaza este archivo por la app completa.
import { useSession } from '../lib/session.jsx';

export default function ClientApp() {
  const { client, logout } = useSession();
  return (
    <main className="p-6">
      <h1 className="text-xl font-bold">Portal de clientes · {client?.name}</h1>
      <button type="button" className="btn btn-secondary mt-4" onClick={logout}>Salir</button>
    </main>
  );
}
