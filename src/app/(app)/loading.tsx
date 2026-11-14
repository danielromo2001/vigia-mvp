import { Loader2 } from "lucide-react";

export default function AppLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-slate-400">
      <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
      <p className="mt-3 text-xs font-medium uppercase tracking-wider">
        Cargando información…
      </p>
    </div>
  );
}
