import { useEffect } from "react";

export default function HubSpotCallback() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const error = params.get("error");
      if (window.opener) {
        if (code && !error) {
          window.opener.postMessage({ type: "HUBSPOT_AUTH_SUCCESS", code, state }, "*");
        } else {
          window.opener.postMessage({ type: "HUBSPOT_AUTH_ERROR", error: error || "unknown_error" }, "*");
        }
      }
    } catch (_) {
      // noop
    } finally {
      setTimeout(() => window.close(), 300);
    }
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>HubSpot Authorization</h2>
      <p>You can close this window.</p>
    </div>
  );
}


