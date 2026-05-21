"use client";

import { useEffect, useState } from "react";
import type { CatalogResponse } from "@/lib/types";
import { api } from "@/services/api";

export function useCatalog() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api
      .catalog()
      .then((data) => {
        if (active) {
          setCatalog(data);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { catalog, loading };
}
