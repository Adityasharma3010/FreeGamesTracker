// api/steam-image.js
//
// Steam artwork resolver.
//
// Resolution order:
//
// 1. Steam AppDetails
// 2. Steam StoreBrowse
// 3. Steam PICS appinfo fallback through SteamRaw
//
// Why the third fallback exists:
//
// Some Steam apps (especially betas, playtests, disabled apps,
// temporarily removed apps, and certain newer games) can have
// artwork in Steam's PICS/appinfo data even when:
//
//   - AppDetails does not return the app
//   - StoreBrowse does not return the app
//
// SteamRaw exposes that PICS data as JSON.
//
// The actual image files are still loaded directly from
// Steam's CDN. SteamRaw is ONLY being used to discover the
// hashed asset paths.
//
// Supported:
//
// /api/steam-image?appid=123
//
// /api/steam-image?appids=123,456,789

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const cache = new Map();

const STEAM_CDN = "https://shared.akamai.steamstatic.com/store_item_assets/";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeHttps(url) {
  if (typeof url !== "string") {
    return "";
  }

  return url.trim().replace(/^http:\/\//i, "https://");
}

function uniqueUrls(urls) {
  return [...new Set(urls.map(normalizeHttps).filter(Boolean))];
}

/* -------------------------------------------------------------------------- */
/* Steam AppDetails                                                           */
/* -------------------------------------------------------------------------- */

async function fetchAppDetails(appid) {
  const url =
    `https://store.steampowered.com/api/appdetails` +
    `?appids=${encodeURIComponent(appid)}` +
    "&l=english";

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "FreeGamesTracker/1.0 (+https://github.com/Adityasharma3010/FreeGamesTracker)",
      // Bypasses Steam's mature-content age gate, which otherwise makes
      // this silently return success:false for mature-rated games.
      Cookie:
        "birthtime=0; lastagecheckage=1-January-1970; wants_mature_content=1",
    },

    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Steam AppDetails returned ${response.status}`);
  }

  const json = await response.json();

  const entry = json?.[String(appid)];

  if (!entry?.success || !entry?.data) {
    return null;
  }

  return entry.data;
}

function buildUrlsFromAppDetails(data) {
  if (!data) {
    return [];
  }

  const screenshotUrls = Array.isArray(data.screenshots)
    ? data.screenshots
        .slice(0, 4)
        .flatMap((screenshot) => [
          screenshot?.path_thumbnail,
          screenshot?.path_full,
        ])
    : [];

  return uniqueUrls([
    data.header_image,
    data.capsule_imagev5,
    data.capsule_image,
    data.background,
    data.background_raw,

    ...screenshotUrls,
  ]);
}

/* -------------------------------------------------------------------------- */
/* Steam StoreBrowse                                                          */
/* -------------------------------------------------------------------------- */

function buildAssetUrl(assetUrlFormat, filename) {
  const format = String(assetUrlFormat || "").trim();

  const file = String(filename || "").trim();

  if (!format || !file) {
    return "";
  }

  if (!format.includes("${FILENAME}")) {
    return "";
  }

  return `${STEAM_CDN}${format.replace("${FILENAME}", file)}`;
}

function buildUrlsFromStoreItem(item) {
  const assets = item?.assets || {};

  const format = assets.asset_url_format;

  if (!format) {
    return [];
  }

  const assetNames = [
    assets.header,
    assets.main_capsule,
    assets.small_capsule,

    assets.library_capsule,
    assets.library_capsule_2x,

    assets.hero_capsule,
    assets.hero_capsule_2x,
  ];

  return uniqueUrls(
    assetNames.map((filename) => buildAssetUrl(format, filename)),
  );
}

async function fetchStoreItems(appids) {
  const ids = appids.map((appid) => ({
    appid: Number(appid),
  }));

  const input = {
    ids,

    context: {
      language: "english",
      country_code: "US",
      steam_realm: 1,
    },

    data_request: {
      include_assets: true,
    },
  };

  const url =
    "https://api.steampowered.com/IStoreBrowseService/GetItems/v1/" +
    `?input_json=${encodeURIComponent(JSON.stringify(input))}`;

  const response = await fetch(url, {
    method: "GET",

    headers: {
      Accept: "application/json",
      "User-Agent":
        "FreeGamesTracker/1.0 (+https://github.com/Adityasharma3010/FreeGamesTracker)",
    },

    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Steam GetItems returned ${response.status}`);
  }

  const json = await response.json();

  const storeItems = json?.response?.store_items;

  if (!Array.isArray(storeItems)) {
    throw new Error("Steam GetItems returned invalid data");
  }

  return storeItems;
}

/* -------------------------------------------------------------------------- */
/* Steam PICS fallback                                                        */
/* -------------------------------------------------------------------------- */

/**
 * SteamRaw exposes Steam's PICS/appinfo data.
 *
 * We do NOT use SteamRaw's image hosting.
 *
 * We only use the PICS metadata to discover the actual
 * hashed Steam asset paths.
 */
