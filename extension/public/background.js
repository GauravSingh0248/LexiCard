// Create context menu when extension is installed

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "explain-word",
    title: "Explain & Save Word",
    contexts: ["selection"],
  });
});

// Handle context menu clicks

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === "explain-word") {
    const selectedWord = info.selectionText?.trim();

    if (!selectedWord) return;

    chrome.storage.local.set({
      pendingWord: selectedWord,
    });
  }
});
