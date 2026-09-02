// Step 2 — Steam redirects the browser back here after login, with a
// set of openid.* query params including a signed assertion. We MUST
// re-verify that assertion by posting it back to Steam (with mode
// switched to check_authentication) before trusting it — otherwise
// anyone could fake this callback with an arbitrary claimed_id and
// impersonate any Steam account. This verification step is the whole
// point of OpenID; skipping it would make the login meaningless.
export default async function handler(req, res) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const base = `${proto}://${host}`;

  try {
    const params = new URLSearchParams(req.query);
    params.set("openid.mode", "check_authentication");

    const verifyRes = await fetch("https://steamcommunity.com/openid/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(8000),
    });
    const text = await verifyRes.text();

    if (!text.includes("is_valid:true")) {
      res.writeHead(302, { Location: `${base}/?steamAuthError=1` });
      res.end();
      return;
    }

    const claimedId = req.query["openid.claimed_id"];
    const match = typeof claimedId === "string" && claimedId.match(/\/id\/(\d+)$/);
    const steamid = match ? match[1] : null;

    if (!steamid) {
      res.writeHead(302, { Location: `${base}/?steamAuthError=1` });
      res.end();
      return;
    }

    // Hand the verified ID to the frontend via a query param on the
    // homepage — SteamContext.jsx picks this up on load, stores it the
    // same way a manually-entered ID is stored, then strips it from the
    // URL so it isn't left sitting in the address bar or browser history.
    res.writeHead(302, { Location: `${base}/?steamid=${steamid}` });
    res.end();
  } catch {
    res.writeHead(302, { Location: `${base}/?steamAuthError=1` });
    res.end();
  }
}
