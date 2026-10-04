/* Shared behaviour for every page. */
(function () {
  var site = window.SITE || {};
  document.querySelectorAll('[data-link]').forEach(function (a) {
    var url = site[a.getAttribute('data-link')];
    if (url) a.href = url;
  });
})();
