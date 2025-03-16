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

  // Create sidebar
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
  status.textContent = "Looking up discussion...";
  sidebar.appendChild(status);

  document.body.appendChild(sidebar);

  // Step 1: Fetch discussions to find the one with matching assignment_id
  const discussionsUrl = `/api/v1/courses/${courseId}/discussion_topics?per_page=100`;

  fetch(discussionsUrl)
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch discussion topics.");
      return res.json();
    })
    .then((discussions) => {
      const match = discussions.find(d => d.assignment_id && d.assignment_id.toString() === assignmentId);
      if (!match) throw new Error("No discussion found for this assignment.");
      const discussionId = match.id;

      // Step 2: Fetch posts in the matched discussion
      const postsUrl = `/api/v1/courses/${courseId}/discussion_topics/${discussionId}/entries?per_page=100`;
      return fetch(postsUrl)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch discussion entries.");
          return res.json();
        });
    })
    .then((entries) => {
      const studentPosts = entries.filter(entry => `${entry.user_id}` === studentId);
      if (studentPosts.length === 0) {
        status.textContent = "No posts found for this student.";
        return;
      }

      status.innerHTML = "<h3>Student Posts:</h3>";
      studentPosts.forEach((post, index) => {
        const postBox = document.createElement("div");
        postBox.style.marginBottom = "12px";
        postBox.style.padding = "10px";
        postBox.style.border = "1px solid #ddd";
        postBox.style.background = "#fff";
        postBox.innerHTML = `<strong>Post ${index + 1}:</strong><br>${post.message}`;
        status.appendChild(postBox);
      });
    })
    .catch((err) => {
      status.textContent = `Error: ${err.message}`;
    });
})();
