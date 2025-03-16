// grading-ui.js v1.7
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

  // Sidebar UI setup
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
  status.style.marginBottom = "12px";
  status.textContent = "Detecting student...";
  sidebar.appendChild(status);

  const postsContainer = document.createElement("div");
  postsContainer.innerHTML = "<strong>Loading posts...</strong>";
  sidebar.appendChild(postsContainer);

  const versionFooter = document.createElement("div");
  versionFooter.style.marginTop = "24px";
  versionFooter.style.fontSize = "12px";
  versionFooter.style.color = "#999";
  versionFooter.textContent = "Version 1.7";
  sidebar.appendChild(versionFooter);

  document.body.appendChild(sidebar);

  function getStudentNameFallback() {
    const nameDropdown = document.querySelector("#student_select_menu");
    if (nameDropdown) {
      const selectedOption = nameDropdown.querySelector("option[selected]");
      if (selectedOption) return selectedOption.textContent.trim();
    }
    return null;
  }

  function extractPostsFromDOM(studentName) {
    const frame = document.querySelector("iframe#speedgrader_iframe");
    if (!frame) {
      postsContainer.innerHTML = "❌ Could not locate SpeedGrader iframe.";
      return;
    }

    const iframeDoc = frame.contentDocument || frame.contentWindow.document;
    if (!iframeDoc) {
      postsContainer.innerHTML = "❌ Unable to access iframe content.";
      return;
    }

    const allPosts = iframeDoc.querySelectorAll(".discussion_user_content");
    const nameEls = iframeDoc.querySelectorAll(".author_name");

    if (allPosts.length === 0 || nameEls.length === 0) {
      postsContainer.innerHTML = "❌ No discussion content found in iframe.";
      return;
    }

    let matchedPosts = [];
    allPosts.forEach((post, i) => {
      const author = nameEls[i]?.textContent.trim();
      if (author === studentName) {
        matchedPosts.push(post);
      }
    });

    if (matchedPosts.length === 0) {
      postsContainer.innerHTML = "❌ No posts matched this student.";
      return;
    }

    postsContainer.innerHTML = `<h3>${studentName}'s Posts:</h3>`;
    matchedPosts.forEach((post) => {
      const entry = document.createElement("div");
      entry.style.marginBottom = "12px";
      entry.style.padding = "8px";
      entry.style.border = "1px solid #ddd";
      entry.style.background = "#fff";
      entry.innerHTML = post.innerHTML;
      postsContainer.appendChild(entry);
    });
  }

  // Wait for iframe to load fully
  setTimeout(() => {
    const studentName = getStudentNameFallback();

    if (!studentName) {
      postsContainer.innerHTML = "❌ Could not detect student name from dropdown.";
      return;
    }

    status.innerHTML = `🧑 Student: <strong>${studentName}</strong>`;
    extractPostsFromDOM(studentName);
  }, 2000);
})();
