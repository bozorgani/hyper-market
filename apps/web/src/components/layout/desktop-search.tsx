"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Search, ChevronLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchSuggest } from "@/hooks/use-search";
import { formatPrice } from "@/lib/utils";
import { getProductImageUrl } from "@/lib/image-utils";

export function DesktopSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchRef = useRef<HTMLFormElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  const suggestions = useSearchSuggest(debouncedQuery);
  const suggestionItems = suggestions.data ?? [];

  // Define handler functions before useEffect to avoid TDZ lint error
  function handlePointerDown(event: MouseEvent) {
    if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
      setIsSuggestOpen(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      setIsSuggestOpen(false);
      setQuery("");
    }
  }

  // Attach global listeners for outside-click and Escape on search suggestions
  useEffect(() => {
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const showSuggestPanel = isSuggestOpen && query.trim().length >= 2;
  const listboxId = "header-search-listbox";
  const inputId = "header-search-input";
  const activeOptionId =
    activeSuggestionIndex >= 0
      ? `header-search-option-${activeSuggestionIndex}`
      : undefined;

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (!showSuggestPanel || suggestionItems.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((index) => (index + 1) % suggestionItems.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((index) => (index <= 0 ? suggestionItems.length - 1 : index - 1));
    }
    if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      selectSuggestion(activeSuggestionIndex);
    }
  }

  function selectSuggestion(index: number) {
    const item = suggestionItems[index];
    if (!item) return;
    setQuery("");
    setIsSuggestOpen(false);
    router.push(`/products/${item.id}`);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSuggestOpen(false);
    const normalizedQuery = query.trim();
    router.push(normalizedQuery ? `/search?q=${encodeURIComponent(normalizedQuery)}` : "/search");
    setQuery("");
  }

  const suggestContent = showSuggestPanel ? (
    <div
      id={listboxId}
      className="absolute right-0 top-full z-50 mt-1.5 w-full max-h-[340px] overflow-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl text-sm"
      role="listbox"
      aria-label="پیشنهادهای جستجو"
    >
      {suggestions.isLoading ? (
        <p className="p-3 text-slate-500" role="status" aria-live="polite">
          در حال جستجو...
        </p>
      ) : null}
      {!suggestions.isLoading &&
        suggestionItems.map((item, index) => {
          const optionId = `header-search-option-${index}`;
          const isActive = activeSuggestionIndex === index;
          return (
            <Link
              key={item.id}
              id={optionId}
              role="option"
              aria-selected={isActive}
              href={`/products/${item.id}`}
              onClick={() => {
                setQuery("");
                setIsSuggestOpen(false);
              }}
              onMouseEnter={() => setActiveSuggestionIndex(index)}
              className={`flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50 ${
                isActive ? "bg-emerald-50 ring-1 ring-emerald-100" : ""
              }`}
            >
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                {item.images?.[0] ? (
                  <Image
                    src={getProductImageUrl(item.images[0])}
                    alt=""
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-lg" aria-hidden="true">
                    🛍️
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-900">{item.name}</p>
                <p className="text-xs text-emerald-600 font-medium">{formatPrice(item.price)}</p>
              </div>
            </Link>
          );
        })}
      {!suggestions.isLoading && suggestionItems.length === 0 && (
        <p className="p-3 text-xs text-slate-500" role="status">
          نتیجه‌ای یافت نشد.
        </p>
      )}
      <button
        type="submit"
        className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
      >
        مشاهده همه نتایج <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  ) : null;

  return (
    <form
      ref={searchRef}
      onSubmit={submitSearch}
      className="relative hidden flex-1 md:block max-w-lg"
    >
      <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        id={inputId}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsSuggestOpen(e.target.value.trim().length >= 2);
          setActiveSuggestionIndex(-1);
        }}
        onFocus={() => {
          if (query.trim().length >= 2) setIsSuggestOpen(true);
        }}
        onKeyDown={handleSearchKeyDown}
        role="combobox"
        aria-label="جستجو در محصولات"
        aria-expanded={showSuggestPanel}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-activedescendant={activeOptionId}
        placeholder="جستجو در محصولات..."
        autoComplete="off"
        className="h-10 bg-slate-50 pr-11 rounded-2xl border-slate-200 focus:bg-white"
      />
      {suggestContent}
    </form>
  );
}
