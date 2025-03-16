// grading-us.js (Version 1.4)
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
  status.textContent = "Locating student posts...";
  sidebar.appendChild(status);

  const footer = document.createElement("div");
  footer.style.marginTop = "20px";
  footer.style.fontSize = "12px";
  footer.style.color = "#666";
  footer.textContent = "Version 1.4";
  sidebar.appendChild(footer);

  document.body.appendChild(sidebar);

  function extractStudentName() {
    const nameEl = document.querySelector("#student_selector_label");
    return nameEl ? nameEl.textContent.trim() : null;
  }

  function extractPostsFromDOM() {
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

    const studentName = extractStudentName();
    if (!studentName) {
      status.textContent = "❌ Could not detect student name from sidebar.";
      return;
    }

    const discussionContainers = iframeDoc.querySelectorAll('.discussion_user_content');
    if (!discussionContainers || discussionContainers.length === 0) {
      status.textContent = "❌ No discussion content found in iframe.";
      return;
    }

    const studentPosts = [];
    discussionContainers.forEach(container => {
      const parent = container.closest(".entry, .discussion-entry, div");
      if (parent) {
        const userMeta = parent.querySelector(".user_name, .author, .posted_by");
        const rawText = userMeta ? userMeta.textContent.trim() : "";
        if (rawText.includes(studentName)) {
          studentPosts.push(container.innerHTML);
        }
      }
    });

    if (studentPosts.length === 0) {
      status.textContent = `⚠️ No matching posts found for ${studentName}.`;
      return;
    }

    status.innerHTML = `<h3>Posts by ${studentName}:</h3>`;
    studentPosts.forEach(html => {
      const entry = document.createElement("div");
      entry.style.marginBottom = "12px";
      entry.style.padding = "8px";
      entry.style.border = "1px solid #ddd";
      entry.style.background = "#fff";
      entry.innerHTML = html;
      status.appendChild(entry);
    });
  }

  setTimeout(extractPostsFromDOM, 2000);
})();
