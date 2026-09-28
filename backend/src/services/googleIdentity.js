import { OAuth2Client } from "google-auth-library";

const DEFAULT_GOOGLE_CLIENT_ID = "1018503930810-nuht0vf2crgh0k5e5da65f6hb4g3p7qn.apps.googleusercontent.com";
const googleAuthClient = new OAuth2Client();

export async function verifyGoogleIdToken(idToken) {
  if (typeof idToken !== "string" || idToken.length < 100 || idToken.length > 10000 || idToken.split(".").length !== 3) {
    return null;
  }

  const audiences = (process.env.GOOGLE_OAUTH_CLIENT_IDS || DEFAULT_GOOGLE_CLIENT_ID)
    .split(",")
    .map((audience) => audience.trim())
    .filter(Boolean);
  if (!audiences.length) return null;

  try {
    const ticket = await googleAuthClient.verifyIdToken({ idToken, audience: audiences });
    const claims = ticket.getPayload();
    if (!claims?.sub || !(claims.email_verified === true || claims.email_verified === "true") || !claims.email) return null;

    return {
      subject: claims.sub,
      email: String(claims.email).trim().toLowerCase(),
      name: typeof claims.name === "string" ? claims.name.slice(0, 160) : "",
      picture: typeof claims.picture === "string" ? claims.picture.slice(0, 2048) : ""
    };
  } catch {
    return null;
  }
}

export function selfSignupRole(value) {
  if (value === undefined || value === null || value === "") return "student";
  if (["student", "mentor"].includes(value)) return value;
  return null;
}
