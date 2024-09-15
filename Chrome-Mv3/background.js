//background.js
if (typeof browser === "undefined") {
    var browser = chrome;
    globalThis.browser = chrome;
}

browser.runtime.onInstalled.addListener(() => {
    console.log("Hyperlink Hunter Installed");
  });
  
  // Message listener to handle various tasks
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "keepAlive") {
      sendResponse({ status: "Service Worker is active" });
    } else if (message.type === "logUrls") {
      console.log("Logging extracted URLs", message.urls);
      sendResponse({ status: "Logged" });
    } else {
      sendResponse({ status: "Unhandled message type" });
    }
  });
  