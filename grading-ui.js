// index.js (DOM-only version, with student name filtering)
(function () {
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

  document.body.appendChild(sidebar);

  // Extract visible posts in SpeedGrader for the active student
  function extractPostsFromDOM() {
    const frame = document.querySelector('iframe#speedgrader_iframe');
    if (!frame) {
      status.textContent = "Could not locate SpeedGrader iframe.";
      return;
    }

    const iframeDoc = frame.contentDocument || frame.contentWindow.document;
    if (!iframeDoc) {
      status.textContent = "Unable to access iframe content.";
      return;
    }

    const studentNameEl = document.querySelector('#student_select_menu .display_name');
    if (!studentNameEl) {
      status.textContent = "Could not detect student name.";
      return;
    }

    const studentName = studentNameEl.textContent.trim();
    const entries = iframeDoc.querySelectorAll('.entry');

    const matched = [];
    entries.forEach(entry => {
      const author = entry.querySelector('.author_name');
      const content = entry.querySelector('.discussion_user_content');
      if (author && content && author.textContent.trim() === studentName) {
        matched.push(content.innerHTML);
      }
    });

    if (matched.length === 0) {
      status.textContent = "No posts found for this student.";
      return;
    }

    // Display matching posts
    status.innerHTML = "<h3>Student Posts:</h3>";
    matched.forEach(html => {
      const div = document.createElement("div");
      div.style.marginBottom = "12px";
      div.style.padding = "8px";
      div.style.border = "1px solid #ddd";
      div.style.background = "#fff";
      div.innerHTML = html;
      status.appendChild(div);
    });
  }

  // Delay slightly to allow iframe to finish loading
  setTimeout(extractPostsFromDOM, 1500);
})();
