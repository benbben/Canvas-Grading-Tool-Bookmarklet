// grading-us.js (version v23 - Sidebar Docked with Responsive Panel)
(function() {
  const url = window.location.href;
  const courseMatch = url.match(/courses\/(\d+)/);
  const assignmentMatch = url.match(/assignment_id=(\d+)/);
  const studentMatch = url.match(/student_id=(\d+)/);

  const courseId = courseMatch ? courseMatch[1] : null;
  const assignmentId = assignmentMatch ? assignmentMatch[1] : null;
  const studentId = studentMatch ? studentMatch[1] : null;

  if (!courseId || !assignmentId || !studentId) {
    alert("This tool must be used within the Canvas SpeedGrader page.");
    return;
  }

  const sidebar = document.createElement("div");
  sidebar.style.position = "fixed";
  sidebar.style.top = "0";
  sidebar.style.right = "0";
  sidebar.style.width = "400px";
  sidebar.style.height = "100%";
  sidebar.style.background = "#f9f9f9";
  sidebar.style.borderLeft = "2px solid #ccc";
  sidebar.style.zIndex = "9999";
  sidebar.style.overflowY = "auto";
  sidebar.style.padding = "16px";
  sidebar.style.fontFamily = "Arial, sans-serif";
  sidebar.style.whiteSpace = "pre-wrap";
  sidebar.style.boxShadow = "-4px 0 10px rgba(0,0,0,0.1)";
  sidebar.style.resize = "horizontal";
  sidebar.style.overflow = "auto";
  sidebar.style.minWidth = "300px";
  sidebar.style.maxWidth = "80vw";

  const title = document.createElement("h2");
  title.textContent = "Canvas Grading Tool";
  sidebar.appendChild(title);

  const status = document.createElement("div");
  status.textContent = "Loading posts...";
  sidebar.appendChild(status);

  const gradeDiv = document.createElement("div");
  gradeDiv.style.marginTop = "20px";
  sidebar.appendChild(gradeDiv);

  const approveBtn = document.createElement("button");
  approveBtn.textContent = "✅ Approve Grade & Insert";
  approveBtn.style.marginTop = "10px";
  approveBtn.style.padding = "8px 12px";
  approveBtn.style.fontWeight = "bold";
  approveBtn.style.cursor = "pointer";
  approveBtn.style.display = "none";
  sidebar.appendChild(approveBtn);

  const versionFooter = document.createElement("div");
  versionFooter.style.marginTop = "20px";
  versionFooter.style.fontSize = "0.8em";
  versionFooter.style.color = "#666";
  versionFooter.textContent = "Version: v23";
  sidebar.appendChild(versionFooter);

  document.body.appendChild(sidebar);

  function countWordsSmart(text) {
    if (!text) return 0;
    const plainText = text
      .replace(/<[^>]*>/g, '')
      .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
      .replace(/[-']/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return plainText ? plainText.split(' ').length : 0;
  }

  async function fetchAssignmentData() {
    const res = await fetch(`/api/v1/courses/${courseId}/assignments/${assignmentId}`);
    if (!res.ok) throw new Error("Assignment lookup failed");
    return res.json();
  }

  async function fetchDiscussionPosts(discussionId) {
    const res = await fetch(`/api/v1/courses/${courseId}/discussion_topics/${discussionId}/view`);
    if (!res.ok) throw new Error("Discussion lookup failed");
    return res.json();
  }

  function flattenPosts(posts) {
    let flat = [];
    function recurse(list) {
      list.forEach(post => {
        flat.push(post);
        if (post.replies && Array.isArray(post.replies)) {
          recurse(post.replies);
        }
      });
    }
    recurse(posts);
    return flat;
  }

  async function loadPostsAndGrade() {
    try {
      const assignmentData = await fetchAssignmentData();
      const dueAt = assignmentData.due_at;
      const discussionId = assignmentData.discussion_topic ? assignmentData.discussion_topic.id : null;
      if (!discussionId) throw new Error("Failed to identify discussion ID");

      const discussionData = await fetchDiscussionPosts(discussionId);
      const allEntries = flattenPosts([...discussionData.view, ...(discussionData.replies || [])]);
      const studentPosts = allEntries.filter(entry =>
        String(entry.user_id) === String(studentId) && entry.message && entry.message.trim()
      );

      if (studentPosts.length === 0) {
        status.innerHTML = `<div style="color:red;">❌ No posts found for student ID ${studentId}</div>`;
        return;
      }

      studentPosts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const initialPost = studentPosts[0];
      const initialWordCount = countWordsSmart(initialPost.message);
      const numPosts = studentPosts.length;

      let score = 10;
      let deductionDetails = [];

      if (initialWordCount < 100 || initialWordCount > 165) {
        score -= 2;
        deductionDetails.push("Word count not within 100–165 (-2)");
      }
      if (numPosts < 2) {
        score -= 4;
        deductionDetails.push("Only one post (-4)");
      }
      if (dueAt) {
        const dueDate = new Date(dueAt);
        const initialPostDate = new Date(initialPost.created_at);
        if (initialPostDate > dueDate) {
          score -= 5;
          deductionDetails.push("Posted after due date (-5)");
        }
      }
      if (score < 2) score = 2;

      let summary = `<h3>Post Summary:</h3>`;
      studentPosts.forEach((post, idx) => {
        const wc = countWordsSmart(post.message);
        summary += `<div>Post ${idx + 1} word count: ${wc}</div>`;
      });

      let rubric = `<h3>Criteria Breakdown:</h3><table style="border-collapse: collapse; width: 100%;">
        <tr><th align="left">Criteria</th><th align="left">Result</th></tr>
        <tr><td>Initial post word count</td><td>${initialWordCount} words</td></tr>
        <tr><td>Total posts</td><td>${numPosts}</td></tr>
        <tr><td>Posted on time</td><td>${!dueAt || new Date(initialPost.created_at) <= new Date(dueAt) ? "✔️" : "❌ Late"}</td></tr>
        <tr><td>Total deductions</td><td>${deductionDetails.length ? deductionDetails.join('; ') : 'None'}</td></tr>
      </table>`;

      let comment = "Thanks for participating in the discussion! ";
      if (deductionDetails.length) {
        comment += deductionDetails.join('. ') + `. Final score: ${score}/10.`;
      } else {
        comment += `You met all expectations. Score: ${score}/10.`;
      }

      status.innerHTML = summary + rubric;
      gradeDiv.innerHTML = `<h3>Grade & Feedback:</h3><p id="auto-feedback">${comment}</p>`;
      approveBtn.style.display = "block";

      approveBtn.onclick = () => {
        const gradeBox = document.getElementById("grading-box-extended");
        if (gradeBox) gradeBox.value = score;

        const iframe = Array.from(document.querySelectorAll("iframe")).find(f =>
          f.contentDocument?.body?.id === "tinymce"
        );
        if (iframe) {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          const body = doc.querySelector("body#tinymce");
          if (body) {
            body.innerHTML = `<p>${comment}</p>`;
          }
        }
      };
    } catch (err) {
      status.innerHTML = `<span style='color:red;'>❌ ${err.message}</span>`;
    }
  }

  loadPostsAndGrade();
})();
