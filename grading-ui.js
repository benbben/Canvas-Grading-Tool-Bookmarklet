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

  // Grab the current student's name from the SpeedGrader header
  const nameEl = document.querySelector('#student_select_menu .display_name');
  if (!nameEl) {
    status.textContent = "Could not determine student name.";
    return;
  }
  const studentName = nameEl.textContent.trim();

  // Find all visible posts with matching author name
  const entries = iframeDoc.querySelectorAll('.entry');
  const studentPosts = [];

  entries.forEach(entry => {
    const author = entry.querySelector('.author_name');
    if (author && author.textContent.trim() === studentName) {
      const content = entry.querySelector('.discussion_user_content');
      if (content) studentPosts.push(content.innerHTML);
    }
  });

  if (studentPosts.length === 0) {
    status.textContent = "No posts found for current student.";
    return;
  }

  status.innerHTML = "<h3>Student Posts:</h3>";
  studentPosts.forEach(html => {
    const postBox = document.createElement("div");
    postBox.style.marginBottom = "12px";
    postBox.style.padding = "8px";
    postBox.style.border = "1px solid #ddd";
    postBox.style.background = "#fff";
    postBox.innerHTML = html;
    status.appendChild(postBox);
  });
}
