(async () => {
  const sidebar = document.createElement("div");
  sidebar.style.position = "fixed";
  sidebar.style.top = "0";
  sidebar.style.right = "0";
  sidebar.style.width = "400px";
  sidebar.style.height = "100vh";
  sidebar.style.backgroundColor = "white";
  sidebar.style.borderLeft = "2px solid #ccc";
  sidebar.style.zIndex = "9999";
  sidebar.style.overflowY = "auto";
  sidebar.style.padding = "16px";
  sidebar.style.fontFamily = "Arial, sans-serif";
  sidebar.style.whiteSpace = "pre-wrap"; // ensures text wraps
  document.body.appendChild(sidebar);

  const header = document.createElement("h2");
  header.textContent = "Canvas Grading Tool";
  sidebar.appendChild(header);

  // Extract course_id, assignment_id, student_id from URL
  const urlParams = new URLSearchParams(window.location.search);
  const courseId = window.location.pathname.split("/")[2];
  const assignmentId = urlParams.get("assignment_id");
  const studentId = urlParams.get("student_id");

  const info = document.createElement("div");
  info.innerHTML = `
    <p><strong>Course ID:</strong> ${courseId}</p>
    <p><strong>Assignment ID:</strong> ${assignmentId}</p>
    <p><strong>Student ID:</strong> ${studentId}</p>
    <button id="fetchBtn">Load Posts</button>
  `;
  sidebar.appendChild(info);

  const results = document.createElement("div");
  results.id = "results";
  results.style.marginTop = "20px";
  sidebar.appendChild(results);

  document.getElementById("fetchBtn").addEventListener("click", async () => {
    results.innerHTML = "<p><em>Loading...</em></p>";
    try {
      // Fetch all discussion topics for this course
      const topicsRes = await fetch(
        `https://${window.location.hostname}/api/v1/courses/${courseId}/discussion_topics?per_page=100`,
        { credentials: "include" }
      );
      const topics = await topicsRes.json();

      // Try to find the matching discussion topic by assignment_id
      const matchingTopic = topics.find(
        (topic) => topic.assignment_id && topic.assignment_id.toString() === assignmentId
      );

      if (!matchingTopic) {
        results.innerHTML = "<p><strong>No matching discussion found for this assignment.</strong></p>";
        return;
      }

      const discussionId = matchingTopic.id;

      // Fetch entries for that discussion
      const entriesRes = await fetch(
        `https://${window.location.hostname}/api/v1/courses/${courseId}/discussion_topics/${discussionId}/entries?per_page=100`,
        { credentials: "include" }
      );
      const entries = await entriesRes.json();

      const studentEntries = entries.filter((entry) => entry.user_id.toString() === studentId);

      if (studentEntries.length === 0) {
        results.innerHTML = "<p><strong>No valid posts found for this student.</strong></p>";
        return;
      }

      results.innerHTML = "<h3>Student Posts:</h3>";
      studentEntries.forEach((entry, i) => {
        const postDiv = document.createElement("div");
        postDiv.style.marginBottom = "16px";
        postDiv.innerHTML = `<strong>Post ${i + 1}:</strong><br>${entry.message}`;
        results.appendChild(postDiv);
      });
    } catch (error) {
      results.innerHTML = `<p><strong>Error:</strong> ${error.message}</p>`;
    }
  });
})();
