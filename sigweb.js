// NHIF SigWeb Loader - Topaz SigWeb API for signature pad
// Uses https://tablet.sigwebtablet.com:47290/SigWeb/ (127.0.0.1 - CORS open)
// Async XHR to work with Chrome Private Network Access restrictions
(function () {
  var BASE = 'https://tablet.sigwebtablet.com:47290/SigWeb/';
  var Ctx = null;
  var _points = 0;   // cached point count, updated by polling
  var _pollTimer = null;
  var _imgW = 500, _imgH = 100;

  var getBlobURL = (window.URL && URL.createObjectURL.bind(URL)) ||
    (window.webkitURL && webkitURL.createObjectURL.bind(webkitURL)) ||
    window.createObjectURL;
  var revokeBlobURL = (window.URL && URL.revokeObjectURL.bind(URL)) ||
    (window.webkitURL && webkitURL.revokeObjectURL.bind(webkitURL)) ||
    window.revokeObjectURL;

  function asyncGet(path, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', BASE + path, true);
    xhr.onload = function () { if (cb) cb(xhr.status === 200 ? xhr.responseText : ''); };
    xhr.onerror = function () { if (cb) cb(''); };
    try { xhr.send(null); } catch (e) { if (cb) cb(''); }
  }

  function asyncPost(path) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', BASE + path, true);
    xhr.onerror = function () {};
    try { xhr.send(null); } catch (e) {}
  }

  function startPolling() {
    if (_pollTimer) return;
    // Fetch image dimensions once
    asyncGet('ImageXSize', function (v) { _imgW = Number(v) || 500; });
    asyncGet('ImageYSize', function (v) { _imgH = Number(v) || 100; });
    _pollTimer = setInterval(function () {
      asyncGet('TotalPoints', function (v) { _points = Number(v) || 0; });
    }, 150);
  }

  function stopPolling() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    _points = 0;
  }

  function refreshLivePreview() {
    if (!Ctx) return;
    var xhr2 = new XMLHttpRequest();
    xhr2.open('GET', BASE + 'SigImage/0', true);
    xhr2.responseType = 'blob';
    xhr2.onload = function () {
      if (!Ctx || !xhr2.response || !xhr2.response.size) return;
      var img = new Image();
      img.src = getBlobURL(xhr2.response);
      img.onload = function () {
        Ctx.drawImage(img, 0, 0);
        revokeBlobURL(this.src);
        img = null;
      };
    };
    try { xhr2.send(null); } catch (e) {}
  }

  // SetTabletState(1, ctx2d, refreshMs) -> starts capture, returns timer handle
  // SetTabletState(0, timerHandle)      -> stops capture
  window.SetTabletState = function (v, ctxOrTimer, tv) {
    var delay = tv || 100;
    if (v === 1) {
      if (ctxOrTimer && ctxOrTimer.canvas) {
        Ctx = ctxOrTimer;
        asyncPost('DisplayXSize/' + ctxOrTimer.canvas.width);
        asyncPost('DisplayYSize/' + ctxOrTimer.canvas.height);
      }
      asyncPost('TabletState/1');
      startPolling();
      var liveTimer = Ctx ? setInterval(refreshLivePreview, delay) : null;
      return liveTimer;
    } else {
      if (typeof ctxOrTimer === 'number') clearInterval(ctxOrTimer);
      stopPolling();
      Ctx = null;
      asyncPost('TabletState/0');
      return null;
    }
  };

  window.ClearTablet = function () {
    _points = 0;
    asyncGet('ClearSignature', null);
    return '';
  };

  // Synchronous return of cached value - updated every 150ms while capturing
  window.NumberOfTabletPoints = function () {
    return String(_points);
  };

  window.GetSigImageB64 = function (callback) {
    var w = _imgW, h = _imgH;
    var xhr2 = new XMLHttpRequest();
    xhr2.open('GET', BASE + 'SigImage/1', true);
    xhr2.responseType = 'blob';
    xhr2.onload = function () {
      var cvs = document.createElement('canvas');
      cvs.width = w; cvs.height = h;
      var cntx = cvs.getContext('2d');
      var img = new Image();
      img.src = getBlobURL(xhr2.response);
      img.onload = function () {
        cntx.drawImage(img, 0, 0);
        var b64 = cvs.toDataURL('image/png');
        var loc = b64.indexOf('base64,');
        if (callback) callback(loc >= 0 ? b64.slice(loc + 7) : '');
        revokeBlobURL(img.src);
        img = null;
      };
      img.onerror = function () { if (callback) callback(''); };
    };
    xhr2.onerror = function () { if (callback) callback(''); };
    try { xhr2.send(null); } catch (e) { if (callback) callback(''); }
  };

  window.IsSigWebInstalled = function () { return true; };
  window.GetVersionString = function () { return 'SigPlusNET 2.0.0.0'; };
  window.GetSigString = function () { return ''; };

})();
