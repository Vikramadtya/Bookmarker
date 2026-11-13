// Saves the current tab using the capture token, so it works the same in
// Chrome and Safari without depending on third-party cookies.
const ext = globalThis.browser ?? chrome;
const $ = (id) => document.getElementById(id);
const message = $("message");

const show = (html) => {
  message.hidden = false;
  message.className = "muted";
  message.innerHTML = html;
  $("form").hidden = true;
};

async function api(app, token, path, options = {}) {
  const response = await fetch(
    `${app}/api/v1/inbound/${path}?token=${encodeURIComponent(token)}`,
    {
      ...options,
      headers: options.body ? { "Content-Type": "application/json" } : {},
    }
  );
  if (response.status === 404)
    throw Object.assign(new Error("bad token"), { badToken: true });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function main() {
  const { appUrl, token } = await ext.storage.local.get(["appUrl", "token"]);
  if (!appUrl || !token) {
    show(
      'Connect Bookmarker first. <a href="#" id="open-options">Open settings</a>'
    );
    $("open-options").onclick = () => ext.runtime.openOptionsPage();
    return;
  }

  const [tab] = await ext.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:/i.test(tab.url))
    return show("This page can't be saved.");

  try {
    const folders = await api(appUrl, token, "folders");
    $("title").value = tab.title ?? "";
    for (const folder of folders) {
      const option = new Option(folder.name, folder.id);
      if (folder.isInbox) option.selected = true;
      $("folder").add(option);
    }
    message.hidden = true;
    $("form").hidden = false;
    $("title").focus();

    $("form").onsubmit = async (event) => {
      event.preventDefault();
      $("save").disabled = true;
      try {
        await api(appUrl, token, "save", {
          method: "POST",
          body: JSON.stringify({
            bookmarkURL: tab.url,
            title: $("title").value.trim(),
            folderId: $("folder").value,
            tags: $("tags")
              .value.split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          }),
        });
        show("Saved ✓");
        setTimeout(() => window.close(), 700);
      } catch {
        $("save").disabled = false;
        message.hidden = false;
        message.textContent = "Could not save. Try again.";
      }
    };
  } catch (error) {
    if (error.badToken)
      show(
        'Your token was rejected. <a href="#" id="open-options">Update it in settings</a>.'
      );
    else show("Could not reach Bookmarker. Check the address in settings.");
    $("open-options")?.addEventListener("click", () =>
      ext.runtime.openOptionsPage()
    );
  }
}

main();
