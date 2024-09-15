//File: content.js
// This script is injected into the webpage to collect URLs
(function() {
    const urls = Array.from(document.querySelectorAll("a")).map(anchor => anchor.href);
    const pageUrl = window.location.href;

    chrome.storage.local.get(['pages'], (result) => {
        const pages = result.pages || {};
        pages[pageUrl] = urls;  // Store the URLs under the current page's URL

        chrome.storage.local.set({ pages }, () => {
            console.log("Collected URLs for the page stored:", pageUrl, urls);
            // Notify the popup that the URLs have been stored
            chrome.runtime.sendMessage({ type: 'urlsCollected', pageUrl });
        });
    });
})();
