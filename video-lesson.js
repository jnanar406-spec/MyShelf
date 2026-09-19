window.LearnFeatures = window.LearnFeatures || {};

window.LearnFeatures.createVideoLesson = ({ $, data, getSummary, speak, stopSpeaking }) => {
  let sceneIndex = 0;
  const scenes = () => { const summary = getSummary(); return summary.length ? summary.map((text, index) => ({ title: index ? `Key idea ${index + 1}` : `Overview: ${data.uploadedFile}`, text })) : [{ title: "Upload your notes", text: "Add a readable text file to generate a short, narrated lesson from its main points." }]; };
  const renderScene = (index = sceneIndex) => { const lesson = scenes(); sceneIndex = (index + lesson.length) % lesson.length; const scene = lesson[sceneIndex]; $("#video-source-label").textContent = data.uploadedText ? `AI visual lesson generated from ${data.uploadedFile}` : "Upload notes to create a narrated visual lesson."; $("#video-title").textContent = scene.title; $("#video-script").textContent = scene.text; $("#video-progress").textContent = `${sceneIndex + 1} / ${lesson.length}`; $("#video-timeline-fill").style.width = `${((sceneIndex + 1) / lesson.length) * 100}%`; };
  $("#play-ai-video").addEventListener("click", () => { renderScene(0); speak(`${$("#video-title").textContent}. ${$("#video-script").textContent}`); });
  $("#next-video-scene").addEventListener("click", () => renderScene(sceneIndex + 1));
  $("#stop-ai-video").addEventListener("click", stopSpeaking);
  renderScene(); return { renderScene };
};
