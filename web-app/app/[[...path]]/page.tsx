"use client";

import { useEffect, useState } from "react";
import { App } from "../../src/App";

export default function SpaPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="page-status">Caricamento EscoAPesca…</div>;
  }

  return <App />;
}
