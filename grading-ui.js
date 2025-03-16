// index.js
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

  // Extract visible posts and student name in SpeedGrader iframe
  function extractDataFromIframe() {
    const frame = document.querySelector('iframe#speedgrader_iframe');
    if (!frame) {
      status.textContent = "❌ Could not locate SpeedGrader iframe.";
      return;
    }

    const iframeDoc = frame.contentDocument || frame.contentWindow.document;
    if (!iframeDoc) {
      status.textContent = "❌ Unable to access iframe content.";
      return;
    }

    const studentNameEl = iframeDoc.querySelector('.student_selector .display_name') ||
                          iframeDoc.querySelector('.student_name') ||
                          iframeDoc.querySelector('h3');

    const studentName = studentNameEl ? studentNameEl.textContent.trim() : null;
    if (!studentName) {
      status.textContent = "❌ Could not detect student name.";
      return;
    }

    const posts = iframeDoc.querySelectorAll('.discussion_user_content');
    if (!posts || posts.length === 0) {
      status.textContent = `No discussion content found for ${studentName}.`;
      return;
    }

    const nameBox = document.createElement("div");
    nameBox.innerHTML = `<strong>Student:</strong> ${studentName}<br/><strong>Posts:</strong>`;
    nameBox.style.marginBottom = "12px";
    sidebar.appendChild(nameBox);

    posts.forEach((post, i) => {
      const entry = document.createElement("div");
      entry.style.marginBottom = "12px";
      entry.style.padding = "8px";
      entry.style.border = "1px solid #ddd";
      entry.style.background = "#fff";
      entry.innerHTML = `<strong>Post #${i + 1}:</strong><br/>${post.innerHTML}`;
      sidebar.appendChild(entry);
    });
  }

  // Wait for iframe to fully load
  setTimeout(extractDataFromIframe, 2000);
})();
