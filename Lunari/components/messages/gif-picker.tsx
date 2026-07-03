"use client";

import { useEffect, useState } from "react";

interface GifResult {
  id: string;
  url: string;
  previewUrl: string;
}

export function GifPicker({
  onSelect,
}: {
  onSelect: (gif: { url: string; type: "gif" }) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) return;

    let active = true;
    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/giphy/search?q=${encodeURIComponent(query.trim())}`)
        .then((res) => res.json())
        .then((json) => {
          if (!active) return;
          if (json.error) {
            setError(json.error);
            setResults([]);
          } else {
            setError(null);
            setResults(json.results ?? []);
          }
        })
        .catch(() => {
          if (active) setError("Could not search GIFs");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query]);

  // Derived rather than reset-in-effect: an empty query has no results/error
  // to show regardless of what's left over in state from a prior search.
  const showResults = query.trim() ? results : [];
  const showError = query.trim() ? error : null;
  const showLoading = query.trim() && loading;

  return (
    <div className="flex max-h-80 w-[min(18rem,calc(100vw-2rem))] flex-col">
      <div className="border-b border-border p-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs…"
          className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-[#611f69]"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {showLoading && <p className="px-1 py-2 text-sm text-muted-foreground">Searching…</p>}
        {showError && <p className="px-1 py-2 text-sm text-red-600">{showError}</p>}
        {!showLoading && !showError && query.trim() && showResults.length === 0 && (
          <p className="px-1 py-2 text-sm text-muted-foreground">No GIFs found</p>
        )}
        <div className="grid grid-cols-2 gap-1">
          {showResults.map((gif) => (
            <button
              key={gif.id}
              type="button"
              onClick={() => onSelect({ url: gif.url, type: "gif" })}
              className="overflow-hidden rounded-md hover:opacity-80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={gif.previewUrl} alt="" className="h-20 w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
