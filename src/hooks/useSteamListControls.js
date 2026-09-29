import { useMemo, useState } from "react";
import {
  DEFAULT_SORT,
  applyControls,
  availableFilters,
  availableSorts,
} from "../lib/steamListControls.js";

// Holds the search / sort / filter choices for one Steam grid and returns
// the games to actually show. Used by both the own-profile pages and the
// friend pages (see src/lib/steamListControls.js for the rules).
//
// `libraryAppids` is only passed on the own-profile Wishlist page — that's
// what makes the "owned" filters meaningful. Leave it null elsewhere.
export function useSteamListControls({
  games,
  kind,
  libraryAppids = null,
  matchAppIds = null,
}) {
  const [search, setSearch] = useState("");
  const [sortChoice, setSortChoice] = useState(DEFAULT_SORT[kind]);
  const [filterChoice, setFilterChoice] = useState("all");

  const sorts = useMemo(() => availableSorts(kind, games), [kind, games]);
  const filters = useMemo(
    () =>
      availableFilters({ kind, hasOwnedInfo: !!libraryAppids, matchAppIds }),
    [kind, libraryAppids, matchAppIds],
  );

  // If a choice stops being offered (e.g. new data has no "last played"),
  // fall back to the default rather than sorting/filtering on nothing.
  const sort = sorts.some((s) => s.value === sortChoice)
    ? sortChoice
    : DEFAULT_SORT[kind];
  const filter = filters.some((f) => f.key === filterChoice)
    ? filterChoice
    : "all";

  const visible = useMemo(
    () =>
      applyControls(games, {
        search,
        sort,
        filter,
        libraryAppids,
        matchAppIds,
      }),
    [games, search, sort, filter, libraryAppids, matchAppIds],
  );

  const isFiltered = search.trim() !== "" || filter !== "all";

  return {
    kind,
    visible,
    total: games.length,
    sorts,
    filters,
    search,
    setSearch,
    sort,
    setSort: setSortChoice,
    filter,
    setFilter: setFilterChoice,
    isFiltered,
    reset: () => {
      setSearch("");
      setFilterChoice("all");
    },
  };
}
