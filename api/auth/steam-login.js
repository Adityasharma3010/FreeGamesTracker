// Step 1 of "Sign in through Steam" — no API key or app registration
// needed for this part; Steam's OpenID 2.0 login is an open, anonymous
// protocol. All this function does is redirect the browser to Steam's
// own login page with the right parameters, including where Steam
// should send the user back to afterward (steam-callback.js).
export default function handler(req, res) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const base = `${proto}://${host}`;

  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": `${base}/api/auth/steam-callback`,
    "openid.realm": base,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });

  res.writeHead(302, { Location: `https://steamcommunity.com/openid/login?${params.toString()}` });
  res.end();
}
