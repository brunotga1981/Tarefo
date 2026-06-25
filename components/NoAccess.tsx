export function NoAccess() {
  return (
    <div className="mx-auto mt-20 max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
      <div className="mb-2 text-3xl">🔒</div>
      <h1 className="text-lg font-semibold text-azul-navy">Acesso restrito</h1>
      <p className="mt-1 text-sm text-slate-500">
        Você não tem permissão para acessar esta área. Fale com um administrador.
      </p>
    </div>
  );
}