async function fetchSteamPicsAppInfo(appid) {
  const url = `https://steamraw.com/api/app/${encodeURIComponent(appid)}/raw`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        "FreeGamesTracker/1.0 (+https://github.com/Adityasharma3010/FreeGamesTracker)",
    },

    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Steam PICS fallback returned ${response.status}`);
  }

  const json = await response.json();

  if (!json?.common) {
    return null;
  }

  return json;
}

/**
 * Convert a PICS asset path into a real Steam CDN URL.
 *
 * PICS example:
 *
 * 8c72205bfdf522bada8431d2aacbd1b6c66fac4c/header.jpg
 *
 * Result:
 *
 * https://shared.akamai.steamstatic.com/
 * store_item_assets/steam/apps/4783780/
 * 8c72205bfdf522bada8431d2aacbd1b6c66fac4c/header.jpg
 */
function buildPicsAssetUrl(appid, assetPath) {
  if (typeof assetPath !== "string" || !assetPath.trim()) {
    return "";
  }

  const cleanPath = assetPath.trim().replace(/^\/+/, "");

  if (
    !cleanPath ||
    cleanPath.startsWith("http://") ||
    cleanPath.startsWith("https://")
  ) {
    return normalizeHttps(cleanPath);
  }

  return `${STEAM_CDN}` + `steam/apps/${appid}/` + cleanPath;
}

/**
 * Build artwork URLs from raw Steam PICS appinfo.
 */
function buildUrlsFromPics(appid, appinfo) {
  const common = appinfo?.common || {};

  const urls = [];

  /* ---------------------------------------------------------------------- */
  /* Header                                                                  */
  /* ---------------------------------------------------------------------- */

  const headerImage = common?.header_image?.english;

  if (headerImage) {
    urls.push(buildPicsAssetUrl(appid, headerImage));
  }

  /* ---------------------------------------------------------------------- */
  /* Small capsule                                                           */
  /* ---------------------------------------------------------------------- */

  const smallCapsule = common?.small_capsule?.english;

  if (smallCapsule) {
    urls.push(buildPicsAssetUrl(appid, smallCapsule));
  }

  /* ---------------------------------------------------------------------- */
  /* Library capsule                                                         */
  /* ---------------------------------------------------------------------- */

  const libraryCapsule = common?.library_assets_full?.library_capsule;

  if (libraryCapsule) {
    urls.push(buildPicsAssetUrl(appid, libraryCapsule?.image?.english));

    urls.push(buildPicsAssetUrl(appid, libraryCapsule?.image2x?.english));
  }

  /* ---------------------------------------------------------------------- */
  /* Library header                                                          */
  /* ---------------------------------------------------------------------- */

  const libraryHeader = common?.library_assets_full?.library_header;

  if (libraryHeader) {
    urls.push(buildPicsAssetUrl(appid, libraryHeader?.image?.english));

    urls.push(buildPicsAssetUrl(appid, libraryHeader?.image2x?.english));
  }

  /* ---------------------------------------------------------------------- */
  /* Library hero                                                            */
  /* ---------------------------------------------------------------------- */

  const libraryHero = common?.library_assets_full?.library_hero;

  if (libraryHero) {
    urls.push(buildPicsAssetUrl(appid, libraryHero?.image?.english));

    urls.push(buildPicsAssetUrl(appid, libraryHero?.image2x?.english));
  }

  return uniqueUrls(urls);
}

/* -------------------------------------------------------------------------- */
/* Result creation                                                            */
/* -------------------------------------------------------------------------- */

function createResult(
  appid,
  appDetails = null,
  storeItem = null,
  picsAppInfo = null,
) {
  const id = String(appid);

  /*
   * Keep the order:
   *
   * AppDetails
   * StoreBrowse
   * PICS
   */
  const urls = uniqueUrls([
    ...buildUrlsFromAppDetails(appDetails),

    ...buildUrlsFromStoreItem(storeItem),

    ...buildUrlsFromPics(id, picsAppInfo),
  ]);

  return {
    found: Boolean(appDetails || storeItem || picsAppInfo),

    appid: Number(id),

    name:
      appDetails?.name || storeItem?.name || picsAppInfo?.common?.name || null,

    urls,
  };
}

/* -------------------------------------------------------------------------- */
/* Cache                                                                      */
/* -------------------------------------------------------------------------- */

function getCached(appid) {
  const cached = cache.get(String(appid));

  if (!cached) {
    return null;
  }

  if (Date.now() - cached.fetchedAt >= CACHE_TTL_MS) {
    cache.delete(String(appid));
    return null;
  }

  return cached.value;
}

function setCached(appid, value) {
  cache.set(String(appid), {
    fetchedAt: Date.now(),
    value,
  });
}

/* -------------------------------------------------------------------------- */
/* Resolver                                                                   */
/* -------------------------------------------------------------------------- */

async function resolveAppids(appids) {
  const uniqueAppids = [
    ...new Set(
      appids.map((id) => String(id).trim()).filter((id) => /^\d+$/.test(id)),
    ),
  ];

  if (!uniqueAppids.length) {
    return {};
  }

  const results = {};
  const missing = [];

  /* ---------------------------------------------------------------------- */
  /* 1. Server cache                                                        */
  /* ---------------------------------------------------------------------- */

  for (const appid of uniqueAppids) {
    const cached = getCached(appid);

    if (cached) {
      results[appid] = cached;
    } else {
      missing.push(appid);
    }
  }

  if (!missing.length) {
    return results;
  }

  /* ---------------------------------------------------------------------- */
  /* 2. AppDetails                                                          */
  /* ---------------------------------------------------------------------- */

  /*
   * Unlimited Promise.all here meant a 40-appid batch fired 40
   * simultaneous AppDetails calls at Steam from one invocation — still a
   * burst big enough to get rate-limited. Capped the same way the PICS
   * fallback tier below already was (concurrency = 6).
   */
  const appDetailsResults = [];

  for (let i = 0; i < missing.length; i += 6) {
    const batch = missing.slice(i, i + 6);

    const batchResults = await Promise.all(
      batch.map(async (appid) => {
        try {
          const data = await fetchAppDetails(appid);

          return {
            appid,
            data,
          };
        } catch {
          return {
            appid,
            data: null,
          };
        }
      }),
    );

    appDetailsResults.push(...batchResults);
  }

  const needsStoreBrowse = [];

  for (const result of appDetailsResults) {
    const urls = buildUrlsFromAppDetails(result.data);

    if (urls.length > 0) {
      const value = createResult(result.appid, result.data, null, null);

      setCached(result.appid, value);

      results[result.appid] = value;
    } else {
      needsStoreBrowse.push(result.appid);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* 3. StoreBrowse                                                         */
  /* ---------------------------------------------------------------------- */

  let storeItems = [];

  if (needsStoreBrowse.length) {
    try {
      storeItems = await fetchStoreItems(needsStoreBrowse);
    } catch {
      storeItems = [];
    }
  }

  const itemById = new Map(
    storeItems
      .filter((item) => item?.appid != null)
      .map((item) => [String(item.appid), item]),
  );

  /*
   * Only games that STILL don't have
   * a usable StoreBrowse image continue
   * to the PICS fallback.
   */
  const needsPics = [];

  for (const appid of needsStoreBrowse) {
    const appDetailsResult = appDetailsResults.find(
      (item) => item.appid === appid,
    );

    const appDetails = appDetailsResult?.data || null;

    const storeItem = itemById.get(appid) || null;

    const storeUrls = buildUrlsFromStoreItem(storeItem);

    if (storeUrls.length > 0) {
      const value = createResult(appid, appDetails, storeItem, null);

      setCached(appid, value);

      results[appid] = value;
    } else {
      needsPics.push(appid);
    }
  }

  /* ---------------------------------------------------------------------- */
  /* 4. Steam PICS fallback                                                 */
  /* ---------------------------------------------------------------------- */

  if (needsPics.length) {
    /*
     * Limit concurrency so a large Steam
     * library does not hammer the fallback.
     */
    const concurrency = 6;

    for (let i = 0; i < needsPics.length; i += concurrency) {
      const batch = needsPics.slice(i, i + concurrency);

      await Promise.all(
        batch.map(async (appid) => {
          const appDetailsResult = appDetailsResults.find(
            (item) => item.appid === appid,
          );

          const appDetails = appDetailsResult?.data || null;

          const storeItem = itemById.get(appid) || null;

          let picsAppInfo = null;

          try {
            picsAppInfo = await fetchSteamPicsAppInfo(appid);
          } catch {
            picsAppInfo = null;
          }

          const value = createResult(appid, appDetails, storeItem, picsAppInfo);

          setCached(appid, value);

          results[appid] = value;
        }),
      );
    }
  }

  return results;
}

/* -------------------------------------------------------------------------- */
/* API handler                                                                */
/* -------------------------------------------------------------------------- */

export default async function handler(req, res) {
  const queryAppid = req.query?.appid;

  const queryAppids = req.query?.appids;

  let appids = [];

  if (queryAppids) {
    appids = String(queryAppids)
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  } else if (queryAppid) {
    appids = [String(queryAppid).trim()];
  }

  if (!appids.length) {
    res.status(400).json({
      error: "Provide ?appid=123 or ?appids=123,456,789",
    });

    return;
  }

  const invalid = appids.filter((id) => !/^\d+$/.test(id));

  if (invalid.length) {
    res.status(400).json({
      error: "All AppIDs must be numeric.",
      invalid,
    });

    return;
  }

  try {
    const results = await resolveAppids(appids);

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=86400, stale-while-revalidate=604800",
    );

    /* -------------------------------------------------------------------- */
    /* Single AppID                                                         */
    /* -------------------------------------------------------------------- */

    if (appids.length === 1) {
      res.status(200).json(
        results[appids[0]] || {
          found: false,
          appid: Number(appids[0]),
          name: null,
          urls: [],
        },
      );

      return;
    }

    /* -------------------------------------------------------------------- */
    /* Batch response                                                       */
    /* -------------------------------------------------------------------- */

    res.status(200).json({
      results,
    });
  } catch (error) {
    console.error("Steam image resolver error:", error);

    res.status(502).json({
      error: "Unable to resolve Steam artwork.",

      details:
        process.env.NODE_ENV === "development" ? error?.message : undefined,
    });
  }
}
