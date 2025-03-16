// index.js (DOM-only version v5)
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

  const status = document.createElement("div");
  status.textContent = "Searching for student posts...";
  sidebar.appendChild(status);

  const versionFooter = document.createElement("div");
  versionFooter.style.marginTop = "20px";
  versionFooter.style.fontSize = "0.8em";
  versionFooter.style.color = "#666";
  versionFooter.textContent = "Version: v5";
  sidebar.appendChild(versionFooter);

  document.body.appendChild(sidebar);

  function extractStudentNameFromDropdown() {
    const nameEl = document.querySelector(".ui-selectmenu-item-header");
    return nameEl ? nameEl.innerText.trim() : null;
  }

  function extractPostsFromDOM() {
    const posts = document.querySelectorAll('.discussion_user_content');
    if (!posts || posts.length === 0) {
      status.innerHTML = '<span style="color: red;">❌ No discussion content found in main page.</span>';
      return;
    }

    const studentName = extractStudentNameFromDropdown();
    if (!studentName) {
      status.innerHTML = '<span style="color: red;">❌ Could not detect student name from dropdown.</span>';
      return;
    }

    status.innerHTML = `<h3>Posts by ${studentName}:</h3>`;
    let found = false;
    posts.forEach(post => {
      const fullContent = post.innerText.trim();
      if (fullContent && fullContent.includes(studentName)) {
        const entry = document.createElement("div");
        entry.style.marginBottom = "12px";
        entry.style.padding = "8px";
        entry.style.border = "1px solid #ddd";
        entry.style.background = "#fff";
        entry.textContent = fullContent;
        status.appendChild(entry);
        found = true;
      }
    });

    if (!found) {
      const noMatch = document.createElement("div");
      noMatch.textContent = `❌ No posts found matching "${studentName}".`;
      noMatch.style.color = "red";
      status.appendChild(noMatch);
    }
  }

  setTimeout(extractPostsFromDOM, 1000);
})();
