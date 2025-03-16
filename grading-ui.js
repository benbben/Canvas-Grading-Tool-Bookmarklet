// Canvas Grading Tool Bookmarklet
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
  status.textContent = "Locating student and discussion posts...";
  sidebar.appendChild(status);

  document.body.appendChild(sidebar);

  // Attempt to find the current student's name from SpeedGrader dropdown
  let studentName = null;
  const nameDropdown = document.querySelector('#student_select_menu');
  if (nameDropdown) {
    const selectedOption = nameDropdown.querySelector('option[selected]');
    if (selectedOption) {
      studentName = selectedOption.textContent.trim();
    }
  }

  if (!studentName) {
    status.textContent = "Could not detect student name.";
    return;
  }

  // Extract visible posts in SpeedGrader
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

    const postContainers = iframeDoc.querySelectorAll('.discussion_user_content');
    const allPosts = [];

    postContainers.forEach(container => {
      const authorBlock = container.closest('.entry');
      if (!authorBlock) return;

      const authorNameEl = authorBlock.querySelector('.user_name');
      if (!authorNameEl) return;

      const authorName = authorNameEl.textContent.trim();
      if (authorName === studentName) {
        allPosts.push(container.innerHTML);
      }
    });

    if (allPosts.length === 0) {
      status.innerHTML = `<b>No posts found for:</b> ${studentName}`;
      return;
    }

    status.innerHTML = `<h3>Posts by ${studentName}:</h3>`;
    allPosts.forEach(postHTML => {
      const entry = document.createElement("div");
      entry.style.marginBottom = "12px";
      entry.style.padding = "8px";
      entry.style.border = "1px solid #ddd";
      entry.style.background = "#fff";
      entry.innerHTML = postHTML;
      status.appendChild(entry);
    });
  }

  // Give iframe time to load
  setTimeout(extractPostsFromDOM, 1500);
})();
