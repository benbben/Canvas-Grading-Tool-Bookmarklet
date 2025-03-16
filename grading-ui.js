// index.js (version v8 - relaxed name matching and debug logging)
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

  const title = document.createElement("h2");
  title.textContent = "Canvas Grading Tool";
  sidebar.appendChild(title);

  const status = document.createElement("div");
  status.textContent = "Loading posts...";
  sidebar.appendChild(status);

  const debug = document.createElement("div");
  debug.style.marginTop = "10px";
  debug.style.fontSize = "0.8em";
  debug.style.color = "#555";
  sidebar.appendChild(debug);

  const versionFooter = document.createElement("div");
  versionFooter.style.marginTop = "20px";
  versionFooter.style.fontSize = "0.8em";
  versionFooter.style.color = "#666";
  versionFooter.textContent = "Version: v8";
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

  function extractStudentNameFromDropdown() {
    const nameEl = document.querySelector(".ui-selectmenu-item-header");
    return nameEl ? nameEl.innerText.trim() : null;
  }

  function renderPosts(studentName, posts) {
    const normalizedStudent = studentName.toLowerCase().replace(/[^\w\s]/g, "").trim();
    let found = false;
    status.innerHTML = `<h3>Posts by ${studentName}:</h3>`;
    debug.innerHTML = "👀 Names in discussion:<br>";

    posts.forEach(entry => {
      const name = (entry.user_display_name || "").trim();
      const norm = name.toLowerCase().replace(/[^\w\s]/g, "");
      debug.innerHTML += `– ${name}<br>`;
      if (norm.includes(normalizedStudent) && entry.message?.trim()) {
        const div = document.createElement("div");
        div.style.marginBottom = "12px";
        div.style.padding = "8px";
        div.style.border = "1px solid #ddd";
        div.style.background = "#fff";
        div.innerHTML = entry.message;
        status.appendChild(div);
        found = true;
      }
    });

    if (!found) {
      const none = document.createElement("div");
      none.textContent = `❌ No posts found for ${studentName}`;
      none.style.color = "red";
      status.appendChild(none);
    }
  }

  async function loadPosts() {
    try {
      const studentName = extractStudentNameFromDropdown();
      if (!studentName) throw new Error("Could not extract student name");
      const discussionId = await fetchDiscussionId();
      if (!discussionId) throw new Error("Failed to identify discussion ID");
      const data = await fetchDiscussionPosts(discussionId);
      const entries = [...data.view, ...(data.replies || [])];
      renderPosts(studentName, entries);
    } catch (err) {
      status.innerHTML = `<span style='color:red;'>❌ ${err.message}</span>`;
    }
  }

  loadPosts();
})();
