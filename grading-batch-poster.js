// grading-batch-poster.js
// Scaffold for Batch Approval + Auto Posting System in SpeedGrader

(function () {
  console.log("[BatchPoster] Initializing grading tool...");

  // State store for student data
  const gradingQueue = [];
  let currentStudentIndex = 0;

  // Utility to flatten nested discussion replies
  function flattenPosts(posts) {
    let flat = [];
    function recurse(list) {
      list.forEach(p => {
        flat.push(p);
        if (p.replies && Array.isArray(p.replies)) recurse(p.replies);
      });
    }
    recurse(posts);
    return flat;
  }

  function countWordsSmart(text) {
    if (!text) return 0;
    const plainText = text
      .replace(/<[^>]*>/g, '')
      .replace(/[‘’“”]/g, "'")
      .replace(/[-']/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return plainText ? plainText.split(' ').length : 0;
  }

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    return res.json();
  }

  async function buildGradingQueue() {
    try {
      const url = window.location.href;
      const courseMatch = url.match(/courses\/(\d+)/);
      const assignmentMatch = url.match(/assignment_id=(\d+)/);
      if (!courseMatch || !assignmentMatch) throw new Error("Missing course or assignment ID in URL");
      const courseId = courseMatch[1];
      const assignmentId = assignmentMatch[1];

      const assignment = await fetchJSON(`/api/v1/courses/${courseId}/assignments/${assignmentId}`);
      const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;
      const discussionId = assignment.discussion_topic?.id;
      if (!discussionId) throw new Error("No discussion ID found");

      const discussion = await fetchJSON(`/api/v1/courses/${courseId}/discussion_topics/${discussionId}/view`);
      const allPosts = flattenPosts([...discussion.view, ...(discussion.replies || [])]);

      const grouped = {};
      allPosts.forEach(p => {
        if (!p.user_id || !p.message?.trim()) return;
        if (!grouped[p.user_id]) grouped[p.user_id] = [];
        grouped[p.user_id].push(p);
      });

      for (const [userId, posts] of Object.entries(grouped)) {
        posts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const name = posts[0]?.display_name || `User ${userId}`;
        const initialPost = posts[0];
        const wc = countWordsSmart(initialPost.message);
        const late = dueDate && new Date(initialPost.created_at) > dueDate;

        let score = 10;
        const deductions = [];
        if (wc < 100 || wc > 165) {
          score -= 2;
          deductions.push("Initial post word count not within range (-2)");
        }
        if (posts.length < 2) {
          score -= 4;
          deductions.push("Only one post (-4)");
        }
        if (late) {
          score -= 5;
          deductions.push("Late post (-5)");
        }
        if (score < 2) score = 2;

        const comment = [
          wc < 100 || wc > 165 ? `Your initial post was ${wc} words, which is outside the expected 100–150 word range. ` : "",
          posts.length < 2 ? "Only one post was submitted, which impacts participation. " : "",
          late ? "The initial post was made after the deadline. " : "",
          deductions.length > 0 ? `Your final score is ${score}/10.` : `Great job! Score: ${score}/10.`
        ].join("").trim();

        gradingQueue.push({ id: userId, name, score, comment, approved: false });
      }

      document.getElementById("batchStatus").innerText = `Loaded ${gradingQueue.length} students.`;
      renderQueue();

    } catch (err) {
      console.error("[BatchPoster] Error building grading queue:", err);
      document.getElementById("batchStatus").innerText = `❌ ${err.message}`;
    }
  }

  // --- Step 3: Render Students in UI ---
  const renderQueue = () => {
    const container = document.getElementById("studentQueue");
    container.innerHTML = gradingQueue.map((s, i) => `
      <div style="margin-bottom: 10px; padding: 6px; border: 1px solid #ddd;">
        <strong>${s.name}</strong> — Score: <input type="number" value="${s.score}" id="score-${i}" style="width: 40px;"> <br>
        <textarea id="comment-${i}" rows="2" style="width:100%; margin-top: 4px;">${s.comment}</textarea><br>
        <button onclick="approveStudent(${i})">✅ Approve</button>
        <span id="approved-${i}" style="margin-left:10px; color: green; display: ${s.approved ? 'inline' : 'none'};">Approved</span>
      </div>
    `).join("");
  };

  window.approveStudent = (index) => {
    const score = parseFloat(document.getElementById(`score-${index}`).value);
    const comment = document.getElementById(`comment-${index}`).value;
    gradingQueue[index].score = score;
    gradingQueue[index].comment = comment;
    gradingQueue[index].approved = true;
    renderQueue();
  };

  buildGradingQueue();

  // --- Step 4: Posting Engine (stub only) ---
  document.getElementById("startPosting").onclick = async () => {
    for (let i = 0; i < gradingQueue.length; i++) {
      const student = gradingQueue[i];
      if (!student.approved) continue;

      console.log(`[BatchPoster] Would post: ${student.name} — ${student.score}pts — ${student.comment}`);

      // Here you'd simulate:
      // - Setting score field
      // - Setting comment iframe
      // - Clicking "Submit"
      // - Navigating to next student

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
    }
    alert("🎉 Posting complete!");
  };

})();
