document.getElementById("nav").innerHTML = renderNav("m2");
document.getElementById("footer").innerHTML = renderFooter();

const content = getTodayContent();
document.getElementById("todayDate").textContent = formatDisplayDate();
document.getElementById("theme").textContent = content.theme;
document.getElementById("themeDesc").textContent = content.themeDesc;

const SCENE_IMAGES = [
  "images/meeting-scene-1.png",
  "images/meeting-scene-2.png",
  "images/meeting-scene-3.png",
  "images/meeting-scene-4.png"
];

const sceneBg = document.getElementById("sceneBg");
const sceneBgFade = document.getElementById("sceneBgFade");
const sceneDots = document.getElementById("sceneDots");
const scenePrev = document.getElementById("scenePrev");
const sceneNext = document.getElementById("sceneNext");

let sceneIndex = parseInt(localStorage.getItem("m2-scene-index") || String(content.day % SCENE_IMAGES.length), 10);
if (sceneIndex < 0 || sceneIndex >= SCENE_IMAGES.length) sceneIndex = 0;
let sceneTransitioning = false;

function sceneUrl(index) {
  return SCENE_IMAGES[((index % SCENE_IMAGES.length) + SCENE_IMAGES.length) % SCENE_IMAGES.length];
}

function renderSceneDots() {
  sceneDots.innerHTML = SCENE_IMAGES.map(function(_, i) {
    return '<span class="scene-dot' + (i === sceneIndex ? " active" : "") + '"></span>';
  }).join("");
}

function showScene(index) {
  sceneIndex = ((index % SCENE_IMAGES.length) + SCENE_IMAGES.length) % SCENE_IMAGES.length;
  localStorage.setItem("m2-scene-index", sceneIndex);
  sceneBg.style.backgroundImage = 'url("' + sceneUrl(sceneIndex) + '")';
  renderSceneDots();
}

function changeScene(step) {
  if (sceneTransitioning) return;
  const nextIndex = (sceneIndex + step + SCENE_IMAGES.length) % SCENE_IMAGES.length;
  const nextUrl = sceneUrl(nextIndex);

  sceneTransitioning = true;
  sceneBgFade.style.backgroundImage = 'url("' + nextUrl + '")';
  sceneBgFade.style.opacity = "1";

  setTimeout(function() {
    sceneBg.style.backgroundImage = 'url("' + nextUrl + '")';
    sceneBgFade.style.opacity = "0";
    sceneIndex = nextIndex;
    localStorage.setItem("m2-scene-index", sceneIndex);
    renderSceneDots();
    sceneTransitioning = false;
  }, 450);
}

showScene(sceneIndex);
scenePrev.addEventListener("click", function() { changeScene(-1); });
sceneNext.addEventListener("click", function() { changeScene(1); });

const recordBtn = document.getElementById("recordBtn");
const stopBtn = document.getElementById("stopBtn");
const clearBtn = document.getElementById("clearBtn");
const reviewBtn = document.getElementById("reviewBtn");
const doneBtn = document.getElementById("doneBtn");
const transcript = document.getElementById("transcript");
const timerEl = document.getElementById("timer");
const feedbackPanel = document.getElementById("feedbackPanel");
const feedbackContent = document.getElementById("feedbackContent");

const corpus = getTodayCorpus();

