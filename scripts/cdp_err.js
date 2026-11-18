/* Tangkap exception halaman via CDP — auto-attach ke semua target (flatten) */
const url = process.argv[2];
const target = process.argv[3];
const ws = new WebSocket(url);
const seen = [];
let id = 10;
const send = (method, params = {}, sessionId) =>
  ws.send(JSON.stringify({ id: id++, method, params, ...(sessionId ? { sessionId } : {}) }));
ws.onopen = () => {
  send("Runtime.enable");
  send("Page.enable");
  send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  if (target && target !== "stay") send("Page.navigate", { url: target });
};
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Target.attachedToTarget") {
    const sid = m.params.sessionId;
    if (m.params.targetInfo.type === "page") {
      send("Runtime.enable", {}, sid);
      send("Page.enable", {}, sid);
    }
    return;
  }
  if (m.method === "Runtime.exceptionThrown") {
    const d = m.params.exceptionDetails;
    const txt = d.exception?.description || d.exception?.value || d.text || "";
    seen.push("[EXC] " + txt.slice(0, 900));
  }
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
    seen.push("[ERR] " + m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 500));
  }
};
setTimeout(() => {
  console.log(seen.length ? seen.join("\n---\n") : "(tidak ada exception tertangkap)");
  process.exit(0);
}, 45000);
