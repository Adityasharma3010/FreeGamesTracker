import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "fgt-favorites";

const FavoritesContext = createContext(null);

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      /* storage full/unavailable — favorites just won't persist this session */
    }
  }, [favorites]);

  const isFavorite = (id) => favorites.some((f) => f.id === id);

  // Stores a lightweight snapshot of the giveaway (not just its id) —
  // so the favorites panel can still show title/platform/link even if
  // the item later drops out of the live API results (giveaway ends,
  // gets filtered, etc).
  const toggleFavorite = (giveaway) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.id === giveaway.id)) {
        return prev.filter((f) => f.id !== giveaway.id);
      }
      return [
        {
          id: giveaway.id,
          title: giveaway.title,
          platform: giveaway.platforms,
          link: giveaway.open_giveaway_url || giveaway.gamerpower_url,
          savedAt: Date.now(),
        },
        ...prev,
      ];
    });
  };

  const removeFavorite = (id) => setFavorites((prev) => prev.filter((f) => f.id !== id));

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, removeFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used inside <FavoritesProvider>");
  return ctx;
}
