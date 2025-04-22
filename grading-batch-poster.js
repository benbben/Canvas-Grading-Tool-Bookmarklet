// grading-batch-poster.js
// Full UI + Batch Approval + Auto Posting System for SpeedGrader
// Version: v2.41 (Apr 22, 2025)

(function () {
  localStorage.removeItem("canvasBatchQueue");

  const existing = document.getElementById("batchGraderPanel");
  if (existing) existing.remove();
  console.log("[BatchPoster v2.41] Initializing grading tool...");

  const panel = document.createElement("div");
  panel.id = "batchGraderPanel";
  panel.style = `
    position: fixed;
    top: 40px;
    left: 40px;
    width: 90vw;
    height: 90vh;
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
    <div style="position: sticky; top: 0; background: white; z-index: 1000; padding-bottom: 4px; border-bottom: 1px solid #ccc;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0;">Batch Grading Tool</h3>
        <div>
          <button id="approveAll" style="margin-right: 6px;">✅ Approve All</button>
<button id="regrade" style="margin-right: 6px;">🔄 Regrade</button>
          <button id="startPosting" style="margin-top: 12px; padding: 6px 12px;">🚀 Post All Approved</button>
          <button id="minimizePanel" style="margin-right: 4px;">–</button>
          <button id="maximizePanel" style="margin-right: 4px; display: none;">⬜</button>
          <button onclick="document.getElementById('batchGraderPanel').remove()">×</button>
        </div>
      </div>
      <div style="margin-top: 4px; font-size: 0.85em;">
        Word Count Range: 
        <input id="minWords" type="number" value="100" style="width: 60px;"> – 
        <input id="maxWords" type="number" value="165" style="width: 60px;">
      </div>
    </div>
    <div id="batchStatus" style="margin: 10px 0;">Loading student data...</div>
    <div id="studentQueue"></div>
    <div style="margin-top:10px; font-size: 0.75em; color: #999">Version: v2.41</div>
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
    const approveAll = document.getElementById("approveAll");

    if (minimize && maximize && batchStatus && studentQueue && startPosting) {
      const regrade = document.getElementById("regrade");
      if (regrade) {
        regrade.onclick = () => {
          gradingQueue.length = 0;
          localStorage.removeItem("canvasBatchQueue");
          buildGradingQueue();
        };
      }
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
  const total = gradingQueue.length;
  const approved = gradingQueue.filter(s => s.approved).length;
  if (approved < total) {
    const confirmProceed = confirm(`Only ${approved} of ${total} students are approved. Do you want to continue?`);
    if (!confirmProceed) return;
  }

  // Minimize UI for visibility
  document.getElementById('minimizePanel')?.click();

while (true) {
  const url = window.location.href;
  const match = url.match(/student_id=(\d+)/);
  const currentId = match ? match[1] : null;
  if (!currentId) break;

  const student = gradingQueue.find(s => String(s.id) === String(currentId) && s.approved);
  if (!student) {
    console.log(`[BatchPoster] No approved entry for student ${currentId}. Skipping...`);
    document.querySelector("i.icon-arrow-right.next")?.click();
    await new Promise(resolve => setTimeout(resolve, 2000));
    continue;
  }

  console.log(`[BatchPoster] Posting for ${student.name} (ID ${student.id})`);

  const gradeBox = document.getElementById("grading-box-extended");
  if (gradeBox) {
    gradeBox.style.boxShadow = '0 0 6px 3px #4CAF50';
    setTimeout(() => gradeBox.style.boxShadow = '', 2000);
    gradeBox.focus();
    gradeBox.value = '';
    const chars = String(student.score).split('');
    chars.forEach(char => {
      gradeBox.value += char;
      gradeBox.dispatchEvent(new Event("input", { bubbles: true }));
    });
    gradeBox.dispatchEvent(new Event("change", { bubbles: true }));
    gradeBox.blur();
  }
  await new Promise(resolve => setTimeout(resolve, 2000));

  const iframe = Array.from(document.querySelectorAll("iframe")).find(f =>
    f.contentDocument?.body?.id === "tinymce"
  );
  if (iframe) {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    const body = doc.querySelector("body#tinymce");
    if (body) {
      body.style.boxShadow = '0 0 6px 3px #2196F3';
      setTimeout(() => body.style.boxShadow = '', 2000);
      body.innerHTML = `<p>${student.comment}</p>`;
      body.focus();
      setTimeout(() => body.blur(), 100);
    }
  }
  await new Promise(resolve => setTimeout(resolve, 2000));

  const submitButton = document.getElementById("comment_submit_button");
  if (submitButton) {
    submitButton.style.boxShadow = '0 0 6px 3px #FF9800';
    submitButton.focus();
    setTimeout(() => {
      submitButton.click();
      submitButton.blur();
      submitButton.style.boxShadow = '';
    }, 300);
  }
  await new Promise(resolve => setTimeout(resolve, 2000));

  document.querySelector("i.icon-arrow-right.next")?.click();
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ✅ Only increment once we are done posting and moved forward
  postedStudentIds.add(student.id);
  if (postedStudentIds.size >= approved) {
    alert("🎉 All approved grades have been posted.");
    break;
  }
}


  alert("🎉 Posting complete!");
  localStorage.removeItem("canvasBatchQueue");
  gradingQueue.length = 0;
  renderQueue();
};
approveAll.onclick = () => {
  gradingQueue.forEach((s, i) => {
    s.approved = true;
    const scoreInput = document.getElementById(`score-${i}`);
    const commentInput = document.getElementById(`comment-${i}`);
    if (scoreInput && commentInput) {
      s.score = parseFloat(scoreInput.value);
      s.comment = commentInput.value;
    }
  });
  localStorage.setItem("canvasBatchQueue", JSON.stringify(gradingQueue));
  renderQueue();
};

    }
  }, 0);

  // State store for student data
  const gradingQueue = [];
  const userCache = {};
  const userNameMap = {};
  const studentIds = new Set();
  const postedStudentIds = new Set();
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
        studentIds.add(u.id);
        userNameMap[u.id] = u.sortable_name || u.name || `User ${u.id}`;
      });
        page++;
      }
    } catch (err) {
      console.warn("Failed to fetch course users:", err);
    }

  }

  async function buildGradingQueue() {
    const minWords = Math.max(50, parseInt(document.getElementById("minWords")?.value || "100"));
    const maxWords = Math.min(300, parseInt(document.getElementById("maxWords")?.value || "165"));
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
        if (!studentIds.has(Number(userId))) continue;
        const name = userNameMap[userId] || `User ${userId}`;
        posts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const initialPost = posts[0];
        const wc = countWordsSmart(initialPost.message);
        const late = dueDate && new Date(initialPost.created_at) > dueDate;

        let score = 10;
        const deductions = [];
        if (wc < minWords || wc > maxWords) {
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

        const premiumPraise = [
          "Excellent contribution! You nailed it.",
          "Fantastic work – well articulated and insightful.",
          "Nice job engaging with the topic and your peers.",
          "Thoughtful and clear – really well done.",
          "You clearly understood the material – great job.",
          "This was a polished and well-thought-out post.",
          "Really effective communication in this post – well done!",
          "Well-expressed and appropriately detailed – excellent work.",
          "Your response was both accurate and engaging.",
          "A strong and well-written entry – keep it up!"
        ];

        const strongPraise = [
          "Great effort! Your points were well explained.",
          "Strong post, you demonstrated good understanding.",
          "Terrific job staying within the guidelines and delivering quality input.",
          "Solid contribution, both timely and relevant.",
          "You did a great job applying the concepts here.",
          "Strong submission – your perspective was clear and compelling.",
          "Nice balance of detail and relevance in your response.",
          "Excellent depth and clarity in your writing.",
          "Your participation stood out – great work!",
          "This post demonstrated maturity and strong comprehension."
        ];

        const encouragingPraise = [
          "Good work! You're close to full credit.",
          "Nice post – just a few small things to tighten up.",
          "You’re on the right track with this submission.",
          "Good effort – you demonstrated understanding of the topic.",
          "Well done overall – keep building on this foundation."
        ];

        const encouragementOnly = [
          "You're making progress – keep pushing forward.",
          "Appreciate your effort – a bit more polish next time.",
          "Don’t get discouraged – improvement is part of the process.",
          "You’re almost there – keep participating actively.",
          "Thanks for engaging – looking forward to your next post!"
        ];

        let feedbackLine = '';
        if (posts.length >= 3) {
        feedbackLine = premiumPraise[Math.floor(Math.random() * premiumPraise.length)];
        }
        else if (score >= 8) {
          feedbackLine =
            score === 10 ? premiumPraise[Math.floor(Math.random() * premiumPraise.length)] :
            score === 9 ? strongPraise[Math.floor(Math.random() * strongPraise.length)] :
            encouragingPraise[Math.floor(Math.random() * encouragingPraise.length)];
        } else {
          feedbackLine = encouragementOnly[Math.floor(Math.random() * encouragementOnly.length)];
        }

        const comment = [
          wc < minWords || wc > maxWords ? `Your initial post was ${wc} words, which is outside the expected ${minWords}–${maxWords} word range. ` : "",
          posts.length < 2 ? "Only one post was submitted, which impacts participation. " : "",
          late ? "The initial post was made after the deadline. " : "",
          feedbackLine,
          ` Your final score is ${score}/10.`
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
        localStorage.setItem("canvasBatchQueue", JSON.stringify(gradingQueue));
      }

      document.getElementById("batchStatus").innerText = `Loaded ${gradingQueue.length} students.`;
      renderQueue();
    } catch (err) {
  const statusEl = document.getElementById("batchStatus");
  if (statusEl) statusEl.innerText = `❌ ${err.message}`;
}


  }

  const renderQueue = () => {
    const container = document.getElementById("studentQueue");
    container.innerHTML = gradingQueue.map((s, i) => `
      <div style="margin-bottom: 10px; padding: 6px; border: 1px solid #ddd;">
        <strong>${s.name}</strong><br>
        <div style="display: flex; gap: 1%; margin-top: 6px;">
          <div style="width: 15%; font-size: 0.8em; background: #eef; padding: 6px; border: 1px solid #99c;">
            ${s.rubric}
          </div>
          <div style="width: 34%; font-size: 0.85em; background: #f9f9f9; padding: 6px; border: 1px dashed #ccc; max-height: 150px; overflow-y: auto;">
            ${s.posts[0] ? `<strong>Post 1:</strong><br>${s.posts[0].message}` : ""}
          </div>
          <div style="width: 34%; font-size: 0.85em; background: #f9f9f9; padding: 6px; border: 1px dashed #ccc; max-height: 150px; overflow-y: auto;">
            ${s.posts[1] ? `<strong>Post 2:</strong><br>${s.posts[1].message}` : ""}
          </div>
        </div>
        ${s.posts.length > 2 ? `
          <div style="display: flex; gap: 1%; margin-top: 6px;"><div style="width: 15%;"></div>
            <div style="width: 34%; font-size: 0.85em; background: #f9f9f9; padding: 6px; border: 1px dashed #ccc; max-height: 150px; overflow-y: auto;">
              ${s.posts[2] ? `<strong>Post 3:</strong><br>${s.posts[2].message}` : ""}
            </div>
            <div style="width: 34%; font-size: 0.85em; background: #f9f9f9; padding: 6px; border: 1px dashed #ccc; max-height: 150px; overflow-y: auto;">
              ${s.posts[3] ? `<strong>Post 4:</strong><br>${s.posts[3].message}` : ""}
            </div>
          </div>
        ` : ""}
        <div style="margin-top: 6px;">
          <textarea id="comment-${i}" rows="2" style="width:100%;" ${s.approved ? 'disabled' : ''}>${s.comment}</textarea>
        </div>
        <div style="margin-top: 6px; display: flex; align-items: center; gap: 10px;">
          Score: <input type="number" value="${s.score}" id="score-${i}" style="width: 40px;" ${s.approved ? 'disabled' : ''}>
          ${s.approved ? `<button onclick="editStudent(${i})">✏️ Edit</button>` : `<button onclick="approveStudent(${i})">✅ Approve</button>`}
          <span id="approved-${i}" style="color: green; display: ${s.approved ? 'inline' : 'none'};">Approved</span>
        </div>
      </div>
    `).join("");
  };

  window.approveStudent = (index) => {
    const score = parseFloat(document.getElementById(`score-${index}`).value);
    const comment = document.getElementById(`comment-${index}`).value;
    gradingQueue[index].score = score;
    gradingQueue[index].comment = comment;
    gradingQueue[index].approved = true;
    localStorage.setItem("canvasBatchQueue", JSON.stringify(gradingQueue));
    renderQueue();
  };

  window.editStudent = (index) => {
    gradingQueue[index].approved = false;
    localStorage.setItem("canvasBatchQueue", JSON.stringify(gradingQueue));
    renderQueue();
  };

  setTimeout(() => {
    const saved = localStorage.getItem("canvasBatchQueue");
    if (saved) {
      gradingQueue.push(...JSON.parse(saved));
      renderQueue();
      return;
    }
    buildGradingQueue();
  }, 0);

})();
