const LOCAL_API_ORIGIN = "http://localhost:8000";
const PRODUCTION_API_ORIGIN = "https://campustoolkit-api.onrender.com";

function normalizeOrigin(value) {
  return value ? value.trim().replace(/\/+$/, "") : "";
}

function isLocalOrigin(value) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value);
}

function resolveBackendUrl() {
  const configuredUrl = normalizeOrigin(process.env.REACT_APP_BACKEND_URL);
  const isProduction = process.env.NODE_ENV === "production";

  if (configuredUrl) {
    if (isProduction && isLocalOrigin(configuredUrl)) {
      console.warn(
        `Ignoring production API URL "${configuredUrl}" because deployed builds cannot reach localhost.`
      );
      return PRODUCTION_API_ORIGIN;
    }

    return configuredUrl;
  }

  return isProduction ? PRODUCTION_API_ORIGIN : LOCAL_API_ORIGIN;
}

export const BACKEND_URL = resolveBackendUrl();
export const API = `${BACKEND_URL}/api`;
