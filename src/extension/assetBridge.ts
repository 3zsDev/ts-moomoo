declare const chrome: { runtime: { getURL(path: string): string } };

document.documentElement.dataset.tsmoomooAssets = chrome.runtime.getURL("");

// this is if you load the clientside with the extension build, extensions require a specific method for loading sprites