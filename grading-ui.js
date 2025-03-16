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

  const nameEl = document.querySelector('#student_select_menu .display_name');
  if (!nameEl) {
    status.textContent = "Could not determine student name.";
    return;
  }

  const studentName = nameEl.textContent.trim();
  const entries = iframeDoc.querySelectorAll('.entry');

  const matchedPosts = [];
  entries.forEach(entry => {
    const authorEl = entry.querySelector('.author_name');
    const contentEl = entry.querySelector('.discussion_user_content');

    if (authorEl && contentEl) {
      const authorName = authorEl.textContent.trim();
      if (authorName === studentName) {
        matchedPosts.push(contentEl.innerHTML);
      }
    }
  });

  if (matchedPosts.length === 0) {
    status.textContent = "No matching posts found for this student.";
    return;
  }

  status.innerHTML = "<h3>Student Posts:</h3>";
  matchedPosts.forEach(html => {
    const postBox = document.createElement("div");
    postBox.style.marginBottom = "12px";
    postBox.style.padding = "8px";
    postBox.style.border = "1px solid #ddd";
    postBox.style.background = "#fff";
    postBox.innerHTML = html;
    status.appendChild(postBox);
  });
}
