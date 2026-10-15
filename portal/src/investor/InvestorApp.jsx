// PLACEHOLDER v6: el agente del portal de inversionistas reemplaza este archivo por la app completa.
import { useSession } from '../lib/session.jsx';

export default function InvestorApp() {
  const { user, logout } = useSession();
  return (
    <main className="p-6">
      <h1 className="text-xl font-bold">Portal de inversionistas · {user?.name}</h1>
      <button type="button" className="btn btn-outline mt-4" onClick={logout}>Salir</button>
    </main>
  );
}
