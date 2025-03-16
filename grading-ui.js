(async () => {
  // Create side panel
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.right = "0";
  iframe.style.width = "400px";
  iframe.style.height = "100%";
  iframe.style.zIndex = "9999";
  iframe.style.border = "none";
  iframe.style.backgroundColor = "#fff";
  iframe.srcdoc = `
    <html>
      <head>
        <style>
          body {
            font-family: sans-serif;
            padding: 10px;
            background-color: #f9f9f9;
          }
          label, input {
            display: block;
            margin-bottom: 10px;
          }
          textarea {
            width: 100%;
            height: 150px;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <h2>Canvas Grading Tool</h2>
        <label>Course ID: <input id="courseId" /></label>
        <label>Discussion ID: <input id="discussionId" /></label>
        <button onclick="fetchPosts()">Fetch</button>
        <div id="output"></div>
        <script>
          async function fetchPosts() {
            const courseId = document.getElementById("courseId").value;
            const discussionId = document.getElementById("discussionId").value;
            const output = document.getElementById("output");
            output.innerHTML = "Loading...";

            try {
              const res = await fetch(\`/api/v1/courses/\${courseId}/discussion_topics/\${discussionId}/view\`);
              if (!res.ok) throw new Error("Failed to fetch discussion");

              const data = await res.json();
              const entries = data.view || [];

              const posts = entries.map(entry => {
                const user = entry.user?.display_name || "Unknown";
                const message = entry.message || "";
                return \`<b>\${user}:</b><br><pre>\${message.replace(/<[^>]*>?/gm, '')}</pre><hr>\`;
              }).join("");

              output.innerHTML = posts || "No valid posts found.";
            } catch (err) {
              output.innerHTML = "Error: " + err.message;
            }
          }
        </script>
      </body>
    </html>
  `;
  document.body.appendChild(iframe);
})();
