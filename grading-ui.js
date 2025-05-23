// grading-ui.js (version v35 - Praise Logic Added)
(function () {
  console.log("[GradingTool] Initializing script...");
  let courseId, assignmentId, studentId;
  let currentUrl = window.location.href;

  const url = window.location.href;
  const courseMatch = url.match(/courses\/(\d+)/);
  const assignmentMatch = url.match(/assignment_id=(\d+)/);
  const studentMatch = url.match(/student_id=(\d+)/);
  courseId = courseMatch ? courseMatch[1] : null;
  assignmentId = assignmentMatch ? assignmentMatch[1] : null;
  studentId = studentMatch ? studentMatch[1] : null;

  if (!courseId || !assignmentId || !studentId) {
    alert("This tool must be used within the Canvas SpeedGrader page.");
    return;
  }

  const sidebar = document.createElement("div");
  sidebar.id = "gradingToolSidebar";
  sidebar.style = `
    position: fixed;
    top: 100px;
    left: 100px;
    width: 400px;
    height: 800px;
    background: #f9f9f9;
    border: 2px solid #ccc;
    box-shadow: 4px 4px 12px rgba(0,0,0,0.2);
    z-index: 99999;
    padding: 10px;
    overflow: auto;
    resize: both;
    font-family: Arial, sans-serif;
    cursor: move;
  `;

  sidebar.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center;">
      <h2 style="margin:0;">Canvas Grading Tool</h2>
      <button id="closeSidebar" style="font-size:16px; padding:4px 8px;">×</button>
    </div>
    <div id="status">Initializing...</div>
    <div id="posts"></div>
    <div id="grade"></div>
    <div style="margin-top:20px; font-size:0.8em; color:#666">Version: v35</div>
  `;

  document.body.appendChild(sidebar);
  document.getElementById("closeSidebar").onclick = () => sidebar.remove();

  let isDragging = false, offsetX = 0, offsetY = 0;
  sidebar.addEventListener('mousedown', function(e) {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
    isDragging = true;
    offsetX = e.clientX - sidebar.offsetLeft;
    offsetY = e.clientY - sidebar.offsetTop;
    sidebar.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    sidebar.style.left = (e.clientX - offsetX) + 'px';
    sidebar.style.top = (e.clientY - offsetY) + 'px';
  });

  document.addEventListener('mouseup', function() {
    isDragging = false;
    sidebar.style.cursor = 'move';
  });

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

  async function fetchJSON(url) {
    console.log("[GradingTool] Fetching:", url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    return res.json();
  }

  async function loadAndRender() {
    try {
      const assignment = await fetchJSON(`/api/v1/courses/${courseId}/assignments/${assignmentId}`);
      const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;
      const discussionId = assignment.discussion_topic?.id;
      if (!discussionId) throw new Error("No discussion ID found");

      const discussion = await fetchJSON(`/api/v1/courses/${courseId}/discussion_topics/${discussionId}/view`);
      const allPosts = flattenPosts([...discussion.view, ...(discussion.replies || [])]);
      const studentPosts = allPosts.filter(p => String(p.user_id) === String(studentId) && p.message?.trim());

      if (studentPosts.length === 0) {
        document.getElementById("status").innerHTML = `<span style='color:red;'>❌ No posts found for student</span>`;
        return;
      }

      studentPosts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const postSummary = studentPosts.map((p, i) => {
        const wc = countWordsSmart(p.message);
        return `Post ${i + 1} word count: ${wc}`;
      }).join("<br>");
      document.getElementById("posts").innerHTML = `<h4>Summary:</h4>${postSummary}`;

      const initialWordCount = countWordsSmart(studentPosts[0].message);
      const numPosts = studentPosts.length;
      const late = dueDate && new Date(studentPosts[0].created_at) > dueDate;

      let score = 10;
      let deductions = [];
      if (initialWordCount < 100 || initialWordCount > 165) {
        score -= 2;
        deductions.push("Word count not within 100–150 (-2)");
      }
      if (numPosts < 2) {
        score -= 4;
        deductions.push("Only one post (-4)");
      }
      if (late) {
        score -= 5;
        deductions.push("Posted after due date (-5)");
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
      if (score >= 8) {
        feedbackLine =
          score === 10 ? premiumPraise[Math.floor(Math.random() * premiumPraise.length)] :
          score === 9 ? strongPraise[Math.floor(Math.random() * strongPraise.length)] :
          encouragingPraise[Math.floor(Math.random() * encouragingPraise.length)];
      } else {
        feedbackLine = encouragementOnly[Math.floor(Math.random() * encouragementOnly.length)];
      }

      const comment = [
        initialWordCount < 100 || initialWordCount > 165 ? `Your initial post was ${initialWordCount} words, which is outside the 100–150 range. ` : "",
        numPosts < 2 ? "Only one post was submitted, which impacts participation. " : "",
        late ? "The initial post was made after the deadline. " : "",
        `${feedbackLine} Score: ${score}/10.`
      ].join("").trim();

      const internal = `<h4>Internal Reference:</h4>
        <table style='border-collapse:collapse;'>
          <tr><td style='border:1px solid #ccc;padding:4px;'>Initial Post WC</td><td style='border:1px solid #ccc;padding:4px;'>${initialWordCount}</td></tr>
          <tr><td style='border:1px solid #ccc;padding:4px;'># of Posts</td><td style='border:1px solid #ccc;padding:4px;'>${numPosts}</td></tr>
          <tr><td style='border:1px solid #ccc;padding:4px;'>Late?</td><td style='border:1px solid #ccc;padding:4px;'>${late ? "Yes" : "No"}</td></tr>
          <tr><td style='border:1px solid #ccc;padding:4px;'>Deductions</td><td style='border:1px solid #ccc;padding:4px;'>${deductions.join(", ") || "None"}</td></tr>
          <tr><td style='border:1px solid #ccc;padding:4px;'>Final Score</td><td style='border:1px solid #ccc;padding:4px;'>${score}/10</td></tr>
        </table>`;

      document.getElementById("grade").innerHTML = `
        ${internal}<br><br>
        <h4>Proposed Comment:</h4>
        <textarea rows="4" style="width:100%;" id="proposedComment">${comment}</textarea><br><br>
        <button id="approveBtn">✅ Approve & Fill Grade</button>
      `;

      document.getElementById("approveBtn").onclick = () => {
        const gradeBox = document.getElementById("grading-box-extended");
        if (gradeBox) {
          gradeBox.focus();
          gradeBox.value = '';
          const chars = String(score).split('');
          chars.forEach(char => {
            gradeBox.value += char;
            gradeBox.dispatchEvent(new Event("input", { bubbles: true }));
          });
          gradeBox.dispatchEvent(new Event("change", { bubbles: true }));
          gradeBox.blur();
          const container = document.getElementById("grade_container");
          if (container) container.click();
        }

        const iframeComment = Array.from(document.querySelectorAll("iframe")).find(f =>
          f.contentDocument?.body?.id === "tinymce"
        );
        if (iframeComment) {
          const doc = iframeComment.contentDocument || iframeComment.contentWindow.document;
          const body = doc.querySelector("body#tinymce");
          if (body) {
            const editedComment = document.getElementById("proposedComment")?.value?.trim() || comment;
            body.innerHTML = `<p>${editedComment}</p>`;
            body.focus();
            setTimeout(() => body.blur(), 100);
          }
        }
      };
    } catch (err) {
      console.error("[GradingTool] loadAndRender error:", err);
      document.getElementById("status").innerHTML = `<span style='color:red;'>❌ ${err.message}</span>`;
    }
  }

  loadAndRender();

  const observer = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      const newUrl = window.location.href;
      const newStudentMatch = newUrl.match(/student_id=(\d+)/);
      const newStudentId = newStudentMatch ? newStudentMatch[1] : null;
      if (newStudentId && newStudentId !== studentId) {
        studentId = newStudentId;
        currentUrl = newUrl;
        document.getElementById("status").textContent = "Loading new student...";
        loadAndRender();
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
