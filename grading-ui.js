// grading-us.js (version v17 - Grading Logic with Word Count, Post Count, and Due Date)
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

  // Create sidebar container for displaying posts and grade feedback
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

  // Container to display posts
  const status = document.createElement("div");
  status.textContent = "Loading posts...";
  sidebar.appendChild(status);

  // Container for grade and feedback comment
  const gradeDiv = document.createElement("div");
  gradeDiv.style.marginTop = "20px";
  sidebar.appendChild(gradeDiv);

  // Version footer for confirmation
  const versionFooter = document.createElement("div");
  versionFooter.style.marginTop = "20px";
  versionFooter.style.fontSize = "0.8em";
  versionFooter.style.color = "#666";
  versionFooter.textContent = "Version: v17";
  sidebar.appendChild(versionFooter);

  document.body.appendChild(sidebar);

  // Word count function:
  // Remove HTML tags, normalize quotes, hyphens, punctuation, and collapse spaces,
  // then count words by splitting on spaces.
  function countWordsSmart(text) {
    if (!text) return 0;
    const plainText = text
      .replace(/<[^>]*>/g, '')                   // remove HTML tags
      .replace(/[\u2018\u2019\u201C\u201D]/g, "'") // normalize curly quotes
      .replace(/[-']/g, '')                      // remove hyphens and apostrophes
      .replace(/[^\w\s]/g, '')                    // remove punctuation\n      .replace(/\s+/g, ' ')                      // collapse whitespace\n      .trim();
    return plainText ? plainText.split(' ').length : 0;
  }

  // Fetch assignment data (which includes discussion_topic and due_at)
  async function fetchAssignmentData() {
    const res = await fetch(`/api/v1/courses/${courseId}/assignments/${assignmentId}`);
    if (!res.ok) throw new Error("Assignment lookup failed");
    return res.json();
  }

  // Fetch discussion posts using the discussion ID
  async function fetchDiscussionPosts(discussionId) {
    const res = await fetch(`/api/v1/courses/${courseId}/discussion_topics/${discussionId}/view`);
    if (!res.ok) throw new Error("Discussion lookup failed");
    return res.json();
  }

  // Recursively flatten posts (including replies)
  function flattenPosts(posts) {
    let flat = [];
    function recurse(list) {
      list.forEach(post => {
        flat.push(post);
        if (post.replies && Array.isArray(post.replies)) {
          recurse(post.replies);
        }
      });
    }
    recurse(posts);
    return flat;
  }

  async function loadPostsAndGrade() {
    try {
      // Get assignment data (to obtain due date and discussion topic)
      const assignmentData = await fetchAssignmentData();
      const dueAt = assignmentData.due_at; // may be null if not set
      const discussionId = assignmentData.discussion_topic ? assignmentData.discussion_topic.id : null;
      if (!discussionId) throw new Error("Failed to identify discussion ID");

      // Fetch discussion posts data
      const discussionData = await fetchDiscussionPosts(discussionId);
      // Flatten all posts (view and nested replies)
      const allEntries = flattenPosts([...discussionData.view, ...(discussionData.replies || [])]);
      // Filter entries to those submitted by the student (using student_id)
      const studentPosts = allEntries.filter(entry =>
        String(entry.user_id) === String(studentId) && entry.message && entry.message.trim()
      );

      if (studentPosts.length === 0) {
        status.innerHTML = `<div style="color:red;">❌ No posts found for student ID ${studentId}</div>`;
        return;
      }

      // Sort posts chronologically by created_at
      studentPosts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const initialPost = studentPosts[0];
      const initialWordCount = countWordsSmart(initialPost.message);
      const numPosts = studentPosts.length;

      // Grading logic:
      // Base score is 10.
      let score = 10;
      let deductionDetails = [];

      // 1) Word count deduction (if initial post is not between 100 and 165 words)
      if (initialWordCount < 100 || initialWordCount > 165) {
        score -= 2;
        deductionDetails.push("Word count not within 100-165 (-2)");
      }

      // 2) Post count deduction (if only one post)
      if (numPosts < 2) {
        score -= 4;
        deductionDetails.push("Only one post (-4)");
      }

      // 3) Due date deduction (if initial post was submitted after the due date)
      if (dueAt) {
        const dueDate = new Date(dueAt);
        const initialPostDate = new Date(initialPost.created_at);
        if (initialPostDate > dueDate) {
          score -= 5;
          deductionDetails.push("Posted after due date (-5)");
        }
      }

      // Ensure minimum score is 2
      if (score < 2) score = 2;

      // Generate feedback comment:
      let comment = `Your initial post contains ${initialWordCount} words. `;
      if (initialWordCount >= 100 && initialWordCount <= 165) {
        comment += "This meets the word count requirement. ";
      } else {
        comment += "This does not meet the word count requirement. ";
      }
      comment += `You submitted ${numPosts} post${numPosts > 1 ? "s" : ""}. `;
      if (deductionDetails.length > 0) {
        comment += "Deductions: " + deductionDetails.join(", ") + ". ";
      } else {
        comment += "Great job meeting all criteria! ";
      }
      comment += `Your final score is ${score}/10.`;

      // Render student posts in the sidebar
      status.innerHTML = `<h3>Posts by Student:</h3>`;
      studentPosts.forEach(post => {
        const wc = countWordsSmart(post.message);
        const div = document.createElement("div");
        div.style.marginBottom = "12px";
        div.style.padding = "8px";
        div.style.border = "1px solid #ddd";
        div.style.background = "#fff";
        div.innerHTML = `${post.message}<br><b>Word Count: ${wc}</b>`;
        status.appendChild(div);
      });
      // Render grade feedback
      gradeDiv.innerHTML = `<h3>Grade & Feedback:</h3><p>${comment}</p>`;
    } catch (err) {
      status.innerHTML = `<span style='color:red;'>❌ ${err.message}</span>`;
    }
  }

  loadPostsAndGrade();
})();
