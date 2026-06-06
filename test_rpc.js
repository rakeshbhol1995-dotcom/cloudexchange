const http = require("http");
const req = http.request("http://127.0.0.1:3002/api/goldchain-rpc", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  }
}, res => {
  let body = "";
  res.on("data", chunk => body += chunk);
  res.on("end", () => {
    console.log("Status:", res.statusCode);
    console.log("Headers:", res.headers);
    console.log("Body:", body);
  });
});
req.on("error", err => console.error("Error:", err.message));
req.write(JSON.stringify({jsonrpc: "2.0", method: "gold_blockNumber", params: [], id: 1}));
req.end();
