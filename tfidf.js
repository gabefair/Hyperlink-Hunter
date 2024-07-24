//tfidf.js
function calculateTfIdf(urls) {
    const termFreq = {};
    const docFreq = {};
    const tfidf = {};

    // Calculate term frequency
    urls.forEach(url => {
        const words = url.split(/[\s/]+/);
        words.forEach(word => {
            if (!termFreq[word]) {
                termFreq[word] = 0;
            }
            termFreq[word]++;
        });
    });

    // Calculate document frequency
    Object.keys(termFreq).forEach(term => {
        docFreq[term] = urls.reduce((count, url) => {
            return count + (url.includes(term) ? 1 : 0);
        }, 0);
    });

    // Calculate TF-IDF
    Object.keys(termFreq).forEach(term => {
        tfidf[term] = termFreq[term] * Math.log(urls.length / (docFreq[term] || 1));
    });

    // Sort URLs by TF-IDF score
    return urls.sort((a, b) => {
        const aScore = a.split(/[\s/]+/).reduce((sum, word) => sum + (tfidf[word] || 0), 0);
        const bScore = b.split(/[\s/]+/).reduce((sum, word) => sum + (tfidf[word] || 0), 0);
        return bScore - aScore;
    });
}
