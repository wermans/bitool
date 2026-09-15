import { Suspense } from "react";
import { ExplorerClient } from "./explorer-client";

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-[1480px] p-4">
      <Suspense fallback={null}>
        <ExplorerClient />
      </Suspense>
    </div>
  );
}
