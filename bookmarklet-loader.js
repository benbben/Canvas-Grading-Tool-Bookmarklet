// bookmarklet-loader.js (Direct sidebar injection version for grading-ui.js)
(function () {
  const existing = document.getElementById("gradingToolSidebar");
  if (existing) {
    alert("Grading tool is already loaded.");
    return;
  }

  const script = document.createElement("script");
  script.src = "https://benbben.github.io/Canvas-Grading-Tool-Bookmarklet/grading-ui.js?v=" + Date.now();
  script.type = "text/javascript";
  document.body.appendChild(script);
})();
