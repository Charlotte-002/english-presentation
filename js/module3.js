const EBBINGHAUS_KEY = "workplaceEnglishEbbinghaus";
const EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15, 30];
const EBBINGHAUS_STAGE_LABELS = [
  "Review 1 · +1 day",
  "Review 2 · +2 days",
  "Review 3 · +4 days",
  "Review 4 · +7 days",
  "Review 5 · +15 days",
  "Review 6 · +30 days"
];

function parseDateKeyLocal(key) {
  return new Date(key + "T12:00:00");
}

function addDaysToKey(dateKey, days) {
  var d = parseDateKeyLocal(dateKey);
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
}

function daysBetweenKeys(fromKey, toKey) {
  return Math.round((parseDateKeyLocal(toKey) - parseDateKeyLocal(fromKey)) / 86400000);
}

var EbbinghausReview = {
  get: function() {
    try {
      return JSON.parse(localStorage.getItem(EBBINGHAUS_KEY) || "{}");
    } catch (e) {
      return {};
    }
  },

  save: function(data) {
    localStorage.setItem(EBBINGHAUS_KEY, JSON.stringify(data));
  },

  recordLearned: function(moduleId, dayNum) {
    var data = this.get();
    if (!data[moduleId]) data[moduleId] = {};
    var key = String(dayNum);
    if (!data[moduleId][key]) {
      data[moduleId][key] = {
        learnedAt: formatDateKey(),
        completed: []
      };
    }
    this.save(data);
  },

  markStageDone: function(moduleId, dayNum, stageIndex) {
    var data = this.get();
    var entry = data[moduleId] && data[moduleId][String(dayNum)];
    if (!entry) return;
    if (entry.completed.indexOf(stageIndex) === -1) {
      entry.completed.push(stageIndex);
      entry.completed.sort(function(a, b) { return a - b; });
    }
    this.save(data);
  },

  getDueItems: function(moduleId, todayKey) {
    if (!todayKey) todayKey = formatDateKey();
    var data = this.get();
    var moduleData = data[moduleId] || {};
    var due = [];

    Object.keys(moduleData).forEach(function(dayKey) {
      var dayNum = parseInt(dayKey, 10);
      var entry = moduleData[dayKey];
      if (!entry || !entry.learnedAt) return;

      EBBINGHAUS_INTERVALS.forEach(function(interval, stageIndex) {
        if (entry.completed.indexOf(stageIndex) !== -1) return;
        var dueDate = addDaysToKey(entry.learnedAt, interval);
        if (daysBetweenKeys(dueDate, todayKey) >= 0) {
          due.push({
            day: dayNum,
            stageIndex: stageIndex,
            stageLabel: EBBINGHAUS_STAGE_LABELS[stageIndex],
            dueDate: dueDate,
            overdueDays: Math.max(0, daysBetweenKeys(dueDate, todayKey)),
            learnedAt: entry.learnedAt
          });
        }
      });
    });

    due.sort(function(a, b) {
      if (b.overdueDays !== a.overdueDays) return b.overdueDays - a.overdueDays;
      return a.day - b.day;
    });
    return due;
  },

  countDue: function(moduleId) {
    return this.getDueItems(moduleId).length;
  },

  countAllDue: function() {
    return this.countDue("m1") + this.countDue("m3");
  }
};

if (typeof window !== "undefined") {
  window.EbbinghausReview = EbbinghausReview;
}

