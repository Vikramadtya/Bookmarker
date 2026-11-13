const ext = globalThis.browser ?? chrome;
const app = document.getElementById("app");
const token = document.getElementById("token");
const status = document.getElementById("status");

ext.storage.local.get(["appUrl", "token"]).then((saved) => {
  if (saved.appUrl) app.value = saved.appUrl;
  if (saved.token) token.value = saved.token;
});

document.getElementById("save").onclick = async () => {
  let origin;
  try {
    origin = new URL(app.value.trim()).origin;
  } catch {
    status.textContent = " Enter a full address, including https://";
    return;
  }
  const key = token.value.trim();
  if (!/^[a-f0-9]{48}$/.test(key)) {
    status.textContent = " That doesn't look like a capture token.";
    return;
  }
  try {
    const granted = await ext.permissions.request({ origins: [`${origin}/*`] });
    if (!granted) {
      status.textContent = " Permission is needed to save links.";
      return;
    }
  } catch {
    // Some browsers grant access when the extension is enabled instead.
  }
  try {
    const res = await fetch(
      `${origin}/api/v1/inbound/folders?token=${encodeURIComponent(key)}`
    );
    if (!res.ok) throw new Error();
  } catch {
    status.textContent = " Could not connect. Check the address and token.";
    return;
  }
  await ext.storage.local.set({ appUrl: origin, token: key });
  status.textContent = " Connected ✓";
};
