// Runs in isolated world; appends sigweb.js as a real <script> tag so it
// executes in the page's main world — works on every Chrome/Edge version.
var s = document.createElement('script');
s.src = chrome.runtime.getURL('sigweb.js');
s.onload = function () { this.remove(); };
(document.head || document.documentElement).appendChild(s);
