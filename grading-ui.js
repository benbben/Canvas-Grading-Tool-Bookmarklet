// index.js (version v9 – student ID filtering, display name optional)
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

  // Sidebar UI
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

  const title = document.createElement("h2");
  title.textContent = "Canvas Grading Tool";
  sidebar.appendChild(title);

  const status = document.createElement("div");
  status.textContent = "Loading posts...";
  sidebar.appendChild(status);

  const versionFooter = document.createElement("div");
  versionFooter.style.marginTop = "20px";
  versionFooter.style.fontSize = "0.8em";
  versionFooter.style.color = "#666";
  versionFooter.textContent = "Version: v9";
  sidebar.appendChild(versionFooter);

  document.body.appendChild(sidebar);

  async function fetchDiscussionId() {
    const res = await fetch(`/api/v1/courses/${courseId}/assignments/${assignmentId}`);
    if (!res.ok) throw new Error("Assignment lookup failed");
    const data = await res.json();
    return data.discussion_topic ? data.discussion_topic.id : null;
  }

  async function fetchDiscussionPosts(discussionId) {
    const res = await fetch(`/api/v1/courses/${courseId}/discussion_topics/${discussionId}/view`);
    if (!res.ok) throw new Error("Discussion lookup failed");
    return res.json();
  }

  function renderPosts(posts) {
    status.innerHTML = `<h3>Posts by Student ID ${studentId}:</h3>`;
    let found = false;

    posts.forEach(entry => {
      const userId = String(entry.user_id || "");
      const message = entry.message || "";
      if (userId === studentId && message.trim()) {
        const div = document.createElement("div");
        div.style.marginBottom = "12px";
        div.style.padding = "8px";
        div.style.border = "1px solid #ddd";
        div.style.background = "#fff";
        div.innerHTML = message;
        status.appendChild(div);
        found = true;
      }
    });

    if (!found) {
      const none = document.createElement("div");
      none.textContent = `❌ No posts found for Student ID ${studentId}`;
      none.style.color = "red";
      status.appendChild(none);
    }
  }

  async function loadPosts() {
    try {
      const discussionId = await fetchDiscussionId();
      if (!discussionId) throw new Error("Failed to identify discussion ID");
      const data = await fetchDiscussionPosts(discussionId);
      const entries = [...data.view, ...(data.replies || [])];
      renderPosts(entries);
    } catch (err) {
      status.innerHTML = `<span style='color:red;'>❌ ${err.message}</span>`;
    }
  }

  loadPosts();
})();
