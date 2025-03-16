(function() {
  const url = window.location.href;
  const courseId = url.match(/courses\/(\d+)/)?.[1];
  const assignmentId = url.match(/assignment_id=(\d+)/)?.[1];
  const studentId = url.match(/student_id=(\d+)/)?.[1];

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

  const versionFooter = document.createElement("div");
  versionFooter.style.marginTop = "20px";
  versionFooter.style.fontSize = "0.8em";
  versionFooter.style.color = "#666";
  versionFooter.textContent = "Version: v11";
  sidebar.appendChild(versionFooter);

  document.body.appendChild(sidebar);

  function extractStudentNameFromDropdown() {
    return document.querySelector(".ui-selectmenu-item-header")?.innerText.trim() || "Unknown Student";
  }

  async function fetchDiscussionId() {
    const res = await fetch(`/api/v1/courses/${courseId}/assignments/${assignmentId}`);
    if (!res.ok) throw new Error("Assignment lookup failed");
    const data = await res.json();
    return data.discussion_topic?.id;
  }

  async function fetchDiscussionPosts(discussionId) {
    const res = await fetch(`/api/v1/courses/${courseId}/discussion_topics/${discussionId}/view`);
    if (!res.ok) throw new Error("Discussion lookup failed");
    return res.json();
  }

  function flattenPosts(entries) {
    let flat = [];

    function recurse(entry) {
      flat.push(entry);
      if (entry.replies && Array.isArray(entry.replies)) {
        entry.replies.forEach(recurse);
      }
    }

    entries.forEach(recurse);
    return flat;
  }

  function renderPosts(studentName, studentId, data) {
    const allPosts = flattenPosts([...(data.view || [])]);
    const userPosts = allPosts
      .filter(post => String(post.user_id) === String(studentId) && post.message)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    status.innerHTML = `<h3>Posts by ${studentName}:</h3>`;

    if (userPosts.length === 0) {
      const none = document.createElement("div");
      none.textContent = `❌ No posts found`;
      none.style.color = "red";
      status.appendChild(none);
      return;
    }

    userPosts.forEach(post => {
      const div = document.createElement("div");
      div.style.marginBottom = "12px";
      div.style.padding = "8px";
      div.style.border = "1px solid #ddd";
      div.style.background = "#fff";
      div.innerHTML = `<strong>${new Date(post.created_at).toLocaleString()}</strong><br>${post.message}`;
      status.appendChild(div);
    });
  }

  async function load() {
    try {
      const studentName = extractStudentNameFromDropdown();
      const discussionId = await fetchDiscussionId();
      if (!discussionId) throw new Error("No discussion ID found");

      const data = await fetchDiscussionPosts(discussionId);
      renderPosts(studentName, studentId, data);
    } catch (err) {
      status.innerHTML = `<span style="color:red;">❌ ${err.message}</span>`;
    }
  }

  load();
})();
