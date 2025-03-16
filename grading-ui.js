// grading-us.js (version v19 - Initial Grading Logic)
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
  status.textContent = "Loading posts...";
  sidebar.appendChild(status);

  const versionFooter = document.createElement("div");
  versionFooter.style.marginTop = "20px";
  versionFooter.style.fontSize = "0.8em";
  versionFooter.style.color = "#666";
  versionFooter.textContent = "Version: v17";
  sidebar.appendChild(versionFooter);

  document.body.appendChild(sidebar);

  async function fetchDiscussionId() {
    const res = await fetch(`/api/v1/courses/${courseId}/assignments/${assignmentId}`);
    if (!res.ok) throw new Error("Assignment lookup failed");
    const data = await res.json();
    return data.discussion_topic ? data.discussion_topic.id : null;
  }

  async function fetchDiscussionPosts(discussionId) {
    const res = await fetch(`/api/v1/courses/${courseId}/discussion_topics/${discussionId}/view`);
    if (!res.ok) throw new Error("Discussion lookup failed");
    return res.json();
  }

  function countWords(str) {
  // Remove HTML tags
  const cleaned = str.replace(/<[^>]*>/g, '');
  // Split the string by whitespace and filter out empty strings
  const wordsArray = cleaned.trim().split(/\s+/).filter(word => word.length > 0);
  return wordsArray.length;
}


  function renderPosts(entries) {
    const filtered = entries.filter(entry =>
      entry.user_id == studentId && entry.message && entry.message.trim()
    );

    if (filtered.length === 0) {
      status.innerHTML = `<div style="color:red;">❌ No posts found for student ID ${studentId}</div>`;
      return;
    }

    filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    status.innerHTML = `<h3>Posts by Student:</h3>`;

    filtered.forEach(entry => {
      const wordCount = countWords(entry.message || "");
      const div = document.createElement("div");
      div.style.marginBottom = "12px";
      div.style.padding = "8px";
      div.style.border = "1px solid #ddd";
      div.style.background = "#fff";
      div.innerHTML = `${entry.message}<br><b>Word Count: ${wordCount}</b>`;
      status.appendChild(div);
    });
  }

  async function loadPosts() {
    try {
      const discussionId = await fetchDiscussionId();
      if (!discussionId) throw new Error("Failed to identify discussion ID");
      const data = await fetchDiscussionPosts(discussionId);
      const entries = [];
      function flatten(posts) {
        posts.forEach(p => {
          entries.push(p);
          if (p.replies && Array.isArray(p.replies)) flatten(p.replies);
        });
      }
      flatten([...data.view, ...(data.replies || [])]);
      renderPosts(entries);
    } catch (err) {
      status.innerHTML = `<span style='color:red;'>❌ ${err.message}</span>`;
    }
  }

  loadPosts();
  // --- Grading Component ---
// Call this function after you've gathered all student posts in an array (studentPosts)
// and after you've fetched the assignment data (to get dueAt, if set).
function gradeSubmission(studentPosts, dueAt) {
  // Use the first post (initial post) for word count grading
  const initialPost = studentPosts[0];
  const initialWordCount = countWordsSmart(initialPost.message);
  const numPosts = studentPosts.length;

  // Start with a perfect score of 10
  let score = 10;
  let deductionDetails = [];

  // 1) Word count: if initial post is not between 100 and 165 words, deduct 2 points
  if (initialWordCount < 100 || initialWordCount > 165) {
    score -= 2;
    deductionDetails.push("Word count not within 100-165 (-2)");
  }

  // 2) Post count: if the student only submitted one post, deduct 4 points
  if (numPosts < 2) {
    score -= 4;
    deductionDetails.push("Only one post (-4)");
  }

  // 3) Due date: if the initial post was submitted after the due date, deduct 5 points
  if (dueAt) {
    const dueDate = new Date(dueAt);
    const initialPostDate = new Date(initialPost.created_at);
    if (initialPostDate > dueDate) {
      score -= 5;
      deductionDetails.push("Posted after due date (-5)");
    }
  }

  // Ensure the final score is at least 2 points.
  if (score < 2) score = 2;

  // Generate feedback comment
  let comment = `Your initial post contains ${initialWordCount} words. `;
  comment += (initialWordCount >= 100 && initialWordCount <= 165)
    ? "This meets the word count requirement. "
    : "This does not meet the word count requirement. ";
  comment += `You submitted ${numPosts} post${numPosts > 1 ? "s" : ""}. `;
  if (deductionDetails.length > 0) {
    comment += "Deductions: " + deductionDetails.join(", ") + ". ";
  } else {
    comment += "Great job meeting all criteria! ";
  }
  comment += `Your final score is ${score}/10.`;
  
  return { score, comment };
}

// Example usage:
// Suppose after processing, you have:
// - studentPosts: an array of the student's posts (each with a .message and .created_at)
// - assignmentData: the assignment data from the API (which includes due_at)
// You would then do something like:
// const gradeResult = gradeSubmission(studentPosts, assignmentData.due_at);
// Then render gradeResult.comment in your UI for feedback.

})();
