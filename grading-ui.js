// grading-ui.js – Canvas Grading Sidebar Tool (v1.3)
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
  sidebar.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";

  const title = document.createElement("h2");
  title.textContent = "Canvas Grading Tool";
  sidebar.appendChild(title);

  const studentNameEl = document.createElement("div");
  studentNameEl.style.fontWeight = "bold";
  studentNameEl.style.marginBottom = "10px";
  sidebar.appendChild(studentNameEl);

  const postContainer = document.createElement("div");
  postContainer.textContent = "🔄 Loading student posts...";
  sidebar.appendChild(postContainer);

  const version = document.createElement("div");
  version.style.marginTop = "20px";
  version.style.fontSize = "12px";
  version.style.color = "#888";
  version.textContent = "Version 1.3";
  sidebar.appendChild(version);

  document.body.appendChild(sidebar);

  // Extract visible posts and student name from SpeedGrader iframe
  function extractContent() {
    const iframe = document.querySelector("iframe#speedgrader_iframe");
    if (!iframe) {
      postContainer.textContent = "❌ Could not locate SpeedGrader iframe.";
      return;
    }

    const doc = iframe.contentDocument || iframe.contentWindow.document;
    if (!doc) {
      postContainer.textContent = "❌ Unable to access iframe content.";
      return;
    }

    // ✅ Try extracting student name from known DOM locations
    let studentName = "";
    const nameElement = doc.querySelector(".student_review h3") ||
                        doc.querySelector(".student_name") ||
                        doc.querySelector("h3");

    if (nameElement && nameElement.textContent.trim()) {
      studentName = nameElement.textContent.trim();
      studentNameEl.textContent = "👤 " + studentName;
    } else {
      studentNameEl.textContent = "❌ Could not detect student name";
      studentNameEl.style.color = "red";
    }

    // ✅ Pull all posts
    const posts = doc.querySelectorAll(".discussion_user_content");
    if (!posts || posts.length === 0) {
      postContainer.textContent = "❌ No discussion content found.";
      return;
    }

    postContainer.innerHTML = "<h3>📝 Student Posts:</h3>";
    posts.forEach((post, idx) => {
      const entry = document.createElement("div");
      entry.style.marginBottom = "12px";
      entry.style.padding = "8px";
      entry.style.border = "1px solid #ddd";
      entry.style.background = "#fff";
      entry.innerHTML = `<strong>Post ${idx + 1}</strong><br>${post.innerHTML}`;
      postContainer.appendChild(entry);
    });
  }

  // Allow iframe time to fully load
  setTimeout(extractContent, 2000);
})();
