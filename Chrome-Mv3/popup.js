// popup.js
if (typeof browser === "undefined") {
    var browser = chrome;
    globalThis.browser = chrome;
}

document.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    setupEventListeners();
    loadAndDisplayUrls();

    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'urlsCollected') {
            console.log("Message received: URLs collected for page:", message.pageUrl);
            loadAndDisplayUrls();
        }
    });
});

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-navigation button');
    const tabContents = document.querySelectorAll('.tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });
}

function loadAndDisplayUrls() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentPageUrl = tabs[0].url;

        chrome.storage.local.get(['pages'], (result) => {
            const pages = result.pages || {};
            let urlList = pages[currentPageUrl] || [];

            // Apply selected settings
            urlList = applyFilters(urlList, currentPageUrl);

            const urlCounts = countUrls(urlList);

            // Convert the urlCounts object into an array of [url, count] pairs
            const tableData = Object.entries(urlCounts);

            if (tableData.length === 0) {
                console.log("No URLs found for this page.");
                return;
            }

            initializeTable(tableData);
        });
    });
}

function initializeTable(tableData) {
    if ($.fn.DataTable.isDataTable('#url-table')) {
        $('#url-table').DataTable().clear().destroy();
        $('#url-table tbody').empty();
    }

    $('#url-table').DataTable({
        data: tableData,
        columns: [
            { 
                data: null,
                defaultContent: '<input type="checkbox" class="url-checkbox">',
                orderable: false,
                width: '5%'
            },
            { data: 0, title: "URL", className: 'url-cell', width: '87%'},
            { data: 1, title: "Count", width: '8%' }
        ],
        destroy: true,
        responsive: false,
        scrollY: 300,
        paging: false,
        autoWidth: true,
        order: [[2, 'desc']] //sort by count column
    });

    // Handle the select all checkbox
    $('#selectAll').off('click').on('click', function() {
        const isChecked = $(this).is(':checked');
        $('.url-checkbox').prop('checked', isChecked);
    });
}

function applyFilters(urlList, currentPageUrl) {
    const isTfIdfSort = document.getElementById('tfidfSort').checked;
    const isSameDomain = document.getElementById('sameDomain').checked;
    const isExternalUrls = document.getElementById('externalUrls').checked;

    const currentHost = new URL(currentPageUrl).hostname;

    if (isSameDomain) {
        urlList = urlList.filter(url => new URL(url).hostname === currentHost);
    }
    if (isExternalUrls) {
        urlList = urlList.filter(url => new URL(url).hostname !== currentHost);
    }

    if (isTfIdfSort) {
        urlList = calculateTfIdf(urlList);
    }

    return urlList;
}

function countUrls(urlList) {
    return urlList.reduce((counts, url) => {
        counts[url] = (counts[url] || 0) + 1;
        return counts;
    }, {});
}

function setupEventListeners() {
    document.getElementById('exportCsv').addEventListener('click', exportCsv);
    document.getElementById('archiveUrls').addEventListener('click', handleArchiveUrls);

    document.getElementById('tfidfSort').addEventListener('change', loadAndDisplayUrls);
    document.getElementById('sameDomain').addEventListener('change', loadAndDisplayUrls);
    document.getElementById('externalUrls').addEventListener('change', loadAndDisplayUrls);
}

function exportCsv() {
    const selectedUrls = getSelectedUrls();
    if (selectedUrls.length === 0) {
        alert('No URLs selected.');
        return;
    }

    const headers = ['URL', 'Count'];
    const csvRows = [headers.join(',')];

    selectedUrls.forEach(({ url, count }) => {
        csvRows.push(`"${url}",${count}`);
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = csvUrl;
    link.download = 'urls.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleArchiveUrls() {
    const selectedUrls = getSelectedUrls();
    if (selectedUrls.length === 0) {
        alert('No URLs selected.');
        return;
    }

    fetch('https://unclegrape.com/addurl/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'API_KEY'
        },
        body: JSON.stringify({ urls: selectedUrls })
    })
    .then(response => response.json())
    .then(result => {
        alert(result.status === 'success' ? 'URLs archived successfully.' : `Error: ${result.message}`);
    })
    .catch(error => {
        alert(`Error: ${error.message}`);
    });
}

function getSelectedUrls() {
    const selectedUrls = [];
    $('#url-table tbody tr').each(function() {
        const checkbox = $(this).find('.url-checkbox');
        if (checkbox.is(':checked')) {
            const url = $(this).find('td:eq(1)').text();
            const count = parseInt($(this).find('td:eq(2)').text(), 10);
            selectedUrls.push({ url, count });
        }
    });
    return selectedUrls;
}

// Calculate and sort URLs using TF-IDF
function calculateTfIdf(urls) {
    const termFreq = {};
    const docFreq = {};
    const tfidf = {};
    const totalDocs = urls.length;

    // Tokenization function: Split URL into domain, path, and query params
    function tokenizeUrl(url) {
        const urlObj = new URL(url);
        const domainTokens = urlObj.hostname.split('.');
        const pathTokens = urlObj.pathname.split('/').filter(Boolean);
        const queryTokens = new URLSearchParams(urlObj.search).toString().split('&');
        return [...domainTokens, ...pathTokens, ...queryTokens];
    }

    // Define stopwords (common, non-meaningful tokens)
    const stopwords = ['http', 'https', 'www', 'com', 'net', 'org'];

    // Function to filter out stopwords
    function filterTokens(tokens) {
        return tokens.filter(token => !stopwords.includes(token.toLowerCase()));
    }

    // Calculate term frequency and document frequency
    urls.forEach(url => {
        const tokens = filterTokens(tokenizeUrl(url));

        tokens.forEach(token => {
            // Increase term frequency for this URL
            if (!termFreq[token]) {
                termFreq[token] = 0;
            }
            termFreq[token]++;

            // Increase document frequency for this token
            if (!docFreq[token]) {
                docFreq[token] = 0;
            }
            docFreq[token]++;
        });
    });

    // Calculate TF-IDF for each term
    Object.keys(termFreq).forEach(term => {
        const tf = termFreq[term] / totalDocs;  // Term Frequency
        const idf = Math.log(totalDocs / (docFreq[term] || 1));  // Inverse Document Frequency
        tfidf[term] = tf * idf;
    });

    // Sort URLs by total TF-IDF score
    return urls.sort((a, b) => {
        const aTokens = filterTokens(tokenizeUrl(a));
        const bTokens = filterTokens(tokenizeUrl(b));

        const aScore = aTokens.reduce((sum, token) => sum + (tfidf[token] || 0), 0);
        const bScore = bTokens.reduce((sum, token) => sum + (tfidf[token] || 0), 0);

        return bScore - aScore;  // Sort in descending order of score
    });
}
