// intent: lightweight localStorage-backed React state for Studio UI affordances
// status: done
// next: add versioned migrations only when persisted shapes become incompatible
// confidence: high

import { useEffect, useState } from "react";

export function usePersistedState<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? initialValue : (JSON.parse(raw) as T);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota / private mode */
    }
  }, [key, value]);

  return [value, setValue];
}
