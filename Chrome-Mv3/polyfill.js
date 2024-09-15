// polyfill.js
if (typeof browser === "undefined") {
    var browser = chrome;
    globalThis.browser = chrome;
  }  