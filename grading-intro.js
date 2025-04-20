// grading-intro.js
// Version: v15
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
// - v10: Converted override to inline editable text input and added 10 more randomized instructor comments
// - v11: Moved score override above feedback and removed excess spacing
// - v12: Increased sidebar width to avoid scrollbars
// - v13: Sidebar width increased to 475px and planning interactive rubric cell editing
// - v14: Rubric rows converted to editable score inputs that dynamically update total and icons
// - v15: Fixed join syntax bug by replacing newline with empty string

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
    width: 475px;
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
      <h2 style="margin:0;">Intro Grading Tool <span style='font-size:0.7em; color:#888;'>(v15)</span></h2>
      <button id="closeSidebar" style="font-size:16px; padding:4px 8px;">×</button>
    </div>
    <div id="status">Initializing...</div>
    <div id="posts"></div>
    <div id="rubric"></div>
    <div id="grade"></div>
    <div style="margin-top:20px; font-size:0.8em; color:#666">Intro Rubric Version v15</div>
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
      const rubricTable = `<h4>Rubric:</h4>
        <table style='width:100%; border-collapse:collapse;'>
          <tr><th style='border:1px solid #ccc;'>Criterion</th><th style='border:1px solid #ccc;'>Met?</th><th style='border:1px solid #ccc;'>Points</th></tr>
          ${criteria.map((c, i) => {
            const met = c.patterns.some(p => p.test(responseText));
            const value = met ? c.points : 0;
            return `<tr>
              <td style='border:1px solid #ccc;'>${c.label}</td>
              <td style='border:1px solid #ccc;' id='emoji-${i}'>${met ? "✅" : "❌"}</td>
              <td style='border:1px solid #ccc;'>
                <input type='number' id='rubric-${i}' value='${value}' min='0' max='${c.points}' style='width:40px; text-align:center;'> / ${c.points}
              </td>
            </tr>`;
          }).join("")}
          <tr>
            <td colspan='2' style='border:1px solid #ccc; font-weight:bold;'>Total</td>
            <td style='border:1px solid #ccc; font-weight:bold;'><span id='rubric-total'>${totalScore}</span> / 10</td>
          </tr>
        </table>`;

      const postSummary = studentPosts.map((p, i) => `Post ${i + 1} (${countWordsSmart(p.message)} words)`).join("<br>");
      document.getElementById("posts").innerHTML = `<h4>Summary:</h4>${postSummary}`;
      document.getElementById("rubric").innerHTML = rubricTable;

      // Hook rubric inputs to live update total + icons
      criteria.forEach((c, i) => {
        const input = document.getElementById(`rubric-${i}`);
        input.addEventListener('input', () => {
          const score = Math.max(0, Math.min(Number(input.value), c.points));
          input.value = score;
          document.getElementById(`emoji-${i}`).textContent = score > 0 ? '✅' : '❌';
          let updatedTotal = 0;
          criteria.forEach((c2, j) => {
            const val = parseInt(document.getElementById(`rubric-${j}`).value, 10);
            updatedTotal += isNaN(val) ? 0 : val;
          });
          if (lateIntro) updatedTotal -= 2;
          if (replyCheck) updatedTotal += 4;
          updatedTotal = Math.max(0, updatedTotal);
          document.getElementById("rubric-total").textContent = updatedTotal;
          const overrideInput = document.getElementById("overrideScore");
          if (overrideInput) overrideInput.value = updatedTotal;
        });
      });

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
        "Excited to have you in the course!",
        "Wishing you a great start to the quarter!",
        "Glad you're part of our learning community!",
        "Appreciate the detail in your post!",
        "You're off to a strong start!",
        "Thanks for sharing your story with us!",
        "Hope this course supports your journey!",
        "Great to see your enthusiasm!",
        "Looking forward to your insights!",
        "Thanks for making the effort to connect!",
        "Happy to have you here with us!"
      ];
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      const missingLabels = rubricRows.filter(r => r.includes('❌')).map(r => r.match(/<td>(.*?)<\/td>/)?.[1]).filter(Boolean);
      const comment = missingLabels.length === 0 ?
        `${randomGreeting} ✅ Great job addressing all parts of the introduction. Full credit earned.` :
        `${randomGreeting} ⚠️ Your post was missing some required parts: ${missingLabels.join(', ')}. Score: ${totalScore}/10.`;

      document.getElementById("grade").innerHTML = `
        <div style="margin-bottom: 10px;"><strong>Score:</strong> <input id="overrideScore" type="text" value="${totalScore}" style="width:40px; text-align:center; font-weight:bold; margin-left:5px;" /> / 10</div>
        <h4>Feedback:</h4>
        <textarea rows="4" style="width:100%;" id="proposedComment">${comment}</textarea><br><br>
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
