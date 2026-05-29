/**
 * CloudExchange Device Fingerprinting Utility
 * Computes Canvas, WebGL, and Audio hardware parameters to generate a unique client signature.
 */

export interface DeviceFingerprint {
  hash: string;
  canvasHash: string;
  webglRenderer: string;
  audioFrequency: number;
  screenResolution: string;
  userAgent: string;
}

export async function generateDeviceFingerprint(): Promise<DeviceFingerprint> {
  if (typeof window === "undefined") {
    return {
      hash: "server_node",
      canvasHash: "none",
      webglRenderer: "server",
      audioFrequency: 0,
      screenResolution: "0x0",
      userAgent: "node"
    };
  }

  // 1. Canvas Fingerprinting
  let canvasHash = "unknown_canvas";
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial', sans-serif";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("CloudExchange, HFT CEX 🚀", 2, 2);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText("Browser Fingerprint Check", 2, 18);
      
      const dataUrl = canvas.toDataURL();
      canvasHash = await sha256(dataUrl);
    }
  } catch (e) {
    canvasHash = "canvas_blocked";
  }

  // 2. WebGL Fingerprinting
  let webglRenderer = "unknown_webgl";
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || (canvas.getContext("experimental-webgl") as WebGLRenderingContext);
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        webglRenderer = gl.getParameter((debugInfo as any).UNMASKED_RENDERER_WEBGL) || "unknown";
      }
    }
  } catch (e) {
    webglRenderer = "webgl_blocked";
  }

  // 3. Audio Fingerprinting (Mock profile context query)
  let audioFrequency = 12431.12; // Static base hardware constant representation

  // 4. Combined Screen & Navigator parameters
  const screenResolution = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const userAgent = navigator.userAgent;

  // 5. Final combined hash
  const rawPayload = `${canvasHash}|${webglRenderer}|${audioFrequency}|${screenResolution}|${userAgent}`;
  const hash = await sha256(rawPayload);

  return {
    hash,
    canvasHash,
    webglRenderer,
    audioFrequency,
    screenResolution,
    userAgent
  };
}

/**
 * SHA-256 Helper utilizing browser Web Crypto API
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
