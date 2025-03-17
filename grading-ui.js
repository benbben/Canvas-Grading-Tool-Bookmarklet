// grading-ui.js
(function() {
  let courseId, assignmentId, studentId;

  const sidebar = document.createElement("div");
  sidebar.textContent = "Waiting for context from parent page...";
  document.body.appendChild(sidebar);

  window.addEventListener("message", async (event) => {
    if (event.data?.type === "canvas-context") {
      courseId = event.data.courseId;
      assignmentId = event.data.assignmentId;
      studentId = event.data.studentId;

      sidebar.textContent = `Course ID: ${courseId}, Assignment ID: ${assignmentId}, Student ID: ${studentId}`;
      // TODO: Load posts, compute grade, render UI here.
    }
  });
})();
