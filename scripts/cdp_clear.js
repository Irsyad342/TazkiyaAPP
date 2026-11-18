const url = process.argv[2];
const ws = new WebSocket(url);
let id = 10;
const send = (method, params = {}, sessionId) =>
  ws.send(JSON.stringify({ id: id++, method, params, ...(sessionId ? { sessionId } : {}) }));
ws.onopen = () => {
  send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  send("Network.enable");
};
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Target.attachedToTarget" && m.params.targetInfo.type === "page") {
    send("Network.enable", {}, m.params.sessionId);
    send("Network.clearBrowserCache", {}, m.params.sessionId);
    setTimeout(() => { console.log("cache cleared"); process.exit(0); }, 800);
  }
};
setTimeout(() => { console.log("timeout"); process.exit(0); }, 6000);
