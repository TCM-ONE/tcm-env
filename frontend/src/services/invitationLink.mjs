const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function parseInvitationLink(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const webRoute = ["http:", "https:"].includes(url.protocol) && url.pathname.replace(/\/$/, "") === "/onboarding/invite";
    const nativeRoute = url.protocol === "com.tcm.app:" && url.hostname === "onboarding" && url.pathname.replace(/\/$/, "") === "/invite";
    if (!webRoute && !nativeRoute) return { isInvitation: false, token: null };

    // Invitation secrets are accepted only from a URL fragment. Query tokens are
    // sent to the web server and may be retained in access logs or referrers.
    const token = new URLSearchParams(url.hash.slice(1)).get("token") || "";
    return { isInvitation: true, token: TOKEN_PATTERN.test(token) ? token : null };
  } catch {
    return { isInvitation: false, token: null };
  }
}

export function captureWebInvitationLink(location, history) {
  if (!location || !history) return { isInvitation: false, token: null };
  const result = parseInvitationLink(location.href);
  if (!result.isInvitation) return result;

  const url = new URL(location.href);
  url.hash = "";
  url.searchParams.delete("token");
  history.replaceState(null, "", `${url.pathname}${url.search}`);
  return result;
}
