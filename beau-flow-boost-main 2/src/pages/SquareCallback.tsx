import { useEffect } from "react";

export default function SquareCallback() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const error = params.get("error");
      if (window.opener) {
        if (code && !error) {
          window.opener.postMessage({ type: "SQUARE_AUTH_SUCCESS", code, state }, "*");
        } else {
          window.opener.postMessage({ type: "SQUARE_AUTH_ERROR", error: error || "unknown_error" }, "*");
        }
      }
    } catch (_) {
    } finally {
      setTimeout(() => window.close(), 300);
    }
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>Square Authorization</h2>
      <p>You can close this window.</p>
    </div>
  );
}


