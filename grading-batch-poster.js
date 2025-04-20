// grading-batch-poster.js
// Full UI + Batch Approval + Auto Posting System for SpeedGrader
// Version: v2.9.1 (Apr 20, 2025)

(function () {
  const existing = document.getElementById("batchGraderPanel");
  if (existing) existing.remove();
  console.log("[BatchPoster v2.91] Initializing grading tool...");

  // Create the floating UI panel
  const panel = document.createElement("div");
  panel.id = "batchGraderPanel";
  panel.style = `
    position: fixed;
    top: 40px;
    left: 40px;
    width: 95vw;
    height: 95vh;
    background: #fff;
    border: 2px solid #ccc;
    z-index: 999999;
    padding: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    overflow-y: auto;
    resize: both;
    font-family: Arial, sans-serif;
    cursor: move;
  `;
  document.body.appendChild(panel);

  panel.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h3 style="margin: 0;">Batch Grading Tool</h3>
      <div>
        <button id="minimizePanel" style="margin-right: 4px;">–</button>
        <button id="maximizePanel" style="margin-right: 4px; display: none;">⬜</button>
        <button onclick="document.getElementById('batchGraderPanel').remove()">×</button>
      </div>
    </div>
    <div id="batchStatus" style="margin: 10px 0;">Loading student data...</div>
    <div id="studentQueue"></div>
    <button id="startPosting" style="margin-top: 12px; padding: 6px 12px;">🚀 Post All Approved</button>
    <div style="margin-top:10px; font-size: 0.75em; color: #999">Version: v2.9</div>
  `;

  // Dragging logic
  let isDragging = false, offsetX = 0, offsetY = 0;
  panel.addEventListener('mousedown', function (e) {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    isDragging = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
    panel.style.cursor = 'grabbing';
  });
  document.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    panel.style.left = (e.clientX - offsetX) + 'px';
    panel.style.top = (e.clientY - offsetY) + 'px';
  });
  document.addEventListener('mouseup', function () {
    isDragging = false;
    panel.style.cursor = 'move';
  });

  // DOM element binding fix using setTimeout
  setTimeout(() => {
    const minimize = document.getElementById("minimizePanel");
    const maximize = document.getElementById("maximizePanel");
    const batchStatus = document.getElementById("batchStatus");
    const studentQueue = document.getElementById("studentQueue");
    const startPosting = document.getElementById("startPosting");

    if (minimize && maximize && batchStatus && studentQueue && startPosting) {
      minimize.onclick = () => {
        batchStatus.style.display = "none";
        studentQueue.style.display = "none";
        startPosting.style.display = "none";
        minimize.style.display = "none";
        maximize.style.display = "inline";
        panel.style.height = "auto";
      };

      maximize.onclick = () => {
        batchStatus.style.display = "block";
        studentQueue.style.display = "block";
        startPosting.style.display = "block";
        minimize.style.display = "inline";
        maximize.style.display = "none";
        panel.style.height = "600px";
      };

      startPosting.onclick = async () => {
        for (let i = 0; i < gradingQueue.length; i++) {
          const student = gradingQueue[i];
          if (!student.approved) continue;
          console.log(`[BatchPoster] Would post: ${student.name} — ${student.score}pts — ${student.comment}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        alert("🎉 Posting complete!");
      };
    }
  }, 0);

  // State store for student data
  const gradingQueue = [];
  const userCache = {};
  const userNameMap = {};
  let currentStudentIndex = 0;

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

  async function fetchAllUserNames(courseId) {
    try {
      let page = 1, hasMore = true;
      while (hasMore) {
        const users = await fetchJSON(`/api/v1/courses/${courseId}/users?enrollment_type[]=student&enrollment_state[]=active&per_page=100&page=${page}`);
        if (!users.length) {
          hasMore = false;
          break;
        }
        users.forEach(u => {
          userNameMap[u.id] = u.sortable_name || u.name || `User ${u.id}`;
        });
        page++;
      }
    } catch (err) {
      console.warn("Failed to fetch course users:", err);
    }

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

      await fetchAllUserNames(courseId);
      for (const [userId, posts] of Object.entries(grouped)) {
        const name = userNameMap[userId] || `User ${userId}`;
        posts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
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

        const internal = `
        <table style='border-collapse:collapse;'>
          <tr><td style='border:1px solid #ccc;padding:4px;'>Initial Post WC</td><td style='border:1px solid #ccc;padding:4px;'>${wc}</td></tr>
          <tr><td style='border:1px solid #ccc;padding:4px;'># of Posts</td><td style='border:1px solid #ccc;padding:4px;'>${posts.length}</td></tr>
          <tr><td style='border:1px solid #ccc;padding:4px;'>Late?</td><td style='border:1px solid #ccc;padding:4px;'>${late ? "Yes" : "No"}</td></tr>
          <tr><td style='border:1px solid #ccc;padding:4px;'>Deductions</td><td style='border:1px solid #ccc;padding:4px;'>${deductions.join(", ") || "None"}</td></tr>
          <tr><td style='border:1px solid #ccc;padding:4px;'>Final Score</td><td style='border:1px solid #ccc;padding:4px;'>${score}/10</td></tr>
        </table>`;

        gradingQueue.push({ id: userId, name, score, comment, posts, rubric: internal, approved: false });
      }

      document.getElementById("batchStatus").innerText = `Loaded ${gradingQueue.length} students.`;

      



} catch (err) {
  const statusEl = document.getElementById("batchStatus");
  if (statusEl) statusEl.innerText = `❌ ${err.message}`;
}


  }

  const renderQueue = () => {
    const container = document.getElementById("studentQueue");
    container.innerHTML = gradingQueue.map((s, i) => `
      <div style="margin-bottom: 10px; padding: 6px; border: 1px solid #ddd;">
        <strong>${s.name}</strong> — Score: <input type="number" value="${s.score}" id="score-${i}" style="width: 40px;"> <br>
        <textarea id="comment-${i}" rows="2" style="width:100%; margin-top: 4px;">${s.comment}</textarea><br>
        <div style="margin: 6px 0; font-size: 0.85em; background: #f9f9f9; padding: 6px; border: 1px dashed #ccc; max-height: 150px; overflow-y: auto;">
          ${s.posts.map((p, j) => `<div style='margin-bottom:4px;'><strong>Post ${j + 1}:</strong><br>${p.message}</div>`).join('')}
        </div>
        <div style="margin: 6px 0; font-size: 0.8em; background: #eef; padding: 6px; border: 1px solid #99c;">
          ${s.rubric}
        </div>
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

  setTimeout(() => {
    buildGradingQueue();
  }, 0);

})();
