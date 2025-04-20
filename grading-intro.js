// grading-intro.js
// Version: v9
// Description: Canvas SpeedGrader bookmarklet for grading 'Introduction' discussion posts using semantic rubric matching
// Changelog:
// - v1: Initial rubric-based grading logic
// - v2: Added broader pattern matching for degree/certificate detection
// - v3: Introduced randomized instructor-style feedback comments
// - v4: Fixed pattern loading bug, restored all rubric categories
// - v5: Version number now shown in header and top of script; auto-incremented with each release
// - v6: Broadened pattern matching for educational background detection
// - v7: Expanded logic to recognize intent to transfer as career aspiration, pre-college experience as work, and clarified degree pursuit phrasing
// - v8: Broadened career aspiration matching and improved feedback comment to show which rubric items were missing
// - v9: Added override input for grade prior to approval

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

  const existingSidebar = document.getElementById("gradingToolSidebar");
  if (existingSidebar) existingSidebar.remove();

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
      <h2 style="margin:0;">Intro Grading Tool <span style='font-size:0.7em; color:#888;'>(v9)</span></h2>
      <button id="closeSidebar" style="font-size:16px; padding:4px 8px;">×</button>
    </div>
    <div id="status">Initializing...</div>
    <div id="posts"></div>
    <div id="rubric"></div>
    <div id="grade"></div>
    <div style="margin-top:20px; font-size:0.8em; color:#666">Intro Rubric Version v9</div>
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
      const initialPost = studentPosts[0];
      const replyPost = studentPosts.length > 1 ? studentPosts[1] : null;
      const pstCutoff = new Date(initialPost.created_at);
      pstCutoff.setHours(pstCutoff.getHours() + 3);
      const lateIntro = dueDate && pstCutoff > new Date(dueDate);

      const responseText = initialPost.message.toLowerCase();

      const criteria = [
        {
          label: "Why are you taking this class?",
          patterns: [/taking.*class/, /enroll.*class/, /i.*take.*class/, /i.*signed.*up/, /require.*for.*degree/, /because.*class/],
          points: 1
        },
        {
          label: "Educational background",
          patterns: [/i.*studied/, /i.*have.*degree/, /i.*graduated/, /education.*background/, /college.*major/, /my.*education/, /currently.*attending/, /enrolled.*college/, /taking.*classes/, /quarter.*here/, /semester.*here/, /school.*history/],
          points: 1
        },
        {
          label: "Career aspirations",
          patterns: [/want.*be/, /plan.*career/, /career.*goal/, /i.*hope.*to.*work/, /eventually.*become/, /i.*am.*pursuing.*career/, /transfer.*to.*university/, /uncertain.*career/, /not.*sure.*what.*to.*do/, /decided.*change.*paths/, /my.*aspiration/, /hope.*to.*be/, /goal.*is.*to.*become/, /i.*aspire.*to.*be/, /manager.*in.*/],
          points: 1
        },
        {
          label: "Interests outside accounting",
          patterns: [/when.*not.*study/, /outside.*class/, /free.*time/, /i.*enjoy/, /hobby/, /like.*to.*do/],
          points: 1
        },
        {
          label: "Work experience",
          patterns: [/i.*work/, /worked.*as/, /job/, /employment/, /experience.*with/, /my.*career.*so.*far/, /before.*attending/, /i.*studied.*as/, /previous.*field/, /prior.*background/],
          points: 1
        },
        {
          label: "Pursuing degree or certificate",
          patterns: [/working.*degree/, /getting.*certificate/, /enrolled.*program/, /i.*am.*earning/, /completing.*degree/, /studying.*for.*certificate/, /earn.*degree/, /associate.*degree/, /bachelor.*degree/, /certificate.*program/, /transfer.*to.*university/, /currently.*pursuing/, /finish.*studies/],
          points: 1
        }
      ];

      let rubricRows = [], rubricScore = 0;
      criteria.forEach(c => {
        const met = c.patterns.some(p => p.test(responseText));
        rubricRows.push(`<tr><td>${c.label}</td><td>${met ? "✅" : "❌"}</td><td>${met ? c.points : 0}</td></tr>`);
        rubricScore += met ? c.points : 0;
      });

      if (lateIntro) {
        rubricRows.push(`<tr><td>Late post (after Thursday PST)</td><td>❌</td><td>-2</td></tr>`);
        rubricScore -= 2;
      }

      const replyCheck = replyPost && countWordsSmart(replyPost.message) > 5;
      if (!replyCheck) {
        rubricRows.push(`<tr><td>Reply to peer</td><td>❌</td><td>0</td></tr>`);
      } else {
        rubricRows.push(`<tr><td>Reply to peer</td><td>✅</td><td>4</td></tr>`);
        rubricScore += 4;
      }

      const totalScore = Math.max(0, rubricScore);
      const rubricTable = `
        <h4>Rubric:</h4>
        <table style='width:100%; border-collapse:collapse;'>
          <tr><th style='border:1px solid #ccc;'>Criterion</th><th style='border:1px solid #ccc;'>Met?</th><th style='border:1px solid #ccc;'>Points</th></tr>
          ${rubricRows.join("\n")}
          <tr><td colspan='2' style='border:1px solid #ccc; font-weight:bold;'>Total</td><td style='border:1px solid #ccc; font-weight:bold;'>${totalScore}/10</td></tr>
        </table>`;

      const postSummary = studentPosts.map((p, i) => `Post ${i + 1} (${countWordsSmart(p.message)} words)`).join("<br>");
      document.getElementById("posts").innerHTML = `<h4>Summary:</h4>${postSummary}`;
      document.getElementById("rubric").innerHTML = rubricTable;

      const greetings = [
        "Thanks for introducing yourself!",
        "Welcome to the class!",
        "Glad to have you on board!",
        "Appreciate your thoughtful intro.",
        "Looking forward to seeing your work this quarter!",
        "Thanks for sharing your background!",
        "Sounds like you're bringing great experience.",
        "Hope this class helps with your goals!",
        "Nice to meet you virtually!",
        "Excited to have you in the course!"
      ];
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      const missingLabels = rubricRows.filter(r => r.includes('❌')).map(r => r.match(/<td>(.*?)<\/td>/)?.[1]).filter(Boolean);
      const comment = missingLabels.length === 0 ?
        `${randomGreeting} ✅ Great job addressing all parts of the introduction. Full credit earned.` :
        `${randomGreeting} ⚠️ Your post was missing some required parts: ${missingLabels.join(', ')}. Score: ${totalScore}/10.`;

      document.getElementById("grade").innerHTML = `
        <h4>Feedback:</h4>
        <textarea rows="4" style="width:100%;" id="proposedComment">${comment}</textarea><br><br>
        <label><strong>Override Score:</strong></label><br>
        <input id="overrideScore" type="number" min="0" max="10" value="${totalScore}" style="width:60px; margin-top:4px;" /><br><br><br><br>
        <button id="approveBtn">✅ Approve & Fill Grade</button>
      `;

      document.getElementById("approveBtn").onclick = () => {
        const gradeBox = document.getElementById("grading-box-extended");
        if (gradeBox) {
          gradeBox.focus();
          gradeBox.value = '';
          const overrideInput = document.getElementById("overrideScore");
        const scoreToUse = overrideInput ? parseInt(overrideInput.value, 10) : totalScore;
        const chars = String(scoreToUse).split('');
          chars.forEach(char => {
            gradeBox.value += char;
            gradeBox.dispatchEvent(new Event("input", { bubbles: true }));
          });
          gradeBox.dispatchEvent(new Event("change", { bubbles: true }));
          gradeBox.blur();
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
