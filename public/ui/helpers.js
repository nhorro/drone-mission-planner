// Shared DOM helpers for UI modules
(function () {
  function el(id) {
    return document.getElementById(id);
  }

  function secToMinSec(seconds) {
    const m = Math.floor(seconds / 60);
    const r = Math.round(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }

  function download(name, content) {
    const blob = new Blob([content], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  window.UI = { el, secToMinSec, download };
})();
