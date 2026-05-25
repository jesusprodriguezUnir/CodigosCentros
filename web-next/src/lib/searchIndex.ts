import Fuse from "fuse.js";

export type SearchIndexItem = {
  codigo: string;
  nombre: string;
  municipio: string | null;
  distrito: string | null;
};

let _fuse: Fuse<SearchIndexItem> | null = null;
let _loading: Promise<void> | null = null;

export async function loadSearchIndex(): Promise<Fuse<SearchIndexItem>> {
  if (_fuse) return _fuse;
  if (_loading) {
    await _loading;
    return _fuse!;
  }

  _loading = (async () => {
    const cached = localStorage.getItem("search-index");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        _fuse = new Fuse(parsed.items, {
          keys: ["nombre", "municipio", "distrito", "codigo"],
          threshold: 0.35,
          ignoreLocation: true,
        });
        return;
      } catch {
        localStorage.removeItem("search-index");
      }
    }

    const resp = await fetch("/api/centros/search-index");
    const data: SearchIndexItem[] = await resp.json();
    localStorage.setItem("search-index", JSON.stringify({ items: data, ts: Date.now() }));
    _fuse = new Fuse(data, {
      keys: ["nombre", "municipio", "distrito", "codigo"],
      threshold: 0.35,
      ignoreLocation: true,
    });
  })();

  await _loading;
  return _fuse!;
}

export function getSearchIndexSync(): Fuse<SearchIndexItem> | null {
  return _fuse;
}
