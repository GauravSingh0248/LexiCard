const MAX_PENDING_WORD_LENGTH = 100;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "explain-word",
      title: "Explain with LexiCard",
      contexts: ["selection"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== "explain-word") {
    return;
  }

  const selectedText =
    typeof info.selectionText === "string" ? info.selectionText.trim() : "";

  if (!selectedText) {
    return;
  }

  // Context menus can return multi-word selections; keep only a bounded token.
  const pendingWord = selectedText.slice(0, MAX_PENDING_WORD_LENGTH);

  chrome.storage.local.set({ pendingWord }, () => {
    if (chrome.runtime.lastError) {
      console.error(
        "Failed to store pending word:",
        chrome.runtime.lastError.message,
      );
    }
  });
});
