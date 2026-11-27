# Bookmarker browser extension

Saves the current tab to Bookmarker, with a folder and tags. One codebase for
Chrome, Edge, Brave and Safari. It signs in with your **capture token**, so it
works in Safari without cookies.

## Connect it (every browser)

1. In Bookmarker open **Settings → Connect** and copy the token (the part after
   `token=` in the email-to-save address).
2. Open the extension's settings, enter your Bookmarker address and the token,
   and allow access when asked.
3. Click the toolbar button or press <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>.

## Chrome / Edge / Brave

Open `chrome://extensions`, turn on **Developer mode**, choose **Load unpacked**
and select this `extension` folder.

## Safari (macOS)

The Xcode project lives in `../safari`. It copies this folder's files, so after
changing the extension run:

```bash
cp extension/* "safari/Bookmarker/Bookmarker Extension/Resources/"
```

Then open `safari/Bookmarker/Bookmarker.xcodeproj` in Xcode, pick your team under
**Signing & Capabilities** for both targets, and press Run. In Safari open
**Settings → Extensions** and enable Bookmarker. For an unsigned local build,
enable **Develop → Allow Unsigned Extensions** (it resets each time Safari quits).
Publishing to the App Store needs a paid Apple Developer account.
