/* =====================================================================
   test-n8n.js  -  connection checker. Sends a real browser request to
   the webhook and explains whatever comes back in plain English.
   ===================================================================== */

const urlBox = document.getElementById("url");
const out    = document.getElementById("result");

const TEST_URL = window.CONFIG.TEST_URL || "";
const PROD_URL = TEST_URL.replace("/webhook-test/", "/webhook/");

urlBox.value = TEST_URL;

document.getElementById("useProd").addEventListener("click", () => { urlBox.value = PROD_URL; });
document.getElementById("useTest").addEventListener("click", () => { urlBox.value = TEST_URL; });

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function show(kind, title, body, detail) {
  const cls = kind === "ok" ? "verdict" : "verdict bad";
  out.innerHTML = `
    <div class="card">
      <p class="${cls}" style="margin-top:0;font-size:.95rem">${esc(title)}</p>
      <p style="font-size:.9rem;color:var(--ink-soft);margin-top:12px;line-height:1.65">${body}</p>
      ${detail ? `<pre style="margin-top:14px;padding:13px;background:var(--surface-2);
        border:1px solid var(--line);border-radius:9px;font-size:.78rem;
        overflow-x:auto;white-space:pre-wrap;word-break:break-word">${esc(detail)}</pre>` : ""}
    </div>`;
}

document.getElementById("run").addEventListener("click", async () => {
  const url = urlBox.value.trim();
  const btn = document.getElementById("run");

  if (!url) { show("bad", "No URL", "Paste your webhook URL above first."); return; }

  if (url.includes("vercel.app") || url.includes(".html")) {
    show("bad", "That is your website URL, not the n8n URL",
      "The n8n webhook URL looks like <code>https://mohamadfayoumi.app.n8n.cloud/webhook/website</code>. " +
      "Your own site address never goes in the Path field in n8n.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Sending...";
  out.innerHTML = '<div class="loading"><span class="spinner"></span> Sending a POST request to n8n...</div>';

  const payload = { action: "test", hello: "world", sent_at: new Date().toISOString() };
  let res;

  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    show("bad", "Blocked before it reached n8n — almost certainly CORS",
      "The browser refused the request. In your n8n Webhook node open " +
      "<strong>Options &rarr; Add option &rarr; Allowed Origins (CORS)</strong> and set it to <code>*</code>, " +
      "then Publish again.<br><br>" +
      "The other possibility is the URL is wrong or the workflow is not running. " +
      "If you are using the Test URL, you must click <strong>Listen for test event</strong> in n8n first — " +
      "it only accepts one request per click.",
      "Browser error: " + err.message);
    btn.disabled = false;
    btn.textContent = "Send test request";
    return;
  }

  const text = await res.text();

  if (res.status === 404) {
    show("bad", "n8n answered 404 — no webhook at that address",
      "n8n is reachable, but nothing is listening on that path. Usually one of:<br><br>" +
      "&bull; The workflow is not <strong>Published</strong> (needed for the Production URL)<br>" +
      "&bull; You are using the Test URL without clicking <strong>Listen for test event</strong><br>" +
      "&bull; The Path in the Webhook node does not match the URL",
      text.slice(0, 600));
  } else if (!res.ok) {
    show("bad", "n8n answered " + res.status,
      "The request got through — CORS is fine — but the workflow errored. " +
      "Open the <strong>Executions</strong> tab in n8n to see which node failed.",
      text.slice(0, 900));
  } else {
    let pretty = text;
    try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch (e) {}

    if (text.includes("{{")) {
      show("bad", "Connected, but the response is broken",
        "n8n replied, but it sent the expression back as literal text instead of running it. " +
        "In your <strong>Respond to Webhook</strong> node, the Response Body must start with " +
        "<code>=</code> before the <code>{{</code>.",
        pretty.slice(0, 900));
    } else {
      show("ok", "Connected. The website can talk to n8n.",
        "CORS is configured correctly and n8n sent a real response. " +
        "Here is exactly what came back:",
        pretty.slice(0, 1200));
    }
  }

  btn.disabled = false;
  btn.textContent = "Send test request";
});
