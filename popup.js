// popup.js
if (typeof browser === "undefined") {
    var browser = chrome;
    globalThis.browser = chrome;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded');
    const tabs = ['urlsTab', 'settingsTab', 'savedTab', 'aboutTab', 'historyTab'];

    tabs.forEach(tab => {
        const tabElement = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
        if (tabElement) {
            tabElement.addEventListener('click', () => switchTab(tab));
        }
    });
    
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        console.log('Querying active tab');
        browser.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: extractUrls
        }, (results) => {
            if (results && results[0] && results[0].result) {
                console.log('URLs extracted from active tab', results[0].result);
                const urls = results[0].result;
                displayUrls(urls);
                saveResults(urls);
                loadHistory();
            } else {
                console.warn('No URLs found or extraction failed', results);
            }
        });
    });

    document.getElementById('exportCsv').addEventListener('click', exportCsv);
    loadSavedResults();
});

document.getElementById('tfidfSort').addEventListener('change', () => {
    console.log('TF-IDF sort changed');
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        console.log('Querying active tab for TF-IDF sort');
        browser.scripting.executeScript({
            target: { tabId: tabs[0].id },
            function: extractUrls
        }, (results) => {
            if (results && results[0] && results[0].result) {
                console.log('URLs extracted for TF-IDF sort', results[0].result);
                let urls = results[0].result;
                if (document.getElementById('tfidfSort').checked) {
                    console.log('Sorting URLs by TF-IDF');
                    urls = calculateTfIdf(urls);
                }
                displayUrls(urls);
            } else{
                console.warn('No URLs found or extraction failed for TF-IDF sort', results);
            }
        });
    });
});


function switchTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    console.log(`Switched to tab: ${tabId}`);
}

function extractUrls() {
    console.log('Extracting URLs from document');
    const urls = Array.from(document.querySelectorAll('a')).map(a => a.href);
    console.log('Extracted URLs', urls);
    return urls;
}

function displayUrls(urls) {
    console.log('Displaying URLs');
    const urlList = document.getElementById('urlList');
    urlList.innerHTML = '';
    urls.forEach(url => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = url;
        a.textContent = url;
        a.target = '_blank';
        li.appendChild(a);
        urlList.appendChild(li);
    });
}

function saveResults(urls) {
    console.log('Saving results');
    const timestamp = new Date().toISOString();
    const result = { timestamp, urls };
    browser.storage.local.get({ savedResults: [] }, (data) => {
        const savedResults = data.savedResults;
        savedResults.push(result);
        browser.storage.local.set({ savedResults }, () => {
            console.log('Results saved');
        });
    });
}

function loadSavedResults() {
    console.log('Loading saved results');
    browser.storage.local.get({ savedResults: [] }, (data) => {
        const savedList = document.getElementById('savedList');
        savedList.innerHTML = '';
        data.savedResults.forEach(result => {
            const li = document.createElement('li');
            li.textContent = `${result.timestamp} - ${result.urls.length} URLs`;
            savedList.appendChild(li);
        });
    });
}

function loadHistory() {
    console.log('Loading history');
    browser.storage.local.get({ savedResults: [] }, (data) => {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        data.savedResults.forEach(result => {
            result.urls.forEach(url => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = url;
                a.textContent = url;
                a.target = '_blank';
                li.appendChild(a);
                historyList.appendChild(li);
            });
        });
    });
}

function exportCsv() {
    console.log('Exporting URLs as CSV');
    browser.storage.local.get({ savedResults: [] }, (data) => {
        const urls = data.savedResults.flatMap(result => result.urls);
        const csvContent = 'data:text/csv;charset=utf-8,' + urls.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'urls.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('CSV exported');
    });
}

  