/**
 * ORCH Chrome Capture Snippet
 *
 * Paste this into Chrome DevTools Console BEFORE navigating.
 * Click Start → navigate the app → click Stop → copy JSON output.
 *
 * What it captures:
 * - Every XHR/fetch request with the DOM element that triggered it
 * - Timestamps for sequencing
 * - Parent page URL
 *
 * Usage:
 *   1. Open Chrome DevTools → Console
 *   2. Paste this entire script
 *   3. Call: orchCapture.start()
 *   4. Navigate the app (click links, load pages)
 *   5. Call: orchCapture.stop()
 *   6. Call: copy(orchCapture.export()) — copies JSON to clipboard
 *   7. Save to a file and pass to: node capture.js export.har --snippet actions.json
 */

(function() {
  const actions = [];
  let recording = false;
  let lastClickTarget = null;

  // Track clicks
  document.addEventListener('click', (e) => {
    if (!recording) return;
    const el = e.target.closest('a, button, [role="button"], tr, [data-testid]');
    lastClickTarget = el ? (el.textContent || '').trim().slice(0, 80) : 'unknown';
  }, true);

  // Wrap fetch
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch.apply(this, args);
    if (recording) {
      const url = typeof args[0] === 'string' ? args[0] : args[0].url;
      actions.push({
        action: lastClickTarget ? `click: ${lastClickTarget}` : 'page load',
        endpoint: url,
        method: (args[1]?.method || 'GET').toUpperCase(),
        status: response.status,
        timestamp: new Date().toISOString(),
        parentUrl: window.location.href,
      });
      lastClickTarget = null;
    }
    return response;
  };

  // Wrap XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._orchMethod = method;
    this._orchUrl = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    if (recording) {
      this.addEventListener('load', () => {
        actions.push({
          action: lastClickTarget ? `click: ${lastClickTarget}` : 'page load',
          endpoint: this._orchUrl,
          method: (this._orchMethod || 'GET').toUpperCase(),
          status: this.status,
          timestamp: new Date().toISOString(),
          parentUrl: window.location.href,
        });
        lastClickTarget = null;
      });
    }
    return originalSend.apply(this, arguments);
  };

  window.orchCapture = {
    start() {
      recording = true;
      actions.length = 0;
      console.log('ORCH Capture started. Navigate the app, then call orchCapture.stop()');
    },
    stop() {
      recording = false;
      console.log(`ORCH Capture stopped. ${actions.length} actions recorded.`);
      console.log('Call copy(orchCapture.export()) to copy to clipboard.');
    },
    export() {
      return JSON.stringify(actions, null, 2);
    },
    show() {
      console.table(actions.map(a => ({
        action: a.action,
        endpoint: a.endpoint,
        method: a.method,
        status: a.status,
      })));
    }
  };

  console.log('ORCH Capture loaded. Call orchCapture.start() to begin.');
})();
