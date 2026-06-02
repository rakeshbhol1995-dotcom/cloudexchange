export const getApiUrl = () => {
  if (typeof window !== "undefined") {
    // If running in production (e.g. cloudexchange.in or the EC2 IP)
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "/api";
    }
  }
  return "http://localhost:3002/api";
};

export const API_URL = getApiUrl();
