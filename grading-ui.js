// grading-us.js (version v24 - Iframe Sidebar with Autograde Insertion)
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

  const iframe = document.createElement("iframe");
  iframe.src = "https://benbben.github.io/Canvas-Grading-Tool-Bookmarklet/";
  iframe.style.position = "fixed";
  iframe.style.top = "0";
  iframe.style.right = "0";
  iframe.style.width = "400px";
  iframe.style.height = "100%";
  iframe.style.zIndex = "9999";
  iframe.style.border = "none";
  iframe.style.boxShadow = "-4px 0 10px rgba(0,0,0,0.1)";

  document.body.appendChild(iframe);

  // Send context info to iframe after load
  iframe.onload = () => {
    iframe.contentWindow.postMessage({
      type: "canvas-context",
      courseId,
      assignmentId,
      studentId
    }, "*");
  };

  // Handle grading request from iframe
  window.addEventListener("message", (event) => {
    if (event.data?.type === "submit-grade") {
      const { score, comment } = event.data;

      const gradeBox = document.getElementById("grading-box-extended");
      if (gradeBox) gradeBox.value = score;

      const iframeComment = Array.from(document.querySelectorAll("iframe")).find(f =>
        f.contentDocument?.body?.id === "tinymce"
      );
      if (iframeComment) {
        const doc = iframeComment.contentDocument || iframeComment.contentWindow.document;
        const body = doc.querySelector("body#tinymce");
        if (body) {
          body.innerHTML = `<p>${comment}</p>`;
        }
      }
    }
  });
})();