const WORKPLACE_RULES = [
  { pattern: /\b(i think maybe|maybe we should)\b/gi, tip: "Try a clearer lead-in: \"I'd suggest…\" or \"My recommendation is…\"" },
  { pattern: /\bkind of\b/gi, tip: "Avoid \"kind of\" in meetings. Be direct or use \"somewhat\"." },
  { pattern: /\bsort of\b/gi, tip: "Avoid \"sort of\". State your point more confidently." },
  { pattern: /\byou know\b/gi, tip: "Reduce filler \"you know\". Pause briefly instead." },
  { pattern: /\b(um+|uh+|er+)\b/gi, tip: "Reduce filler sounds. A short pause sounds more professional." },
  { pattern: /\basap\b/gi, tip: "In formal meetings, say \"as soon as possible\" instead of \"ASAP\"." },
  { pattern: /\bgonna\b/gi, tip: "Use \"going to\" in professional settings." },
  { pattern: /\bwanna\b/gi, tip: "Use \"want to\" in professional settings." },
  { pattern: /\bgotta\b/gi, tip: "Use \"need to\" or \"have to\" instead of \"gotta\"." },
  { pattern: /\bstuff\b/gi, tip: "Replace vague \"stuff\" with specific terms (e.g. data, tasks, deliverables)." },
  { pattern: /\bthings\b/gi, tip: "Be specific: replace \"things\" with the actual item (issues, metrics, action items)." },
  { pattern: /\bi guess\b/gi, tip: "Replace \"I guess\" with \"I believe\" or \"Based on the data, …\"" },
  { pattern: /\bno problem\b/gi, tip: "In workplace replies, \"Happy to help\" or \"I'll take care of it\" sounds more professional." }
];

const WORKPLACE_PHRASES = [
  "let's align on",
  "moving forward",
  "action item",
  "follow up",
  "stakeholder",
  "deadline",
  "deliverable",
  "as discussed",
  "to summarize",
  "next steps",
  "I'd like to propose",
  "from my perspective",
  "based on",
  "in terms of",
  "keep you posted"
];

let recognition = null;
let finalText = "";
let seconds = 0;
let timerInterval = null;
let isRecording = false;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function formatTime(s) {
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return m + ":" + sec;
}

