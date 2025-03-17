// grading-ui.js (version v25 - Full Grading UI with Approve Button)
(function () {
  let courseId, assignmentId, studentId;

  const root = document.createElement("div");
  root.style.fontFamily = "Arial, sans-serif";
  root.style.padding = "16px";
  root.style.width = "100%";
  root.style.boxSizing = "border-box";
  document.body.appendChild(root);

  const title = document.createElement("h2");
  title.textContent = "Canvas Grading Tool";
  root.appendChild(title);

  const status = document.createElement("div");
  status.textContent = "Waiting for context from Canvas...";
  root.appendChild(status);

  const feedback = document.createElement("div");
  feedback.style.marginTop = "20px";
  root.appendChild(feedback);

  const approveButton = document.createElement("button");
  approveButton.textContent = "✅ Approve and Insert Grade";
  approveButton.style.marginTop = "16px";
  approveButton.style.padding = "8px 16px";
  approveButton.style.fontSize = "14px";
  approveButton.style.display = "none";
  root.appendChild(approveButton);

  const footer = document.createElement("div");
  footer.style.marginTop = "24px";
  footer.style.fontSize = "12px";
  footer.style.color = "#888";
  footer.textContent = "Version: v25";
  root.appendChild(footer);

  window.addEventListener("message", async (event) => {
    if (event.data?.type === "canvas-context") {
      courseId = event.data.courseId;
      assignmentId = event.data.assignmentId;
      studentId = event.data.studentId;

      try {
        status.textContent = "Loading discussion posts...";
        const assignment = await fetch(`/api/v1/courses/${courseId}/assignments/${assignmentId}`).then(r => r.json());
        const discussionId = assignment.discussion_topic?.id;
        const dueAt = assignment.due_at ? new Date(assignment.due_at) : null;

        const discussion = await fetch(`/api/v1/courses/${courseId}/discussion_topics/${discussionId}/view`).then(r => r.json());

        function flatten(posts) {
          let all = [];
          posts.forEach(p => {
            all.push(p);
            if (p.replies) all = all.concat(flatten(p.replies));
          });
          return all;
        }

        const allPosts = flatten([...discussion.view, ...(discussion.replies || [])]);
        const userPosts = allPosts.filter(p => String(p.user_id) === String(studentId) && p.message?.trim());
        userPosts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        if (userPosts.length === 0) {
          status.innerHTML = `<span style="color:red;">❌ No posts found for this student.</span>`;
          return;
        }

        // Word counting
        const countWords = (html) => {
          const text = html
            .replace(/<[^>]*>/g, '')
            .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
            .replace(/[-']/g, '')
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          return text.split(' ').filter(Boolean).length;
        };

        // Grading logic
        const initialPost = userPosts[0];
        const initialWordCount = countWords(initialPost.message);
        const postCount = userPosts.length;
        const late = dueAt && new Date(initialPost.created_at) > dueAt;

        let score = 10;
        const deductions = [];

        if (initialWordCount < 100 || initialWordCount > 165) {
          score -= 2;
          deductions.push("❌ Word count out of range (-2)");
        }

        if (postCount < 2) {
          score -= 4;
          deductions.push("❌ Only one post (-4)");
        }

        if (late) {
          score -= 5;
          deductions.push("❌ Posted after due date (-5)");
        }

        if (score < 2) score = 2;

        // Display internal grading table
        const breakdown = `
<b>Internal Grading Breakdown</b><br>
Initial Post Word Count: ${initialWordCount}<br>
Total Posts: ${postCount}<br>
Late Submission: ${late ? "Yes" : "No"}<br>
Deductions:<br>
${deductions.length ? deductions.join("<br>") : "✅ No deductions"}<br>
Final Score: <b>${score}/10</b>
        `;
        status.innerHTML = breakdown;

        // Feedback comment
        let comment = "";
        if (initialWordCount < 100 || initialWordCount > 165) {
          comment += "Your initial post was outside the 100–165 word count range. ";
        }
        if (postCount < 2) {
          comment += "Only one post was submitted; a reply or second post is required. ";
        }
        if (late) {
          comment += "The post was submitted after the due date. ";
        }
        if (comment === "") {
          comment = "Great work meeting all participation criteria!";
        }
        comment += ` Final score: ${score}/10.`;

        feedback.innerHTML = `<b>Feedback Comment:</b><br><code>${comment}</code>`;
        approveButton.style.display = "inline-block";

        // Send grade/comment to parent on click
        approveButton.onclick = () => {
          parent.postMessage({
            type: "submit-grade",
            score,
            comment
          }, "*");
        };

      } catch (err) {
        status.innerHTML = `<span style="color:red;">❌ ${err.message}</span>`;
      }
    }
  });
})();
