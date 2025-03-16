// grading-us.js (version v16 - Strip Apostrophes & Hyphens for Word Count)
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

  const versionFooter = document.createElement("div");
  versionFooter.style.marginTop = "20px";
  versionFooter.style.fontSize = "0.8em";
  versionFooter.style.color = "#666";
  versionFooter.textContent = "Version: v16";
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

  function countWordsSmart(text) {
    if (!text) return 0;
    const cleaned = text
      .replace(/<[^>]*>/g, '')
      .replace(/[’‘]/g, "'")
      .replace(/[-']/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned ? cleaned.split(' ').length : 0;
  }

  function renderPosts(entries) {
    const filtered = entries.filter(entry =>
      entry.user_id == studentId && entry.message && entry.message.trim()
    );

    if (filtered.length === 0) {
      status.innerHTML = `<div style="color:red;">❌ No posts found for student ID ${studentId}</div>`;
      return;
    }

    filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    status.innerHTML = `<h3>Posts by Student:</h3>`;

    filtered.forEach(entry => {
      const wordCount = countWordsSmart(entry.message || "");
      const div = document.createElement("div");
      div.style.marginBottom = "12px";
      div.style.padding = "8px";
      div.style.border = "1px solid #ddd";
      div.style.background = "#fff";
      div.innerHTML = `${entry.message}<br><b>Word Count: ${wordCount}</b>`;
      status.appendChild(div);
    });
  }

  async function loadPosts() {
    try {
      const discussionId = await fetchDiscussionId();
      if (!discussionId) throw new Error("Failed to identify discussion ID");
      const data = await fetchDiscussionPosts(discussionId);
      const entries = [];
      function flatten(posts) {
        posts.forEach(p => {
          entries.push(p);
          if (p.replies && Array.isArray(p.replies)) flatten(p.replies);
        });
      }
      flatten([...data.view, ...(data.replies || [])]);
      renderPosts(entries);
    } catch (err) {
      status.innerHTML = `<span style='color:red;'>❌ ${err.message}</span>`;
    }
  }

  loadPosts();
})();
