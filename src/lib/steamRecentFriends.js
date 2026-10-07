// Remembers the friends you've compared with, per signed-in account, in
// this browser only (localStorage) — nothing is sent anywhere. Newest
// first, at most MAX entries.

const MAX = 5;
const keyFor = (ownSteamid) => `fgt-steam-recent-friends:${ownSteamid}`;

export function getRecentFriends(ownSteamid) {
  if (!ownSteamid) return [];
  try {
    const list = JSON.parse(localStorage.getItem(keyFor(ownSteamid)) || "[]");
    return Array.isArray(list)
      ? list
          .filter((f) => f && /^\d{17}$/.test(String(f.steamid)) && f.name)
          .slice(0, MAX)
      : [];
  } catch {
    return [];
  }
}

// { steamid, name, avatar } -> moved/added at the front. Returns the list.
export function rememberFriend(ownSteamid, friend) {
  if (!ownSteamid || !friend?.steamid || !friend?.name) return [];
  const next = [
    {
      steamid: String(friend.steamid),
      name: String(friend.name),
      avatar: friend.avatar || null,
      at: Date.now(),
    },
    ...getRecentFriends(ownSteamid).filter(
      (f) => f.steamid !== String(friend.steamid),
    ),
  ].slice(0, MAX);
  try {
    localStorage.setItem(keyFor(ownSteamid), JSON.stringify(next));
  } catch {
    /* storage full / blocked — the feature just doesn't remember */
  }
  return next;
}
