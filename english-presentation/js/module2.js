document.getElementById("nav").innerHTML = renderNav("m2");
document.getElementById("footer").innerHTML = renderFooter();

const content = getTodayContent();
document.getElementById("todayDate").textContent = formatDisplayDate();
document.getElementById("theme").textContent = content.theme;
document.getElementById("themeDesc").textContent = content.themeDesc;

const sceneBg = document.getElementById("sceneBg");
sceneBg.classList.add(content.scene);

const recordBtn = document.getElementById("recordBtn");
const stopBtn = document.getElementById("stopBtn");
const clearBtn = document.getElementById("clearBtn");
const doneBtn = document.getElementById("doneBtn");
const transcript = document.getElementById("transcript");
const timerEl = document.getElementById("timer");
const charYou = document.getElementById("charYou");

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
  charYou.classList.add("speaking");
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
  charYou.classList.remove("speaking");
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
});

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
