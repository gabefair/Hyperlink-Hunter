//background.js
if (typeof browser === "undefined") {
    var browser = chrome;
    globalThis.browser = chrome;
}

browser.runtime.onInstalled.addListener(() => {
    console.log("Hyperlink Hunter Extension Installed");
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log(`Received message: ${message}`);
    sendResponse({ response: "Message received" });
});

function keepServiceWorkerAlive() {
    setInterval(() => {
        browser.runtime.sendMessage('keepAlive', (response) => {
            console.log('Keeping service worker alive.');
        });
    }, 25000);
}

keepServiceWorkerAlive();
