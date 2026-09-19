document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const key = "learnFromNotesData";
  const defaults = { users: [], session: null, saved: [], score: 0, streak: 0, lastStudy: "", badges: {} };
  const read = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "{}");
      return { ...defaults, ...stored, users: Array.isArray(stored.users) ? stored.users : [], saved: Array.isArray(stored.saved) ? stored.saved : [], badges: { ...defaults.badges, ...(stored.badges || {}) } };
    } catch {
      return { ...defaults };
    }
  };
  let data = read();
  const write = () => localStorage.setItem(key, JSON.stringify(data));
  const go = (page) => { location.hash = `#${page}`; };
  const pageId = () => location.hash.replace("#", "") || "signup";
  const notice = document.createElement("p");
  notice.id = "app-notice";
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  $("#app").prepend(notice);
  const notify = (message) => { notice.textContent = message; };
  const sessionUser = () => data.users.find((user) => user.email === data.session) || null;
  const protectedPages = new Set(["home","account","edit-profile","delete-account","settings","upload","learning","summary","demo-video","voice-tutor","practice-test","practice-test-2","final-score","flashcards","flashcard-2","animation-book","exam-mode-actions","schedule-exam","exam-reminders","exam","performance-report","scheduled-exams","score-details","performance-details","badges"]);

  function guard() {
    const id = pageId();
    if (protectedPages.has(id) && !sessionUser()) {
      notify("Please log in to access your student dashboard.");
      go("login");
      return;
    }
    if (id === "home") renderHome();
    if (id === "account" || id === "edit-profile") renderProfile();
    if (id === "animation-book") renderBook();
    if (id === "exam-reminders") renderReminder();
    if (id === "exam") startExam();
  }
  window.addEventListener("hashchange", guard);

  function markStudy() {
    const today = new Date().toDateString();
    if (data.lastStudy !== today) {
      data.streak += 1;
      data.lastStudy = today;
    }
    write();
  }
  function renderHome() {
    $("#home-score").textContent = data.score;
    $("#home-streak").textContent = `${data.streak} Day${data.streak === 1 ? "" : "s"}`;
    $("#home-performance").textContent = data.lastPerformance || "No exam taken yet";
    const badge = data.score >= 80 ? "Quiz Champion" : data.streak >= 30 ? "30 Days Streak" : "No badges yet";
    $("#badge-card p").textContent = badge;
    $("#overall-score").textContent = `Overall Score: ${data.score}`;
    $$("#badge-list progress")[0].value = Math.min(data.streak, 30);
    $$("#badge-list progress")[1].value = Math.min(data.badges.quizzes || 0, 30);
  }
  function renderProfile() {
    const user = sessionUser();
    if (!user) return;
    const fields = $$("#profile-details dd");
    [user.name, user.username, user.email, user.category || "Not selected", (user.subjects || []).filter(Boolean).join(", ") || "No subjects"].forEach((value, index) => fields[index].textContent = value);
    const form = $("#edit-profile-form");
    form.elements["name"].value = user.name;
    form.elements["username"].value = user.username;
    form.elements["email"].value = user.email;
    form.elements["category"].value = user.category || "School / Primary";
    form.elements["subjects"].value = (user.subjects || []).filter(Boolean).join(", ");
  }

  $("#signup-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const email = form.elements["email"].value.trim().toLowerCase();
    if (data.users.some((user) => user.email === email)) return notify("An account with this email already exists. Please log in.");
    data.draft = { name: form.elements["name"].value.trim(), username: form.elements["username"].value.trim(), email, password: form.elements["password"].value };
    write();
    go("category");
  });
  $("#category-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (!event.currentTarget.reportValidity()) return;
    if (!data.draft) return go("signup");
    data.draft.category = $("input[name='category']:checked").value;
    write(); go("subjects");
  });
  $("#subjects-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity() || !data.draft) return go("signup");
    const user = { ...data.draft, subjects: [form["subject-1"].value.trim(), form["subject-2"].value.trim(), form["subject-3"].value.trim()] };
    data.users.push(user); data.session = user.email; delete data.draft; markStudy(); write(); notify(`Welcome, ${user.name}! Your dashboard is ready.`); go("home");
  });
  $("#login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const identity = form.identity.value.trim().toLowerCase();
    const user = data.users.find((item) => (item.email === identity || item.username.toLowerCase() === identity) && item.password === form.elements["password"].value);
    if (!user) return notify("Login failed. Check your email/username and password.");
    data.session = user.email; markStudy(); write(); notify(`Welcome back, ${user.name}!`); go("home");
  });
  $$("#account-actions a").forEach((link) => {
    if (link.textContent.trim() === "Logout") link.addEventListener("click", () => { data.session = null; write(); notify("You have been logged out."); });
  });
  $("#delete-account a[href='#signup']").addEventListener("click", (event) => {
    event.preventDefault();
    if (!confirm("Delete this local account and its saved progress?")) return;
    data.users = data.users.filter((user) => user.email !== data.session); data.session = null; data.saved = []; data.score = 0; data.streak = 0; write(); go("signup");
  });
  $("#edit-profile-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget, user = sessionUser();
    if (!user || !form.reportValidity()) return;
    user.name = form.elements["name"].value.trim(); user.username = form.elements["username"].value.trim(); user.email = form.elements["email"].value.trim().toLowerCase(); user.category = form.elements["category"].value; user.subjects = form.elements["subjects"].value.split(",").map((item) => item.trim()); data.session = user.email; write(); notify("Profile updated."); go("account");
  });
  $("#settings-form").addEventListener("submit", (event) => { event.preventDefault(); write(); notify("Settings saved."); go("home"); });
  $$("#pro-plan button").forEach((button) => button.addEventListener("click", () => notify(`${button.textContent.trim()} is a frontend-only placeholder.`)));

  $("#upload-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const file = $("input[type='file']", event.currentTarget).files[0];
    if (!file) return notify("Please select a notes file.");
    data.uploadedFile = file.name; markStudy(); write(); $("#summary-content p").textContent = `${file.name} is ready. Your summarized notes will appear here.`; notify(`${file.name} uploaded successfully.`); go("learning");
  });
  $("#voice-tutor-form").addEventListener("submit", (event) => { event.preventDefault(); const question = $("textarea", event.currentTarget).value.trim(); notify(question ? "Your voice tutor question has been received." : "Please type a question first."); });

  const practice = [
    { question: "What is the main idea of the uploaded notes?", options: ["The central concept", "An unrelated detail", "A random date"], answer: 0, explanation: "The correct answer identifies the central concept from the summary." },
    { question: "Which study method best helps remember key points?", options: ["Active recall", "Skipping revision", "Ignoring the topic"], answer: 0, explanation: "Active recall strengthens memory through repeated retrieval." }
  ];
  let practiceAnswers = [];
  function renderPractice(index) {
    const page = index ? $("#practice-test-2") : $("#practice-test");
    $("h2", page).nextElementSibling.textContent = `Question ${index + 1} of ${practice.length}`;
    $("legend", page).textContent = practice[index].question;
    $$("fieldset label", page).forEach((label, option) => { const radio = $("input", label); radio.value = option; radio.checked = practiceAnswers[index] === option; label.lastChild.textContent = ` ${practice[index].options[option]}`; label.style.background = ""; });
    $(".explanation", page).textContent = "Select an answer to see the explanation.";
  }
  function gradePractice(index, page) {
    const selected = $("input:checked", page); if (!selected) { notify("Select an answer before continuing."); return false; }
    const answer = Number(selected.value); practiceAnswers[index] = answer;
    $$("fieldset label", page).forEach((label, option) => label.style.background = option === practice[index].answer ? "#d9f8e9" : option === answer ? "#ffe1e1" : "");
    $(".explanation", page).textContent = practice[index].explanation;
    return true;
  }
  [0,1].forEach((index) => {
    const page = index ? $("#practice-test-2") : $("#practice-test"), form = $("form", page);
    $$("input", page).forEach((input) => input.addEventListener("change", () => gradePractice(index, page)));
    form.addEventListener("submit", (event) => { event.preventDefault(); if (!gradePractice(index, page)) return; if (!index) { renderPractice(1); go("practice-test-2"); } else { const earned = practiceAnswers.reduce((total, answer, i) => total + (answer === practice[i].answer ? 1 : 0), 0); data.score += earned * 10; data.badges.quizzes = (data.badges.quizzes || 0) + 1; data.lastPerformance = `${earned}/${practice.length} in Practice Test`; markStudy(); write(); $("#score-result").textContent = `${earned} / ${practice.length}`; notify("Practice test complete!"); go("final-score"); } });
  });
  renderPractice(0); renderPractice(1);

  const cards = [
    { topic: "Topic Name", points: "Key points", details: "Important details", memory: "Memorization techniques" },
    { topic: "Next Topic", points: "Next key points", details: "Next important details", memory: "Use a short story or acronym." }
  ];
  function flashCard(page, card, index) {
    const article = $("article", page);
    article.tabIndex = 0; article.setAttribute("role", "button");
    const face = () => article.dataset.flipped === "true";
    const draw = () => { article.innerHTML = face() ? `<h3>Key Points</h3><p>${card.points}</p><h3>Important Details</h3><p>${card.details}</p><h3>Memorization Techniques</h3><p>${card.memory}</p>` : `<h3>Topic</h3><p>${card.topic}</p><p>Click this card to flip it.</p>`; };
    const flip = () => { article.dataset.flipped = String(!face()); draw(); };
    article.addEventListener("click", flip); article.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); flip(); } }); draw();
    $("a[href='#animation-book']", page).addEventListener("click", (event) => { event.preventDefault(); const saved = { type: "Flash Card", title: card.topic, content: `${card.points} — ${card.details}` }; if (!data.saved.some((item) => item.title === saved.title)) data.saved.push(saved); markStudy(); write(); notify("Flash card saved to Animation Book."); go("animation-book"); });
  }
  flashCard($("#flashcards"), cards[0], 0); flashCard($("#flashcard-2"), cards[1], 1);
  $("#save-summary").addEventListener("click", (event) => { event.preventDefault(); const saved = { type: "Summary", title: data.uploadedFile || "Saved Summary", content: $("#summary-content p").textContent }; if (!data.saved.some((item) => item.title === saved.title)) data.saved.push(saved); markStudy(); write(); notify("Summary saved to Animation Book."); go("animation-book"); });
  function renderBook() {
    const areas = { Summary: $("#saved-summaries"), "Flash Card": $("#saved-flashcards"), Topic: $("#saved-topics") };
    Object.entries(areas).forEach(([type, area]) => { const heading = $("h3", area); area.innerHTML = ""; area.append(heading); data.saved.filter((item) => item.type === type || (type === "Topic" && item.type === "Flash Card")).forEach((item) => { const button = document.createElement("button"); button.type = "button"; button.textContent = item.title; button.addEventListener("click", () => notify(item.content)); area.append(button); }); if (area.children.length === 1) area.append(document.createElement("p")).textContent = "No saved content yet."; });
  }

  $("#exam-date").min = new Date().toISOString().slice(0, 10);
  $("#schedule-exam-form").addEventListener("submit", (event) => {
    event.preventDefault(); const form = event.currentTarget; if (!form.reportValidity()) return;
    data.exam = { date: $("#exam-date").value, topic: $("#exam-subject-topic").value, level: $("input[name='level']:checked").value }; write(); notify("Exam scheduled successfully."); go("exam-reminders");
  });
  function renderReminder() {
    if (!data.exam) return go("schedule-exam");
    const target = new Date(`${data.exam.date}T23:59:59`), days = Math.max(0, Math.ceil((target - new Date()) / 86400000));
    $("#scheduled-exam-date").textContent = `Exam date: ${data.exam.date} — ${days} day${days === 1 ? "" : "s"} remaining.`;
    $("#exam-notifications p").textContent = days ? `Your ${data.exam.level} exam is approaching. Revise ${data.exam.topic} and complete your module revision.` : "Your exam is due today. You are ready to begin.";
    $("#scheduled-exams-table tbody").innerHTML = `<tr><td>Scheduled Test</td><td>${data.exam.date}</td><td>${data.exam.topic}</td><td>Pending</td><td><a href="#exam">Take Test</a></td></tr>`;
  }
  const examBank = ["Which statement best explains the main concept?", "What is the most important key point to remember?", "Which example correctly applies this topic?"];
  let examIndex = 0, examAnswers = [], examTimer, seconds = 600;
  function examQuestion() { return `${examBank[examIndex]} (${data.exam?.topic || "selected topic"}, ${data.exam?.level || "Level 1"})`; }
  function renderExam() {
    $("#exam-question-heading").textContent = `MCQ Question ${examIndex + 1} of ${examBank.length}`;
    $("#exam-subject-display").textContent = examQuestion();
    $$("#exam-question-area input").forEach((input, index) => input.checked = examAnswers[examIndex] === index);
  }
  function startExam() {
    if (!data.exam) return go("schedule-exam");
    examIndex = 0; examAnswers = []; seconds = 600; renderExam(); clearInterval(examTimer);
    examTimer = setInterval(() => { seconds -= 1; const min = String(Math.max(0, Math.floor(seconds / 60))).padStart(2, "0"), sec = String(Math.max(0, seconds % 60)).padStart(2, "0"); $("#exam-timer").textContent = `Time Remaining: ${min}:${sec}`; if (!seconds) $("#exam-form").requestSubmit(); }, 1000);
  }
  $$("#exam-question-area input").forEach((input, index) => input.addEventListener("change", () => { examAnswers[examIndex] = index; }));
  const examButtons = $$("#exam-navigation button");
  examButtons[0].addEventListener("click", () => { if (examIndex) { examIndex -= 1; renderExam(); } });
  examButtons[1].addEventListener("click", () => { if (examAnswers[examIndex] === undefined) return notify("Select an answer first."); if (examIndex < examBank.length - 1) { examIndex += 1; renderExam(); } });
  $("#exam-form").addEventListener("submit", (event) => {
    event.preventDefault(); if (examAnswers.length < examBank.length) return notify("Answer every exam question before submitting."); clearInterval(examTimer); const earned = examAnswers.reduce((total, answer, index) => total + (answer === 0 ? 1 : 0), 0); const percent = Math.round(earned / examBank.length * 100); data.score += percent; data.lastPerformance = `${percent}% in ${data.exam.topic}`; data.badges.quizzes = (data.badges.quizzes || 0) + 1; markStudy(); write(); $("#exam-score").textContent = `Score: ${earned}/${examBank.length} (${percent}%)`; $("#exam-performance").textContent = `Performance: ${percent >= 70 ? "Strong" : "Keep practising"}`; $("#exam-streak").textContent = `Streak: ${data.streak} Days`; $("#difficulty-recommendation").textContent = percent >= 70 ? "Great work! Try the next difficulty level." : "Review the saved notes and repeat this level."; go("performance-report");
  });
  document.addEventListener("visibilitychange", () => { if (pageId() === "exam" && document.hidden) notify("Exam page left. Tab switching is recorded in this frontend demo."); });

  if (!location.hash) go(sessionUser() ? "home" : "signup");
  guard();
});
