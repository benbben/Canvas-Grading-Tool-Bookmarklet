// index.js

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

  // Create sidebar container
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

  const info = document.createElement("p");
  info.textContent = `Course: ${courseId}, Assignment: ${assignmentId}, Student: ${studentId}`;
  sidebar.appendChild(info);

  const status = document.createElement("div");
  status.textContent = "Fetching discussion posts...";
  sidebar.appendChild(status);

  document.body.appendChild(sidebar);

  // Fetch discussion posts (fallback to safe API GET if needed)
  const apiUrl = `/api/v1/courses/${courseId}/discussion_topics/${assignmentId}/entries`;

  fetch(apiUrl)
    .then((res) => {
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    })
    .then((data) => {
      const posts = data.filter(post => `${post.user_id}` === studentId);
      if (posts.length === 0) {
        status.textContent = "No valid posts found for this student.";
        return;
      }

      status.innerHTML = "<h3>Posts:</h3>";
      posts.forEach(post => {
        const entry = document.createElement("div");
        entry.style.marginBottom = "12px";
        entry.style.padding = "8px";
        entry.style.border = "1px solid #ddd";
        entry.style.background = "#fff";
        entry.innerHTML = `<strong>${post.user_name}:</strong><br>${post.message}`;
        status.appendChild(entry);
      });
    })
    .catch((err) => {
      status.textContent = `Error fetching posts: ${err.message}`;
    });
})();