function startTimer() {
  seconds = 0;
  timerEl.textContent = "00:00";
  timerInterval = setInterval(() => {
    seconds++;
    timerEl.textContent = formatTime(seconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function updateTranscript(interim) {
  transcript.classList.remove("empty");
  transcript.textContent = finalText + (interim ? interim : "");
  reviewBtn.disabled = !(finalText + (interim || "")).trim();
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function checkWorkplaceHabits(text) {
  const lower = text.toLowerCase();
  const issues = [];

  WORKPLACE_RULES.forEach(function(rule) {
    const matches = text.match(rule.pattern);
    if (matches && matches.length) {
      issues.push({
        type: "warn",
        text: "\"" + matches[0] + "\" → " + rule.tip
      });
    }
  });

  const usedPhrases = WORKPLACE_PHRASES.filter(function(p) {
    return lower.includes(p);
  });
  if (usedPhrases.length) {
    issues.unshift({
      type: "good",
      text: "Good workplace phrases used: " + usedPhrases.map(function(p) {
        return "\"" + p + "\"";
      }).join(", ")
    });
  }

  const todayWords = corpus.words.map(function(w) { return w.word.toLowerCase(); });
  const usedWords = todayWords.filter(function(word) {
    return lower.includes(word) || lower.includes(word.replace(/-/g, " "));
  });
  if (usedWords.length) {
    issues.unshift({
      type: "good",
      text: "Today's vocabulary used: " + usedWords.join(", ")
    });
  } else if (todayWords.length) {
    issues.push({
      type: "warn",
      text: "Try weaving in today's words: " + todayWords.join(", ")
    });
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 20) {
    issues.push({
      type: "warn",
      text: "Your response is quite short (" + wordCount + " words). Practice a fuller meeting update (30+ words)."
    });
  }

  return issues;
}

async function checkGrammar(text) {
  const res = await fetch("https://api.languagetool.org/v2/check", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      text: text,
      language: "en-US",
      enabledOnly: "false"
    })
  });
  if (!res.ok) throw new Error("Grammar service unavailable");
  return res.json();
}

function renderFeedbackSection(title, items) {
  if (!items.length) {
    return (
      '<div class="feedback-section"><h4>' + title + '</h4>' +
      '<p class="feedback-empty">No issues found.</p></div>'
    );
  }
  return (
    '<div class="feedback-section"><h4>' + title + '</h4>' +
    items.map(function(item) {
      return '<div class="feedback-item ' + item.type + '">' + item.text + "</div>";
    }).join("") +
    "</div>"
  );
}

async function runSmartReview() {
  const text = finalText.trim();
  if (!text) return;

  feedbackPanel.classList.remove("hidden");
  feedbackContent.innerHTML = '<p class="feedback-loading">Analyzing your speech…</p>';
  reviewBtn.disabled = true;

  const workplaceItems = checkWorkplaceHabits(text);
  let grammarItems = [];

  try {
    const data = await checkGrammar(text);
    grammarItems = (data.matches || []).slice(0, 8).map(function(match) {
      const wrong = text.substring(match.offset, match.offset + match.length);
      const suggestion = match.replacements && match.replacements[0]
        ? match.replacements[0].value
        : "";
      let msg = escapeHtml(match.message.replace(/\.$/, ""));
      if (suggestion) {
        msg = "<strong>" + escapeHtml(wrong) + "</strong> → <strong>" + escapeHtml(suggestion) + "</strong><br>" + msg;
      } else {
        msg = "<strong>" + escapeHtml(wrong) + "</strong><br>" + msg;
      }
      return { type: "error", text: msg };
    });
  } catch (_) {
    grammarItems = [{
      type: "warn",
      text: "Grammar check is temporarily unavailable. Workplace tips below are still available."
    }];
  }

  feedbackContent.innerHTML =
    renderFeedbackSection("Grammar", grammarItems) +
    renderFeedbackSection("Workplace Language", workplaceItems);

  reviewBtn.disabled = false;
}

function initRecognition() {
  if (!SpeechRecognition) {
    transcript.textContent = "Speech recognition is not supported in this browser. Please use Chrome or Edge.";
    recordBtn.disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalText += text + " ";
      } else {
        interim += text;
      }
    }
    updateTranscript(interim);
  };

  recognition.onerror = (event) => {
    if (event.error !== "aborted") {
      transcript.textContent = "Error: " + event.error + ". Please allow microphone access.";
    }
    stopRecording();
  };

  recognition.onend = () => {
    if (isRecording) {
      try { recognition.start(); } catch (_) {}
    }
  };
}

function startRecording() {
  if (!recognition) return;
  isRecording = true;
  finalText = transcript.classList.contains("empty") ? "" : finalText;
  transcript.classList.remove("empty");
  transcript.textContent = "Listening...";
  recordBtn.disabled = true;
  stopBtn.disabled = false;
  startTimer();
  try {
    recognition.start();
  } catch (_) {
    recognition.stop();
    setTimeout(() => recognition.start(), 200);
  }
}

function stopRecording() {
  isRecording = false;
  recordBtn.disabled = false;
  stopBtn.disabled = true;
  stopTimer();
  if (recognition) {
    try { recognition.stop(); } catch (_) {}
  }
  if (!finalText.trim()) {
    transcript.textContent = "No speech detected. Try again.";
  } else {
    updateTranscript("");
  }
}

recordBtn.addEventListener("click", startRecording);
stopBtn.addEventListener("click", stopRecording);

clearBtn.addEventListener("click", () => {
  finalText = "";
  transcript.textContent = "Your speech will appear here as you speak...";
  transcript.classList.add("empty");
  reviewBtn.disabled = true;
  feedbackPanel.classList.add("hidden");
  feedbackContent.innerHTML = "";
});

reviewBtn.addEventListener("click", runSmartReview);

doneBtn.addEventListener("click", () => {
  ModuleProgress.markDone("m2");
  doneBtn.textContent = "Completed Today!";
  doneBtn.disabled = true;
});

if (ModuleProgress.isDone("m2")) {
  doneBtn.textContent = "Already Done Today";
  doneBtn.disabled = true;
}

initRecognition();
