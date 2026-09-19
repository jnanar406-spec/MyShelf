window.LearnFeatures = window.LearnFeatures || {};

window.LearnFeatures.createVoiceTutor = ({ $, data, notify, getSummary }) => {
  const context = $("#voice-tutor-context"), summary = $("#voice-tutor-summary p"), play = $("#play-tutor-summary"), pause = $("#pause-tutor-summary"), stop = $("#stop-tutor-voice"), voiceSelect = $("#voice-tutor-voice"), rateSelect = $("#voice-tutor-rate");
  let utterance, voices = [];
  const setControls = ({ canPlay, isPlaying = false, isPaused = false }) => { play.disabled = !canPlay || isPlaying; pause.disabled = !canPlay || (!isPlaying && !isPaused); pause.textContent = isPaused ? "▶ Resume" : "⏸ Pause"; stop.disabled = !canPlay || (!isPlaying && !isPaused); };
  const populateVoices = () => { if (!("speechSynthesis" in window)) return; const selected = voiceSelect.value; voices = speechSynthesis.getVoices(); voiceSelect.replaceChildren(new Option("Default browser voice", "")); voices.forEach((voice, index) => voiceSelect.add(new Option(`${voice.name} (${voice.lang})`, String(index)))); voiceSelect.value = selected && voices[Number(selected)] ? selected : ""; };
  const stopNarration = () => { window.speechSynthesis?.cancel(); utterance = undefined; setControls({ canPlay: Boolean(getSummary()) }); };
  const renderContext = () => {
    stopNarration(); const text = getSummary();
    if (!text) { context.textContent = "Upload a readable file to generate a summary you can listen to."; summary.textContent = "Upload a readable file to generate a summary for Voice Tutor."; setControls({ canPlay: false }); return; }
    context.textContent = `Listening to the complete AI-generated summary of ${data.uploadedFile}.`; summary.textContent = text; setControls({ canPlay: true });
  };
  play.addEventListener("click", () => {
    const text = getSummary(); if (!("speechSynthesis" in window)) return notify("Voice narration is not available in this browser."); if (!text) return;
    stopNarration(); const current = new SpeechSynthesisUtterance(text); utterance = current; current.voice = voices[Number(voiceSelect.value)] || null; current.rate = Number(rateSelect.value);
    current.onstart = () => { if (utterance === current) setControls({ canPlay: true, isPlaying: true }); }; current.onend = current.onerror = () => { if (utterance !== current) return; utterance = undefined; setControls({ canPlay: Boolean(getSummary()) }); }; speechSynthesis.speak(current);
  });
  pause.addEventListener("click", () => { if (!utterance) return; if (speechSynthesis.paused) { speechSynthesis.resume(); setControls({ canPlay: true, isPlaying: true }); } else { speechSynthesis.pause(); setControls({ canPlay: true, isPaused: true }); } });
  stop.addEventListener("click", stopNarration);
  if ("speechSynthesis" in window) { populateVoices(); speechSynthesis.addEventListener("voiceschanged", populateVoices); }
  renderContext(); return { renderContext };
};
