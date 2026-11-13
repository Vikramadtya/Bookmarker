const input = document.getElementById("app");
const status = document.getElementById("status");

chrome.storage.sync.get("appUrl").then(({ appUrl }) => {
  if (appUrl) input.value = appUrl;
});

document.getElementById("save").onclick = async () => {
  let origin;
  try {
    origin = new URL(input.value.trim()).origin;
  } catch {
    status.textContent = " Enter a full address, including https://";
    return;
  }
  const granted = await chrome.permissions.request({
    origins: [`${origin}/*`],
  });
  if (!granted) {
    status.textContent = " Permission is needed to save links.";
    return;
  }
  await chrome.storage.sync.set({ appUrl: origin });
  status.textContent = " Saved ✓";
};
