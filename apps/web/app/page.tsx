import { Suspense } from "react";
import { Application } from "../components/application";
export default function Page() {
  return (
    <Suspense fallback={<p className="empty">Carregando GFerraz Makeup…</p>}>
      <Application />
    </Suspense>
  );
}
