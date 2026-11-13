// Saves the current tab. Talks to the same origin as the web app, so the
// sign-in cookie the app already set is what authenticates these requests.
const $ = (id) => document.getElementById(id);
const message = $("message");

const show = (html) => {
  message.className = "muted";
  message.innerHTML = html;
  $("form").hidden = true;
};

async function api(app, path, options = {}) {
  const response = await fetch(`${app}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (response.status === 401)
    throw Object.assign(new Error("signed out"), { signedOut: true });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
}

async function main() {
  const { appUrl } = await chrome.storage.sync.get("appUrl");
  if (!appUrl) {
    show(
      'Set your Bookmarker address first. <a href="#" id="open-options">Open settings</a>'
    );
    $("open-options").onclick = () => chrome.runtime.openOptionsPage();
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url || !/^https?:/i.test(tab.url))
    return show("This page can't be saved.");

  try {
    const [folders, tags, existing] = await Promise.all([
      api(appUrl, "/api/v1/folders"),
      api(appUrl, "/api/v1/tags").catch(() => []),
      api(
        appUrl,
        `/api/v1/bookmarks/check?url=${encodeURIComponent(tab.url)}`
      ).catch(() => null),
    ]);

    $("title").value = tab.title ?? "";
    for (const folder of folders.filter((f) => !f.isLocked)) {
      const option = new Option(folder.name, folder.id);
      if (folder.isInbox) option.selected = true;
      $("folder").add(option);
    }
    $("known-tags").replaceChildren(...tags.map((t) => new Option(t.tag)));
    if (existing?.exists) {
      $("duplicate").hidden = false;
      $("duplicate").textContent =
        "You already saved this page. Saving adds another copy.";
    }

    message.hidden = true;
    $("form").hidden = false;
    $("title").focus();

    $("form").onsubmit = async (event) => {
      event.preventDefault();
      $("save").disabled = true;
      try {
        await api(appUrl, "/api/v1/bookmarks", {
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
        message.hidden = false;
        show("Saved ✓");
        setTimeout(() => window.close(), 700);
      } catch {
        $("save").disabled = false;
        message.hidden = false;
        message.textContent = "Could not save. Try again.";
      }
    };
  } catch (error) {
    if (error.signedOut)
      show(
        `Sign in first: <a href="${appUrl}" target="_blank" rel="noopener">open Bookmarker</a>, then try again.`
      );
    else show("Could not reach Bookmarker. Check the address in settings.");
  }
}

main();
