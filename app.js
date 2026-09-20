document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [
    ...parent.querySelectorAll(selector),
  ];

  const key = "learnFromNotesData";

  const defaults = {
    users: [],
    session: null,
    saved: [],
    score: 0,
    streak: 0,
    lastStudy: "",
    badges: {},
    uploadedFile: "",
    uploadedText: "",
    aiSummary: "",
    settings: {
      theme: "system",
      textSize: "medium",
      reduceMotion: false,
    },
  };

  const read = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "{}");

      return {
        ...defaults,
        ...stored,
        users: Array.isArray(stored.users) ? stored.users : [],
        saved: Array.isArray(stored.saved) ? stored.saved : [],
        badges: { ...defaults.badges, ...(stored.badges || {}) },
        settings: { ...defaults.settings, ...(stored.settings || {}) },
      };
    } catch {
      return { ...defaults };
    }
  };

  let data = read();

  const write = () =>
    localStorage.setItem(key, JSON.stringify(data));

  const applySettings = () => {
    const { theme, textSize, reduceMotion } = data.settings;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = theme === "dark" || (theme === "system" && prefersDark);

    document.body.classList.toggle("theme-dark", isDark);
    document.body.classList.toggle("reduce-motion", reduceMotion);
    document.body.dataset.textSize = textSize;

    const form = $("#settings-form");
    form.elements["theme"].value = theme;
    form.elements["category"].value =
      sessionUser()?.category || "school-primary";
    form.elements["text-size"].value = textSize;
    form.elements["reduce-motion"].checked = reduceMotion;
  };

  const go = (page) => {
    location.hash = `#${page}`;
  };

  const pageId = () =>
    location.hash.replace("#", "") || "signup";

  const notice = document.createElement("p");
  notice.id = "app-notice";
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");

  $("#app").prepend(notice);

  const notify = (message) => {
    notice.textContent = message;
  };

  const sessionUser = () =>
    data.users.find((user) => user.email === data.session) || null;

  const protectedPages = new Set([
    "home",
    "account",
    "edit-profile",
    "delete-account",
    "settings",
    "upload",
    "learning",
    "summary",
    "demo-video",
    "voice-tutor",
    "practice-test",
    "practice-test-2",
    "final-score",
    "flashcards",
    "animation-book",
    "exam-mode-actions",
    "schedule-exam",
    "exam-reminders",
    "exam",
    "performance-report",
    "scheduled-exams",
    "score-details",
    "performance-details",
    "badges",
  ]);

  function guard() {
    const id = pageId();

    if (protectedPages.has(id) && !sessionUser()) {
      notify("Please log in to access your student dashboard.");
      go("login");
      return;
    }

    if (id === "home") renderHome();

    if (id === "account" || id === "edit-profile")
      renderProfile();

    if (id === "animation-book")
      renderBook();

    if (id === "exam-reminders")
      renderReminder();

    if (id === "exam")
      startExam();

    if (id === "voice-tutor")
      voiceTutor.renderContext();

    if (id === "demo-video")
      videoLesson.renderScene();

    if (id === "practice-test")
      practiceTest.render(0);

    if (id === "practice-test-2")
      practiceTest.render(1);
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

    $("#home-streak").textContent =
      `${data.streak} Day${data.streak === 1 ? "" : "s"}`;

    $("#home-performance").textContent =
      data.lastPerformance || "No exam taken yet";

    const badge =
      data.score >= 80
        ? "Quiz Champion"
        : data.streak >= 30
          ? "30 Days Streak"
          : "No badges yet";

    $("#badge-card p").textContent = badge;

    $("#overall-score").textContent =
      `Overall Score: ${data.score}`;

    $$("#badge-list progress")[0].value =
      Math.min(data.streak, 30);

    $$("#badge-list progress")[1].value =
      Math.min(data.badges.quizzes || 0, 30);
  }

  function renderProfile() {
    const user = sessionUser();

    if (!user) return;

    const fields = $$("#profile-details dd");
    const priorities = user.subjectPriorities?.length ? user.subjectPriorities.map((subject, index) => `${index + 1}. ${subject}`).join(", ") : user.prioritySubject ? `1. ${user.prioritySubject}` : "Not selected";
    [user.name, user.username, user.email, user.category || "Not selected", (user.subjects || []).filter(Boolean).join(", ") || "No subjects", priorities].forEach((value, index) => fields[index].textContent = value);
    const form = $("#edit-profile-form");

    form.elements["name"].value = user.name;
    form.elements["username"].value = user.username;
    form.elements["email"].value = user.email;
    form.elements["category"].value = user.category || "School / Primary";
    form.elements["subjects"].value = (user.subjects || []).filter(Boolean).join(", ");
    updatePriorityOptions(user.subjectPriorities || (user.prioritySubject ? [user.prioritySubject] : []));
  }

  function updatePriorityOptions(selected = []) {
    const form = $("#edit-profile-form"), list = $("#subject-priority-list");
    const subjects = form.elements["subjects"].value.split(",").map((subject) => subject.trim()).filter(Boolean);
    const current = [...list.querySelectorAll("select")].reduce((priorities, select) => { if (select.value) priorities[Number(select.value) - 1] = select.dataset.subject; return priorities; }, selected);
    list.replaceChildren();
    if (!subjects.length) { list.textContent = "Add subjects above to set their priority order."; return; }
    subjects.forEach((subject) => {
      const label = document.createElement("label"), select = document.createElement("select"), savedRank = current.indexOf(subject) + 1;
      label.textContent = subject; select.dataset.subject = subject; select.className = "subject-priority-select"; select.add(new Option("Not ranked", ""));
      subjects.forEach((_, index) => select.add(new Option(`Priority ${index + 1}`, String(index + 1)))); select.value = savedRank ? String(savedRank) : "";
      label.append(select); list.append(label);
    });
  }

  $("#signup-form").addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      const form = event.currentTarget;

      if (!form.reportValidity()) return;

      const email =
        form.elements["email"].value
          .trim()
          .toLowerCase();

      if (
        data.users.some(
          (user) => user.email === email,
        )
      ) {
        return notify(
          "An account with this email already exists. Please log in.",
        );
      }

      data.draft = {
        name: form.elements["name"].value.trim(),
        username: form.elements["username"].value.trim(),
        email,
        password: form.elements["password"].value,
      };

      write();

      go("category");
    },
  );

  $("#category-form").addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      if (!event.currentTarget.reportValidity())
        return;

      if (!data.draft)
        return go("signup");

      data.draft.category =
        $("input[name='category']:checked").value;

      write();

      go("subjects");
    },
  );

  $("#subjects-form").addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      const form = event.currentTarget;

      if (!form.reportValidity() || !data.draft)
        return go("signup");

      const user = {
        ...data.draft,
        subjects: [
          form["subject-1"].value.trim(),
          form["subject-2"].value.trim(),
          form["subject-3"].value.trim(),
        ],
      };

      data.users.push(user);
      data.session = user.email;

      delete data.draft;

      markStudy();
      write();

      notify(
        `Welcome, ${user.name}! Your dashboard is ready.`,
      );

      go("home");
    },
  );

  $("#login-form").addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      const form = event.currentTarget;

      if (!form.reportValidity()) return;

      const identity =
        form.identity.value
          .trim()
          .toLowerCase();

      const user = data.users.find(
        (item) =>
          (
            item.email === identity ||
            item.username.toLowerCase() === identity
          ) &&
          item.password ===
            form.elements["password"].value,
      );

      if (!user)
        return notify(
          "Login failed. Check your email/username and password.",
        );

      data.session = user.email;

      markStudy();
      write();

      notify(`Welcome back, ${user.name}!`);

      go("home");
    },
  );

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
    const rankedSelects = [...$("#subject-priority-list").querySelectorAll("select")].filter((select) => select.value).sort((a, b) => Number(a.value) - Number(b.value));
    if (new Set(rankedSelects.map((select) => select.value)).size !== rankedSelects.length) return notify("Give each subject a different priority number.");
    const ranked = rankedSelects.map((select) => select.dataset.subject);
    user.name = form.elements["name"].value.trim(); user.username = form.elements["username"].value.trim(); user.email = form.elements["email"].value.trim().toLowerCase(); user.category = form.elements["category"].value; user.subjects = form.elements["subjects"].value.split(",").map((item) => item.trim()).filter(Boolean); user.subjectPriorities = ranked; delete user.prioritySubject; data.session = user.email; write(); notify(ranked.length ? `Subject priorities saved: ${ranked.map((subject, index) => `${index + 1}. ${subject}`).join(", ")}.` : "Profile updated."); go("account");
  });
  $("#edit-profile-form").elements["subjects"].addEventListener("input", () => updatePriorityOptions());
  const saveSettings = (form) => {
    data.settings = {
      theme: form.elements["theme"].value,
      textSize: form.elements["text-size"].value,
      reduceMotion: form.elements["reduce-motion"].checked,
    };

    const user = sessionUser();

    if (user) {
      user.category = form.elements["category"].value;
    }

    applySettings();
    write();
  };

  $("#settings-form").addEventListener("change", (event) => {
    saveSettings(event.currentTarget);
    notify("Setting applied across the app.");
  });

  $("#settings-form").addEventListener("submit", (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    saveSettings(form);
    notify("Settings saved and applied across the app.");
    go("home");
  });
  $$("#pro-plan button").forEach((button) => button.addEventListener("click", () => notify(`${button.textContent.trim()} is a frontend-only placeholder.`)));

  const cleanText = (text) => text.replace(/\s+/g, " ").trim();
  const sentencesFromNotes = () => (data.uploadedText || "").match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map(cleanText).filter((sentence) => sentence.length > 20) || [];
  const localSummary = (text) => {
    const sentences = (text || "")
      .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
      ?.map(cleanText)
      .filter(Boolean) || [];

    return sentences.slice(0, 5).join(" ") || cleanText(text || "").slice(0, 1200);
  };
  const noteSummary = () =>
    (data.aiSummary || "")
      .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
      ?.map(cleanText)
      .filter((sentence) => sentence.length > 20)
      .slice(0, 3) || [];
  const speak = (text) => { if (!("speechSynthesis" in window)) return notify("Voice narration is not available in this browser."); speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.rate = 0.94; speechSynthesis.speak(utterance); };
  const stopSpeaking = () => window.speechSynthesis?.cancel();
  const makeCards = () => {
    const points = noteSummary();

    if (!points.length) return [];

    return points.slice(0, 3).map((content) => {

      const topic = content
        .split(/\s+/)
        .slice(0, 7)
        .join(" ")
        .replace(/[,:;]$/, "");

      return {
        topic,

        question:
          `What does the summary say about "${topic}"?`,

        content,
      };
    });
  };

  const subjectForUpload = () =>
    (data.uploadedFile || "General")
      .replace(/\.[^.]+$/, "") ||
    "General";

  /* ================================
     FLASHCARD DATA
     ================================ */

  let cards = [];

  /* ================================
     UPLOAD + GEMINI SUMMARY
     ================================ */

  $("#upload-form").addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      const file =
        $("input[type='file']", event.currentTarget)
          .files[0];

      if (!file)
        return notify("Please select a file.");

      notify(`Reading ${file.name}…`);

      window.DocumentReader.extractText(file)
        .then(async (text) => {
          if (!text) {
            return notify(
              "No selectable text was found. This may be a scanned PDF; use an OCR-enabled version.",
            );
          }

          data.uploadedFile = file.name;

          data.uploadedText =
            cleanText(text).slice(0, 80000);

          /*
             Send uploaded text to backend.
          */

          let usedLocalSummary = false;

          try {
            const response = await fetch(
              "http://localhost:5000/api/summarize",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  text: data.uploadedText,
                }),
              },
            );

            const result = await response.json();

            if (!response.ok || !result.summary) {
              throw new Error(result.error || "Gemini summarization failed.");
            }

            data.aiSummary = result.summary;
          } catch (error) {
            usedLocalSummary = true;
            data.aiSummary = localSummary(data.uploadedText);
          }

          markStudy();

          write();

          /*
             Show Gemini summary.
          */

          $("#summary-content p").textContent =
            data.aiSummary ||
            `${file.name} is ready for learning.`;

          /*
             Generate flashcards from
             Gemini summary.
          */

          cards = makeCards();

          redrawCards.forEach((draw) => draw());

          /*
             Refresh practice test.
          */

          practiceTest.refresh();

          notify(
            usedLocalSummary
              ? "The AI backend is unavailable, so a local summary was created. Start the backend to use Gemini summaries."
              : "Summary and flashcards generated. Save to Animation Book when you’re ready.",
          );

          go("learning");
        })
        .catch((error) =>
          notify(
            error.message ||
              "We could not read that file.",
          ),
        );
    },
  );

  /* ================================
     VOICE TUTOR
     ================================ */

  const voiceTutor =
    window.LearnFeatures.createVoiceTutor({
      $,
      data,
      notify,
      getSummary: () =>
        noteSummary().join(" "),
    });

  /* ================================
     VIDEO LESSON
     ================================ */

  const videoLesson =
    window.LearnFeatures.createVideoLesson({
      $,
      data,
      getSummary: noteSummary,
      speak,
      stopSpeaking,
    });

  /* ================================
     PRACTICE TEST
     ================================ */

  const practiceTest =
    window.LearnFeatures.createPracticeTest({
      $,
      $$,
      notify,
      go,
      getSummary: noteSummary,
    });

  /* ================================
     FLASHCARD DISPLAY
     ================================ */

  const flashcardArticles = $$("#flashcard-list .flashcard");
  let currentCardIndex = 0;
  let showingAnswer = false;

  function flashCard(article, index) {

    const frontTitle =
      $(".flashcard-front h3", article);

    const frontText =
      $(".flashcard-front p", article);

    const backText =
      $(".flashcard-back p", article);

    const draw = () => {
      const current = cards[index];

      const isCurrent = index === currentCardIndex;
      article.hidden = !isCurrent;
      article.classList.toggle("is-current", isCurrent);
      article.classList.toggle("is-flipped", isCurrent && showingAnswer);

      if (isCurrent) {
        $("#flashcard-status").textContent = current
          ? `Card ${index + 1} of ${cards.length}: ${showingAnswer ? "answer visible — select the card for the next question." : "select the card to reveal its answer."}`
          : "Upload notes to generate flashcards.";

        $("#previous-flashcard").disabled = currentCardIndex === 0;
      }

      if (!current) {
        frontTitle.textContent =
          "Upload notes to begin";

        frontText.textContent =
          "What key idea should you remember?";

        backText.textContent =
          "Generated summary content will appear here.";

        return;
      }

      frontTitle.textContent =
        current.topic;

      frontText.textContent =
        current.question;

      backText.textContent =
        current.content;
    };

    const interact = () => {
      if (index !== currentCardIndex) return;

      if (!cards[index]) {
        return notify("Upload notes to generate flashcards first.");
      }

      if (!showingAnswer) {
        showingAnswer = true;
        redrawCards.forEach((redraw) => redraw());
        return;
      }

      if (currentCardIndex < cards.length - 1) {
        currentCardIndex += 1;
        showingAnswer = false;
        redrawCards.forEach((redraw) => redraw());
        flashcardArticles[currentCardIndex].focus();
        return;
      }

      notify("You have completed all flashcards. Select Save flashcards to keep them.");
    };

    article.addEventListener(
      "click",
      interact,
    );

    article.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          event.preventDefault();
          interact();
        }
      },
    );

    draw();

    return draw;
  }

  const redrawCards = flashcardArticles
    .map((article, index) => flashCard(article, index));

  $("#previous-flashcard").addEventListener("click", () => {
    if (!currentCardIndex) {
      return notify("You are already on the first flashcard.");
    }

    currentCardIndex -= 1;
    showingAnswer = false;
    redrawCards.forEach((redraw) => redraw());
    flashcardArticles[currentCardIndex].focus();
  });

  $("#save-flashcards").addEventListener("click", (event) => {
    event.preventDefault();

    if (!cards.length) {
      return notify("Generate flashcards from an uploaded summary first.");
    }

    cards.forEach((card) => {
      const saved = {
        type: "Flash Card",
        subject: subjectForUpload(),
        title: card.topic,
        question: card.question,
        answer: card.content,
        content: `Question: ${card.question}\n\nAnswer: ${card.content}`,
      };

      const existing = data.saved.find((item) =>
        item.type === saved.type &&
        item.title === saved.title &&
        item.subject === saved.subject,
      );

      if (existing) {
        Object.assign(existing, saved);
      } else {
        data.saved.push(saved);
      }
    });

    markStudy();
    write();
    notify(`Flashcards saved to the ${subjectForUpload()} folder in Animation Book.`);
    go("animation-book");
  });

  /* ================================
     SAVE SUMMARY
     ================================ */

  $("#save-summary").addEventListener(
    "click",
    (event) => {
      event.preventDefault();

      const saved = {
        type: "Summary",
        subject: subjectForUpload(),
        title:
          data.uploadedFile ||
          "Saved Summary",
        content:
          $("#summary-content p")
            .textContent,
      };

      if (
        !data.saved.some(
          (item) =>
            item.type === saved.type &&
            item.title === saved.title &&
            item.subject === saved.subject,
        )
      ) {
        data.saved.push(saved);
      }

      markStudy();

      write();

      notify(
        `Summary saved to the ${saved.subject} folder in Animation Book.`,
      );

      go("animation-book");
    },
  );

  /* ================================
     ANIMATION BOOK
     ================================ */

  function renderBook() {
    const folders =
      $("#saved-folders");

    folders.replaceChildren();

    if (!data.saved.length) {
      folders.append(
        document.createElement("p"),
      ).textContent =
        "No saved content yet.";

      return;
    }

    const bySubject =
      data.saved.reduce(
        (groups, item) => {
          const subject =
            item.subject || "General";

          (groups[subject] ||= []).push(
            item,
          );

          return groups;
        },
        {},
      );

    Object.entries(bySubject).forEach(
      ([subject, items]) => {
        const folder =
          document.createElement(
            "details",
          );

        const heading =
          document.createElement(
            "summary",
          );

        const content =
          document.createElement("div");

        folder.className =
          "subject-folder";

        folder.open = true;

        heading.textContent =
          `${subject} (${items.length})`;

        content.className =
          "subject-folder-content";

        items.forEach((item) => {
          const button =
            document.createElement(
              "button",
            );

          button.type = "button";

          button.textContent =
            `${item.type}: ${item.title}`;

          button.addEventListener(
            "click",
            () => notify(item.content),
          );

          content.append(button);
        });

        folder.append(
          heading,
          content,
        );

        folders.append(folder);
      },
    );
  }

  /* ================================
     EXAM
     ================================ */

  $("#exam-date").min =
    new Date()
      .toISOString()
      .slice(0, 10);

  $("#schedule-exam-form").addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      const form = event.currentTarget;

      if (!form.reportValidity())
        return;

      data.exam = {
        date: $("#exam-date").value,
        topic:
          $("#exam-subject-topic").value,
        level:
          $("input[name='level']:checked")
            .value,
      };

      write();

      notify(
        "Exam scheduled successfully.",
      );

      go("exam-reminders");
    },
  );

  function renderReminder() {
    if (!data.exam)
      return go("schedule-exam");

    const target =
      new Date(
        `${data.exam.date}T23:59:59`,
      );

    const days = Math.max(
      0,
      Math.ceil(
        (target - new Date()) /
          86400000,
      ),
    );

    $("#scheduled-exam-date")
      .textContent =
      `Exam date: ${data.exam.date} — ${days} day${days === 1 ? "" : "s"} remaining.`;

    $("#exam-notifications p")
      .textContent = days
      ? `Your ${data.exam.level} exam is approaching. Revise ${data.exam.topic} and complete your module revision.`
      : "Your exam is due today. You are ready to begin.";

    $("#scheduled-exams-table tbody")
      .innerHTML =
      `<tr>
        <td>Scheduled Test</td>
        <td>${data.exam.date}</td>
        <td>${data.exam.topic}</td>
        <td>Pending</td>
        <td><a href="#exam">Take Test</a></td>
      </tr>`;
  }

  const examBank = [
    "Which statement best explains the main concept?",
    "What is the most important key point to remember?",
    "Which example correctly applies this topic?",
  ];

  let examIndex = 0;
  let examAnswers = [];
  let examTimer;
  let seconds = 600;

  function examQuestion() {
    return `${examBank[examIndex]} (${data.exam?.topic || "selected topic"}, ${data.exam?.level || "Level 1"})`;
  }

  function renderExam() {
    $("#exam-question-heading")
      .textContent =
      `MCQ Question ${examIndex + 1} of ${examBank.length}`;

    $("#exam-subject-display")
      .textContent =
      examQuestion();

    $$("#exam-question-area input")
      .forEach(
        (input, index) =>
          (input.checked =
            examAnswers[
              examIndex
            ] === index),
      );
  }

  function startExam() {
    if (!data.exam)
      return go("schedule-exam");

    examIndex = 0;
    examAnswers = [];
    seconds = 600;

    renderExam();

    clearInterval(examTimer);

    examTimer = setInterval(
      () => {
        seconds -= 1;

        const min =
          String(
            Math.max(
              0,
              Math.floor(
                seconds / 60,
              ),
            ),
          ).padStart(2, "0");

        const sec =
          String(
            Math.max(
              0,
              seconds % 60,
            ),
          ).padStart(2, "0");

        $("#exam-timer")
          .textContent =
          `Time Remaining: ${min}:${sec}`;

        if (!seconds)
          $("#exam-form")
            .requestSubmit();
      },
      1000,
    );
  }

  $$("#exam-question-area input")
    .forEach((input, index) =>
      input.addEventListener(
        "change",
        () => {
          examAnswers[
            examIndex
          ] = index;
        },
      ),
    );

  const examButtons =
    $$("#exam-navigation button");

  examButtons[0].addEventListener(
    "click",
    () => {
      if (examIndex) {
        examIndex -= 1;
        renderExam();
      }
    },
  );

  examButtons[1].addEventListener(
    "click",
    () => {
      if (
        examAnswers[examIndex] ===
        undefined
      )
        return notify(
          "Select an answer first.",
        );

      if (
        examIndex <
        examBank.length - 1
      ) {
        examIndex += 1;
        renderExam();
      }
    },
  );

  $("#exam-form").addEventListener(
    "submit",
    (event) => {
      event.preventDefault();

      if (
        examAnswers.length <
        examBank.length
      )
        return notify(
          "Answer every exam question before submitting.",
        );

      clearInterval(examTimer);

      const earned =
        examAnswers.reduce(
          (total, answer, index) =>
            total +
            (answer === 0 ? 1 : 0),
          0,
        );

      const percent =
        Math.round(
          (earned /
            examBank.length) *
            100,
        );

      data.score += percent;

      data.lastPerformance =
        `${percent}% in ${data.exam.topic}`;

      data.badges.quizzes =
        (data.badges.quizzes || 0) +
        1;

      markStudy();

      write();

      $("#exam-score")
        .textContent =
        `Score: ${earned}/${examBank.length} (${percent}%)`;

      $("#exam-performance")
        .textContent =
        `Performance: ${percent >= 70 ? "Strong" : "Keep practising"}`;

      $("#exam-streak")
        .textContent =
        `Streak: ${data.streak} Days`;

      $("#difficulty-recommendation")
        .textContent =
        percent >= 70
          ? "Great work! Try the next difficulty level."
          : "Review the saved notes and repeat this level.";

      go("performance-report");
    },
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        pageId() === "exam" &&
        document.hidden
      ) {
        notify(
          "Exam page left. Tab switching is recorded in this frontend demo.",
        );
      }
    },
  );

  /* ================================
     START APPLICATION
     ================================ */

  applySettings();

  if (!location.hash)
    go(
      sessionUser()
        ? "home"
        : "signup",
    );

  guard();
});
