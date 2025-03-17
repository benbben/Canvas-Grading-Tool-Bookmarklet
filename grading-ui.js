// grading-ui.js (version v28 - Diagnostic Logging and Debug)
(function () {
  console.log("[GradingTool] Initializing script...");
  let courseId, assignmentId, studentId;

  const url = window.location.href;
  const courseMatch = url.match(/courses\/(\d+)/);
  const assignmentMatch = url.match(/assignment_id=(\d+)/);
  const studentMatch = url.match(/student_id=(\d+)/);
  courseId = courseMatch ? courseMatch[1] : null;
  assignmentId = assignmentMatch ? assignmentMatch[1] : null;
  studentId = studentMatch ? studentMatch[1] : null;

  if (!courseId || !assignmentId || !studentId) {
    alert("This tool must be used within the Canvas SpeedGrader page.");
    return;
  }

  const sidebar = document.createElement("div");
  sidebar.id = "gradingToolSidebar";
  sidebar.style.position = "fixed";
  sidebar.style.top = "0";
  sidebar.style.left = "0";
  sidebar.style.width = "400px";
  sidebar.style.height = "100%";
  sidebar.style.zIndex = "9999";
  sidebar.style.background = "#f9f9f9";
  sidebar.style.borderRight = "2px solid #ccc";
  sidebar.style.boxShadow = "4px 0 10px rgba(0,0,0,0.1)";
  sidebar.style.padding = "16px";
  sidebar.style.overflowY = "auto";
  sidebar.style.fontFamily = "Arial, sans-serif";
  sidebar.innerHTML = `<h2>Canvas Grading Tool</h2><div id="status">Initializing...</div><div id="posts"></div><div id="grade"></div><div style="margin-top:20px; font-size:0.8em; color:#666">Version: v28</div>`;
  document.body.appendChild(sidebar);

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

  async function fetchJSON(url) {
    console.log("[GradingTool] Fetching:", url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    return res.json();
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
        const gradeBox = document.getElementById("grading-box-extended");
        if (gradeBox) gradeBox.value = score;

        const iframeComment = Array.from(document.querySelectorAll("iframe")).find(f =>
          f.contentDocument?.body?.id === "tinymce"
        );
        if (iframeComment) {
          const doc = iframeComment.contentDocument || iframeComment.contentWindow.document;
          const body = doc.querySelector("body#tinymce");
          if (body) {
            body.innerHTML = `<p>${comment}</p>`;
          }
        }
      };
    } catch (err) {
      console.error("[GradingTool] loadAndRender error:", err);
      document.getElementById("status").innerHTML = `<span style='color:red;'>❌ ${err.message}</span>`;
    }
  }

  loadAndRender();
})();
