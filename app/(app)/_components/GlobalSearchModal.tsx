"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { globalSearch } from "../search-action";
import { formatINR, formatDate } from "@/lib/money";
import { Search, X, Building2, Users, Receipt, ArrowRight } from "lucide-react";

export function GlobalSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{
    parties: any[];
    sites: any[];
    transactions: any[];
  }>({ parties: [], sites: [], transactions: [] });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ parties: [], sites: [], transactions: [] });
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        const res = await globalSearch(query);
        setResults(res);
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-16 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-gray-200">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-gray-100 flex items-center space-x-3">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Global search by party name, bill #, description, site..."
            className="w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Panel */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4 text-xs">
          {query.trim() === "" ? (
            <p className="text-center text-gray-400 py-6">
              Type to search across parties, construction sites, and ledger entries.
            </p>
          ) : results.parties.length === 0 &&
            results.sites.length === 0 &&
            results.transactions.length === 0 ? (
            <p className="text-center text-gray-400 py-6">No matching records found.</p>
          ) : (
            <>
              {/* Parties */}
              {results.parties.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-[10px] uppercase text-gray-400 tracking-wider">
                    Vendors & Clients
                  </span>
                  <div className="space-y-1">
                    {results.parties.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onClose();
                          router.push(`/parties`);
                        }}
                        className="w-full text-left p-2 rounded-xl hover:bg-amber-50 flex items-center justify-between group transition"
                      >
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-amber-600" />
                          <span className="font-semibold text-gray-900">{p.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                            {p.type}
                          </span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sites */}
              {results.sites.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-[10px] uppercase text-gray-400 tracking-wider">
                    Construction Sites
                  </span>
                  <div className="space-y-1">
                    {results.sites.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          onClose();
                          router.push(`/sites/${s.id}`);
                        }}
                        className="w-full text-left p-2 rounded-xl hover:bg-amber-50 flex items-center justify-between group transition"
                      >
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold text-gray-900">{s.name}</span>
                          <span className="text-gray-400 text-[11px]">{s.location}</span>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:translate-x-0.5 transition" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions */}
              {results.transactions.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-[10px] uppercase text-gray-400 tracking-wider">
                    Transactions
                  </span>
                  <div className="space-y-1">
                    {results.transactions.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onClose();
                          router.push(`/transactions?search=${encodeURIComponent(t.description)}`);
                        }}
                        className="w-full text-left p-2 rounded-xl hover:bg-amber-50 flex items-center justify-between group transition"
                      >
                        <div>
                          <div className="font-semibold text-gray-900 truncate max-w-sm">
                            {t.description}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {formatDate(t.date)} {t.billNumber ? `• #${t.billNumber}` : ""}
                          </div>
                        </div>
                        <span className="font-bold text-gray-900">{formatINR(t.totalAmount)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