(function() {
  function showLoadError(message) {
    var card = document.querySelector(".container .card:not(.ebb-card)");
    if (card) {
      card.innerHTML =
        '<p style="color:var(--danger);font-weight:600;">Failed to load lesson data.</p>' +
        '<p class="hint-text" style="margin-top:8px;">' + message + "</p>";
    }
  }

  try {
    if (typeof renderNav !== "function" || typeof renderFooter !== "function") {
      showLoadError("js/app.js did not load. Open module3.html from the english-presentation folder (with the js/ folder).");
      return;
    }

    document.getElementById("nav").innerHTML = renderNav("m3");
    document.getElementById("footer").innerHTML = renderFooter();

    if (typeof CORPUS === "undefined" || typeof getCorpusByDay !== "function") {
      showLoadError("js/data.js did not load. Make sure js/data.js exists in the same project folder.");
      return;
    }

    if (typeof getTodayCorpus !== "function") {
      showLoadError("Lesson helpers missing. Reload the page or check js/app.js.");
      return;
    }

    if (typeof StudyDay !== "undefined") StudyDay.ensureToday();

    var c = getTodayCorpus();
    if (!c || !c.paragraphEn) {
      showLoadError("Today's passage is missing.");
      return;
    }

    document.getElementById("todayDate").textContent = formatDisplayDate();
    document.getElementById("theme").textContent = c.theme;
    document.getElementById("dayNum").textContent = c.day;
    document.getElementById("passage").textContent = c.paragraphEn;
    document.getElementById("passageZh").textContent = c.paragraphZh;

    var passageEl = document.getElementById("passage");
  var zhEl = document.getElementById("passageZh");
  var dictationPanel = document.getElementById("dictationPanel");
  var dictationBtn = document.getElementById("dictationBtn");
  var toggleBtn = document.getElementById("toggleBtn");
  var hidden = false;
  var dictationActive = false;

  function setPassageHidden(isHidden) {
    hidden = isHidden;
    passageEl.classList.toggle("hidden", hidden);
    toggleBtn.textContent = hidden ? "Show Passage" : "Hide Passage";
  }

  document.getElementById("toggleBtn").addEventListener("click", function() {
    setPassageHidden(!hidden);
  });

  document.getElementById("toggleZhBtn").addEventListener("click", function() {
    zhEl.classList.toggle("hidden");
    document.getElementById("toggleZhBtn").textContent =
      zhEl.classList.contains("hidden") ? "Show Chinese" : "Hide Chinese";
  });

  dictationBtn.addEventListener("click", function() {
    dictationActive = !dictationActive;
    dictationPanel.classList.toggle("hidden", !dictationActive);
    dictationBtn.classList.toggle("active", dictationActive);

    if (dictationActive) {
      setPassageHidden(true);
      dictationBtn.textContent = "Exit Dictation";
      document.getElementById("dictationInput").focus();
    } else {
      dictationBtn.textContent = "Dictation";
      document.getElementById("dictationInput").value = "";
      document.getElementById("dictationResult").classList.add("hidden");
      document.getElementById("dictationResult").innerHTML = "";
    }
  });

  function normalizeDictation(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s']/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function checkDictation() {
    var userText = document.getElementById("dictationInput").value.trim();
    var resultEl = document.getElementById("dictationResult");

    if (!userText) {
      resultEl.classList.remove("hidden");
      resultEl.innerHTML = '<p class="dictation-summary warn">Please type your dictation first.</p>';
      return;
    }

    var expectedWords = normalizeDictation(c.paragraphEn).split(" ").filter(Boolean);
    var userWords = normalizeDictation(userText).split(" ").filter(Boolean);
    var correct = 0;
    var html = '<div class="dictation-words">';

    for (var i = 0; i < userWords.length; i++) {
      var expected = expectedWords[i] || "";
      var word = userWords[i];
      if (expected && word === expected) {
        correct++;
        html += '<span class="dict-word correct">' + escapeHtml(word) + "</span> ";
      } else {
        var title = expected ? 'Expected: "' + expected + '"' : "Extra word";
        html += '<span class="dict-word wrong" title="' + escapeHtml(title) + '">' + escapeHtml(word) + "</span> ";
      }
    }

    if (userWords.length < expectedWords.length) {
      var missing = expectedWords.slice(userWords.length);
      html += '<span class="dict-missing">Missing: ' + escapeHtml(missing.join(" ")) + "</span>";
    }

    html += "</div>";
    var accuracy = expectedWords.length
      ? Math.round((correct / expectedWords.length) * 100)
      : 0;
    var summaryClass = accuracy >= 90 ? "good" : accuracy >= 70 ? "ok" : "warn";

    resultEl.classList.remove("hidden");
    resultEl.innerHTML =
      '<p class="dictation-summary ' + summaryClass + '">Accuracy: <strong>' + accuracy + "%</strong> (" +
      correct + " / " + expectedWords.length + " words correct)</p>" + html;
  }

  document.getElementById("checkDictationBtn").addEventListener("click", checkDictation);

  document.getElementById("clearDictationBtn").addEventListener("click", function() {
    document.getElementById("dictationInput").value = "";
    document.getElementById("dictationResult").classList.add("hidden");
    document.getElementById("dictationResult").innerHTML = "";
  });

  document.getElementById("speakBtn").addEventListener("click", function() {
    var u = new SpeechSynthesisUtterance(c.paragraphEn);
    u.lang = "en-US";
    u.rate = 0.85;
    speechSynthesis.speak(u);
  });

  document.getElementById("doneBtn").addEventListener("click", function() {
    ModuleProgress.markDone("m3");
    document.getElementById("doneBtn").textContent = "Memorized Today!";
    document.getElementById("doneBtn").disabled = true;
  });

  if (typeof ModuleProgress !== "undefined" && ModuleProgress.isDone("m3")) {
    document.getElementById("doneBtn").textContent = "Already Done Today";
    document.getElementById("doneBtn").disabled = true;
  }

  try {
    var ebbReviewCard = document.getElementById("ebbReviewCard");
    var ebbDueList = document.getElementById("ebbDueList");
    var ebbSession = document.getElementById("ebbSession");
    var ebbDueCount = document.getElementById("ebbDueCount");
    var ebbPassageEl = document.getElementById("ebbPassage");
    var ebbPassageZhEl = document.getElementById("ebbPassageZh");
    var ebbActiveItem = null;
    var ebbCorpus = null;
    var ebbHidden = false;

    function setEbbPassageHidden(isHidden) {
      ebbHidden = isHidden;
      ebbPassageEl.classList.toggle("hidden", ebbHidden);
      document.getElementById("ebbToggleBtn").textContent = ebbHidden ? "Show Passage" : "Hide Passage";
    }

    function closeEbbSession() {
      ebbActiveItem = null;
      ebbCorpus = null;
      ebbSession.classList.add("hidden");
      ebbDueList.style.display = "block";
      renderEbbDueList();
    }

    function startEbbSession(item) {
      ebbActiveItem = item;
      ebbCorpus = getCorpusByDay(item.day);
      ebbPassageEl.textContent = ebbCorpus.paragraphEn;
      ebbPassageZhEl.textContent = ebbCorpus.paragraphZh;
      ebbPassageZhEl.classList.add("hidden");
      document.getElementById("ebbToggleZhBtn").textContent = "Show Chinese";
      setEbbPassageHidden(true);

      document.getElementById("ebbSessionLabel").textContent =
        "Day " + item.day + " · " + item.stageLabel;
      document.getElementById("ebbSessionTheme").textContent = ebbCorpus.theme;
      ebbDueList.style.display = "none";
      ebbSession.classList.remove("hidden");
      ebbSession.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function renderEbbDueList() {
      var due = EbbinghausReview.getDueItems("m3");
      ebbDueCount.textContent = due.length;

      if (!due.length) {
        ebbReviewCard.style.display = "none";
        return;
      }

      ebbReviewCard.style.display = "block";
      ebbDueList.innerHTML = due.map(function(item) {
        var corpus = getCorpusByDay(item.day);
        var overdue = item.overdueDays > 0
          ? '<span class="ebb-overdue">Overdue ' + item.overdueDays + " day(s)</span>"
          : '<span style="color:var(--accent2);font-size:0.82rem;">Due today</span>';
        return (
          '<div class="ebb-due-item">' +
          '<div class="ebb-due-meta">' +
          "<strong>Day " + item.day + " · " + item.stageLabel + "</strong>" +
          "<span>" + corpus.theme + "</span> " + overdue +
          "</div>" +
          '<button type="button" class="btn btn-primary ebb-start-btn" data-day="' + item.day +
          '" data-stage="' + item.stageIndex + '">Review Now</button>' +
          "</div>"
        );
      }).join("");

      ebbDueList.querySelectorAll(".ebb-start-btn").forEach(function(btn) {
        btn.addEventListener("click", function() {
          var day = parseInt(btn.dataset.day, 10);
          var stage = parseInt(btn.dataset.stage, 10);
          var match = due.find(function(d) { return d.day === day && d.stageIndex === stage; });
          if (match) startEbbSession(match);
        });
      });
    }

    document.getElementById("ebbCloseBtn").addEventListener("click", closeEbbSession);
    document.getElementById("ebbToggleBtn").addEventListener("click", function() {
      setEbbPassageHidden(!ebbHidden);
    });
    document.getElementById("ebbToggleZhBtn").addEventListener("click", function() {
      ebbPassageZhEl.classList.toggle("hidden");
      document.getElementById("ebbToggleZhBtn").textContent =
        ebbPassageZhEl.classList.contains("hidden") ? "Show Chinese" : "Hide Chinese";
    });
    document.getElementById("ebbSpeakBtn").addEventListener("click", function() {
      if (!ebbCorpus) return;
      var u = new SpeechSynthesisUtterance(ebbCorpus.paragraphEn);
      u.lang = "en-US";
      u.rate = 0.85;
      speechSynthesis.speak(u);
    });
    document.getElementById("ebbCompleteBtn").addEventListener("click", function() {
      if (!ebbActiveItem) return;
      EbbinghausReview.markStageDone("m3", ebbActiveItem.day, ebbActiveItem.stageIndex);
      closeEbbSession();
    });

    renderEbbDueList();

    if (ModuleProgress.isDone("m3")) {
      EbbinghausReview.recordLearned("m3", StudyDay.get());
      renderEbbDueList();
    }
  } catch (err) {
    var ebbReviewCard = document.getElementById("ebbReviewCard");
    if (ebbReviewCard) ebbReviewCard.style.display = "none";
  }
  } catch (err) {
    showLoadError(err.message || "Page init failed.");
  }
})();
