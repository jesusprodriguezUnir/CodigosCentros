"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Building2, MapPin, Hash } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { loadSearchIndex, type SearchIndexItem } from "@/lib/searchIndex";
import Fuse, { type FuseResultMatch } from "fuse.js";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ResultGroup = {
  label: string;
  items: Array<{ item: SearchIndexItem; matches?: readonly FuseResultMatch[] }>;
};

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultGroup[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const fuseRef = useRef<Fuse<SearchIndexItem> | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setResults([]);
      setLoading(true);
      loadSearchIndex().then((fuse) => {
        fuseRef.current = fuse;
        setLoading(false);
      });
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim() || !fuseRef.current) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }

    const fuseResults = fuseRef.current.search(query.trim(), { limit: 20 });
    const grouped: Record<string, Array<{ item: SearchIndexItem; matches?: readonly FuseResultMatch[] }>> = {
      Centros: [],
      Municipios: [],
      Distritos: [],
    };

    for (const result of fuseResults) {
      const item = result.item;
      const match = { item, matches: result.matches };
      const bestKey = result.matches?.[0]?.key;
      if (bestKey === "codigo") {
        grouped.Centros.unshift(match);
      } else if (bestKey === "nombre") {
        grouped.Centros.push(match);
      } else if (bestKey === "municipio") {
        grouped.Municipios.push(match);
      } else if (bestKey === "distrito") {
        grouped.Distritos.push(match);
      } else {
        grouped.Centros.push(match);
      }
    }

    const filtered: ResultGroup[] = [];
    for (const [label, items] of Object.entries(grouped)) {
      if (items.length > 0) {
        filtered.push({ label, items });
      }
    }
    setResults(filtered);
    setSelectedIndex(0);
  }, [query]);

  const allFlatItems = results.flatMap((g) => g.items);

  const handleSelect = useCallback(
    (codigo: string) => {
      onOpenChange(false);
      router.push(`/centro/${codigo}`);
    },
    [onOpenChange, router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, allFlatItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (allFlatItems[selectedIndex]) {
          handleSelect(allFlatItems[selectedIndex].item.codigo);
        }
      } else if (e.key === "Escape") {
        onOpenChange(false);
      }
    },
    [allFlatItems, selectedIndex, handleSelect, onOpenChange]
  );

  const highlightMatch = (text: string, matches?: readonly FuseResultMatch[], key?: string) => {
    if (!matches || !key) return text;
    const keyMatches = matches.filter((m) => m.key === key);
    if (keyMatches.length === 0) return text;
    const indices = keyMatches[0].indices;
    if (!indices || indices.length === 0) return text;

    let result = "";
    let lastIdx = 0;
    for (const [start, end] of indices) {
      result += text.slice(lastIdx, start);
      result += `<mark class="bg-madrid-100 text-madrid-800 rounded px-0.5">${text.slice(start, end + 1)}</mark>`;
      lastIdx = end + 1;
    }
    result += text.slice(lastIdx);
    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  let globalIdx = 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-ink-200 overflow-hidden">
            <div className="flex items-center gap-3 px-4 border-b border-ink-100">
              <Search className="h-5 w-5 text-ink-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar centro, municipio, distrito o código..."
                className="flex-1 py-4 text-sm bg-transparent focus:outline-none placeholder:text-ink-400"
                autoFocus
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-ink-400 hover:text-ink-600">
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 text-[10px] font-mono text-ink-500">
                ESC
              </kbd>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {loading && (
                <div className="p-8 text-center text-sm text-ink-500">Cargando índice...</div>
              )}
              {!loading && query.trim() && results.length === 0 && (
                <div className="p-8 text-center text-sm text-ink-500">
                  No se encontraron resultados para "{query}"
                </div>
              )}
              {!loading && !query.trim() && (
                <div className="p-8 text-center text-sm text-ink-500">
                  Escribe para buscar entre todos los centros de la Comunidad de Madrid
                </div>
              )}

              {results.map((group) => (
                <div key={group.label}>
                  <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500 bg-ink-50/50">
                    {group.label}
                  </div>
                  {group.items.map((result) => {
                    const idx = globalIdx++;
                    const item = result.item;
                    return (
                      <button
                        key={item.codigo + idx}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-madrid-50 transition-colors ${
                          idx === selectedIndex ? "bg-madrid-50" : ""
                        }`}
                        onClick={() => handleSelect(item.codigo)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <Building2 className="h-4 w-4 text-ink-400 shrink-0" />
                        <div className="flex-1 text-left">
                          <div className="font-medium text-ink-900">
                            {highlightMatch(item.nombre, result.matches, "nombre")}
                          </div>
                          <div className="flex gap-2 text-xs text-ink-500 mt-0.5">
                            {item.municipio && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {highlightMatch(item.municipio, result.matches, "municipio")}
                              </span>
                            )}
                            {item.distrito && (
                              <span>{item.distrito}</span>
                            )}
                            <span className="flex items-center gap-1 font-mono">
                              <Hash className="h-3 w-3" />
                              {highlightMatch(item.codigo, result.matches, "codigo")}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-4 py-2 border-t border-ink-100 text-[11px] text-ink-500">
              <div className="flex gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-ink-200 bg-ink-50 px-1 py-0.5 font-mono">↑↓</kbd>
                  navegar
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-ink-200 bg-ink-50 px-1 py-0.5 font-mono">↵</kbd>
                  abrir
                </span>
              </div>
              <span>{allFlatItems.length} resultados</span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
