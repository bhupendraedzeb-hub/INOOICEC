"use client";

import dynamic from "next/dynamic";

// dnd-kit's useDraggable/useDroppable are not SSR-hydration-safe (their
// generated ids/attributes differ between the server render and the client
// render), which produced a real hydration mismatch when this component was
// imported directly into the (server) builder page. ssr:false is only
// callable from a Client Component (see Next.js lazy-loading docs), hence
// this thin wrapper.
export const TemplateBuilderClientOnly = dynamic(
  () => import("@/components/builder/TemplateBuilder").then((m) => m.TemplateBuilder),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center text-sm text-zinc-400">Loading builder…</div>
    ),
  },
);
