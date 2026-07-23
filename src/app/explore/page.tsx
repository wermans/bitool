import { Suspense } from "react";
import { ExplorerClient } from "./explorer-client";

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Consulta ad-hoc às métricas e dimensões da camada semântica (Cube.js).
        </p>
      </div>
      <Suspense fallback={null}>
        <ExplorerClient />
      </Suspense>
    </div>
  );
}
