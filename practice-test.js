window.LearnFeatures = window.LearnFeatures || {};

window.LearnFeatures.createPracticeTest = ({ $, $$, notify, go, getSummary }) => {
  let answers = [];
  const questionBank = () => {
    const points = getSummary();
    if (!points.length) return [];
    const choices = Array.from({ length: 4 }, (_, index) => points[index % points.length]);
    return Array.from({ length: Math.min(2, points.length) }, (_, index) => ({
      question: `Which statement is the summary's key point ${index + 1}?`,
      options: choices,
      answer: index,
      explanation: `This is stated in the generated summary: ${points[index]}`
    }));
  };
  const setFeedback = (page, message, state) => {
    const feedback = $(".answer-feedback", page) || document.createElement("p");
    if (!feedback.parentElement) { feedback.className = "answer-feedback"; $(".explanation", page).before(feedback); }
    feedback.textContent = message; feedback.className = `answer-feedback is-${state}`;
  };
  const renderAnswerBook = () => {
    const questions = questionBank();
    $$(".answer-book div").forEach((book) => {
      book.replaceChildren();
      if (!questions.length) { book.textContent = "Upload notes to build an answer book from the summary."; return; }
      questions.forEach((item, index) => { const entry = document.createElement("p"); entry.textContent = `${index + 1}. ${item.options[item.answer]} — ${item.explanation}`; book.append(entry); });
    });
  };
  const render = (index) => {
    const page = index ? $("#practice-test-2") : $("#practice-test"), questions = questionBank(), item = questions[index];
    $("h2", page).nextElementSibling.textContent = item ? `Question ${index + 1} of ${questions.length}` : "Upload notes to create summary-based questions.";
    $("legend", page).textContent = item ? item.question : "No summary is available yet.";
    $$("fieldset label", page).forEach((label, option) => {
      const radio = $("input", label); radio.value = option; radio.checked = answers[index] === option; radio.disabled = !item; label.className = "practice-option";
      label.lastChild.textContent = ` ${item ? item.options[option] : "Upload notes to begin"}`;
      if (!item) return;
      if (answers[index] === undefined) label.classList.add("is-selected");
      else if (option === answers[index]) label.classList.add(
        option === item.answer ? "is-correct" : "is-incorrect",
      );
    });
    $(".explanation", page).textContent = answers[index] === undefined || !item ? "Choose an answer to see its explanation." : item.explanation;
    setFeedback(page, !item ? "Summary questions will appear after you upload a readable file." : answers[index] === undefined ? "Select an answer. Yellow marks options awaiting your selection." : answers[index] === item.answer ? "Correct — your selected answer is green." : "Not quite — your selected answer is red.", !item || answers[index] === undefined ? "pending" : answers[index] === item.answer ? "correct" : "incorrect");
    renderAnswerBook();
  };
  const grade = (index, page) => {
    const item = questionBank()[index], selected = $("input:checked", page);
    if (!item) return notify("Upload notes first so the practice test can use their summary.");
    if (!selected) { notify("Select an answer before continuing."); return false; }
    answers[index] = Number(selected.value); render(index); return true;
  };
  [0, 1].forEach((index) => {
    const page = index ? $("#practice-test-2") : $("#practice-test"), form = $("form", page);
    $$("input", page).forEach((input) => input.addEventListener("change", () => grade(index, page)));
    $(".answer-book-toggle", page).addEventListener("click", () => { const book = $(".answer-book", page); book.open = !book.open; });
    form.addEventListener("submit", (event) => {
      event.preventDefault(); if (!grade(index, page)) return;
      if (!index) { render(1); go("practice-test-2"); return; }
      const questions = questionBank(), earned = answers.reduce((total, answer, questionIndex) => total + Number(answer === questions[questionIndex]?.answer), 0);
      $("#score-result").textContent = `${earned} / ${questions.length} — Practice result only`; notify("Practice test complete. This result does not change your dashboard progress."); go("final-score");
    });
  });
  const refresh = () => { answers = []; render(0); render(1); };
  render(0); render(1);
  return { refresh, render };
};
