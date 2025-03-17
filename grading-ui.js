// grading-ui.js (version v25 - Refactored Iframe Logic and UI)
(function () {
  let courseId, assignmentId, studentId;

  // Setup UI Container
  const container = document.createElement("div");
  container.style.fontFamily = "Arial, sans-serif";
  container.style.padding = "16px";
  container.innerHTML = `<h2>Canvas Grading Tool</h2><div id="status">Initializing...</div><div id="posts"></div><div id="grade"></div><div style="margin-top:20px; font-size:0.8em; color:#666">Version: v25</div>`;
  document.body.appendChild(container);

  function countWordsSmart(text) {
    if (!text) return 0;
    const plainText = text
      .replace(/<[^>]*>/g, '')
      .replace(/[‘’“”]/g, "'")
      .replace(/[-']/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return plainText ? plainText.split(' ').length : 0;
  }

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    return res.json();
  }

  function flattenPosts(posts) {
    let flat = [];
    function recurse(list) {
      list.forEach(p => {
        flat.push(p);
        if (p.replies && Array.isArray(p.replies)) recurse(p.replies);
      });
    }
    recurse(posts);
    return flat;
  }

  async function loadAndRender() {
    try {
      const assignment = await fetchJSON(`/api/v1/courses/${courseId}/assignments/${assignmentId}`);
      const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;
      const discussionId = assignment.discussion_topic?.id;
      if (!discussionId) throw new Error("No discussion ID found");

      const discussion = await fetchJSON(`/api/v1/courses/${courseId}/discussion_topics/${discussionId}/view`);
      const allPosts = flattenPosts([...discussion.view, ...(discussion.replies || [])]);
      const studentPosts = allPosts.filter(p => String(p.user_id) === String(studentId) && p.message?.trim());

      if (studentPosts.length === 0) {
        document.getElementById("status").innerHTML = `<span style='color:red;'>❌ No posts found for student</span>`;
        return;
      }

      studentPosts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const postSummary = studentPosts.map((p, i) => {
        const wc = countWordsSmart(p.message);
        return `Post ${i + 1} word count: ${wc}`;
      }).join("<br>");
      document.getElementById("posts").innerHTML = `<h4>Summary:</h4>${postSummary}`;

      // Grading logic
      const initialWordCount = countWordsSmart(studentPosts[0].message);
      const numPosts = studentPosts.length;
      const late = dueDate && new Date(studentPosts[0].created_at) > dueDate;

      let score = 10;
      let deductions = [];
      if (initialWordCount < 100 || initialWordCount > 165) {
        score -= 2;
        deductions.push("Word count not within 100–165 (-2)");
      }
      if (numPosts < 2) {
        score -= 4;
        deductions.push("Only one post (-4)");
      }
      if (late) {
        score -= 5;
        deductions.push("Posted after due date (-5)");
      }
      if (score < 2) score = 2;

      const internal = `<h4>Internal Reference:</h4>
        <table style='border-collapse:collapse;'>
          <tr><td style='border:1px solid #ccc;padding:4px;'>Initial Post WC</td><td style='border:1px solid #ccc;padding:4px;'>${initialWordCount}</td></tr>
          <tr><td style='border:1px solid #ccc;padding:4px;'># of Posts</td><td style='border:1px solid #ccc;padding:4px;'>${numPosts}</td></tr>
          <tr><td style='border:1px solid #ccc;padding:4px;'>Late?</td><td style='border:1px solid #ccc;padding:4px;'>${late ? "Yes" : "No"}</td></tr>
          <tr><td style='border:1px solid #ccc;padding:4px;'>Deductions</td><td style='border:1px solid #ccc;padding:4px;'>${deductions.join(", ") || "None"}</td></tr>
          <tr><td style='border:1px solid #ccc;padding:4px;'>Final Score</td><td style='border:1px solid #ccc;padding:4px;'>${score}/10</td></tr>
        </table>`;

      const comment = [
        initialWordCount < 100 || initialWordCount > 165 ? `Your initial post was ${initialWordCount} words, which is outside the 100–165 range. ` : "",
        numPosts < 2 ? "Only one post was submitted, which impacts participation. " : "",
        late ? "The initial post was made after the deadline. " : "",
        deductions.length > 0 ? `Your final score is ${score}/10.` : `Great job! Score: ${score}/10.`
      ].join("").trim();

      document.getElementById("grade").innerHTML = `
        ${internal}<br><br>
        <h4>Proposed Comment:</h4>
        <textarea rows="4" style="width:100%;">${comment}</textarea><br><br>
        <button id="approveBtn">✅ Approve & Fill Grade</button>
      `;

      document.getElementById("approveBtn").onclick = () => {
        parent.postMessage({ type: "submit-grade", score, comment }, "*");
      };
    }
  });
})();
