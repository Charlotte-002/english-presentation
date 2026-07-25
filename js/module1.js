(function() {
  function showLoadError(message) {
    var card = document.getElementById("wordCard");
    if (card) {
      card.innerHTML =
        '<p style="color:var(--danger);font-weight:600;">单词加载失败</p>' +
        '<p class="hint-text" style="margin-top:8px;">' + message + "</p>";
    }
  }

  if (typeof CORPUS === "undefined" || typeof getCorpusByDay !== "function") {
    showLoadError("js/data.js 未加载。请从 english-presentation 文件夹打开，并确认 js/data.js 存在。");
    return;
  }

  if (typeof StudyDay === "undefined" || typeof formatDisplayDate !== "function") {
    showLoadError("js/app.js 未加载。请确认 js/app.js 存在。");
    return;
  }

  StudyDay.ensureToday();

  if (typeof renderNav === "function") {
    document.getElementById("nav").innerHTML = renderNav("m1");
    document.getElementById("footer").innerHTML = renderFooter();
  }

  var words = [];
  var index = 0;
  var wordStep = document.getElementById("wordStep");
  var wordText = document.getElementById("wordText");
  var wordPhonetic = document.getElementById("wordPhonetic");
  var wordMeaning = document.getElementById("wordMeaning");
  var nextBtn = document.getElementById("nextBtn");
  var reviewBtn = document.getElementById("reviewBtn");
  var listenBtn = document.getElementById("listenBtn");
  var wordDots = document.getElementById("wordDots");
  var reviewCard = document.getElementById("reviewCard");
  var wordCard = document.getElementById("wordCard");

  function renderDots() {
    wordDots.innerHTML = "";
    for (var i = 0; i < words.length; i++) {
      var dot = document.createElement("span");
      dot.className = "set-dot" + (i === index ? " active" : "") + (i < index ? " done" : "");
      wordDots.appendChild(dot);
    }
  }

  function showWord(i) {
    if (!words.length) return;
    var w = words[i];
    if (!w) return;
    index = i;
    wordStep.textContent = "Word " + (i + 1) + " of " + words.length;
    wordText.textContent = w.word || "";
    wordPhonetic.innerHTML =
      (w.phonetic || "") +
      (w.pos ? ' <span style="color:var(--accent);">' + w.pos + "</span>" : "");
    wordMeaning.textContent = w.meaning || "";

    var isLast = i === words.length - 1;
    nextBtn.style.display = isLast ? "none" : "inline-flex";
    reviewBtn.style.display = isLast ? "inline-flex" : "none";
    renderDots();
  }

  function goNext() {
    if (index < words.length - 1) showWord(index + 1);
  }

  function speakCurrent() {
    if (!words[index]) return;
    var u = new SpeechSynthesisUtterance(words[index].word);
    u.lang = "en-US";
    u.rate = 0.9;
    speechSynthesis.speak(u);
  }

  function openReview() {
    var list = document.getElementById("reviewList");
    list.innerHTML = words
      .map(function(w, i) {
        return (
          '<div class="review-item">' +
          '<span class="review-num">' +
          (i + 1) +
          "</span>" +
          "<div><strong>" +
          w.word +
          "</strong> " +
          (w.phonetic || "") +
          '<p style="color:var(--muted);margin-top:4px;font-size:0.9rem;">' +
          (w.meaning || "") +
          "</p></div></div>"
        );
      })
      .join("");
    reviewCard.style.display = "block";
    showWord(0);
    wordCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function loadDayWords() {
    var c = getCorpusByDay(StudyDay.get());
    if (!c || !c.words || !c.words.length) {
      showLoadError("Day " + StudyDay.get() + " 没有单词数据。");
      return false;
    }
    words = c.words;
    document.getElementById("todayDate").textContent = formatDisplayDate();
    document.getElementById("theme").textContent = c.theme || "";
    document.getElementById("dayNum").textContent = c.day || StudyDay.get();
    index = 0;
    showWord(0);
    return true;
  }

  window.Module1 = { next: goNext, show: showWord, speak: speakCurrent };

  listenBtn.addEventListener("click", speakCurrent);
  nextBtn.addEventListener("click", goNext);
  reviewBtn.addEventListener("click", openReview);

  document.getElementById("doneBtn").addEventListener("click", function() {
    if (typeof ModuleProgress === "undefined") return;
    ModuleProgress.markDone("m1");
    document.getElementById("doneBtn").textContent = "Learned!";
    document.getElementById("doneBtn").disabled = true;
  });

  if (typeof ModuleProgress !== "undefined" && ModuleProgress.isDone("m1")) {
    document.getElementById("doneBtn").textContent = "Already Learned";
    document.getElementById("doneBtn").disabled = true;
  }

  if (!loadDayWords()) return;

  window.addEventListener("studydaychange", function() {
    reviewCard.style.display = "none";
    loadDayWords();
    if (typeof renderEbbDueList === "function") renderEbbDueList();
  });

  if (typeof EbbinghausReview === "undefined") return;

  var ebbReviewCard = document.getElementById("ebbReviewCard");
  var ebbDueList = document.getElementById("ebbDueList");
  var ebbSession = document.getElementById("ebbSession");
  var ebbDueCount = document.getElementById("ebbDueCount");
  var ebbActiveItem = null;
  var ebbWords = [];
  var ebbIndex = 0;

  function renderEbbDots() {
    var dots = document.getElementById("ebbWordDots");
    dots.innerHTML = "";
    for (var i = 0; i < ebbWords.length; i++) {
      var dot = document.createElement("span");
      dot.className = "set-dot" + (i === ebbIndex ? " active" : "") + (i < ebbIndex ? " done" : "");
      dots.appendChild(dot);
    }
  }

  function showEbbWord(i) {
    var w = ebbWords[i];
    ebbIndex = i;
    document.getElementById("ebbWordStep").textContent = "Word " + (i + 1) + " of " + ebbWords.length;
    document.getElementById("ebbWordText").textContent = w.word;
    document.getElementById("ebbWordPhonetic").innerHTML =
      w.phonetic + (w.pos ? ' <span style="color:var(--accent);">' + w.pos + "</span>" : "");
    document.getElementById("ebbWordMeaning").textContent = w.meaning;
    var isLast = i === ebbWords.length - 1;
    document.getElementById("ebbNextBtn").style.display = isLast ? "none" : "inline-flex";
    document.getElementById("ebbCompleteBtn").style.display = isLast ? "inline-flex" : "none";
    document.getElementById("ebbPrevBtn").style.display = i > 0 ? "inline-flex" : "none";
    renderEbbDots();
  }

  function closeEbbSession() {
    ebbActiveItem = null;
    ebbSession.classList.add("hidden");
    ebbDueList.style.display = "block";
    renderEbbDueList();
  }

  function startEbbSession(item) {
    ebbActiveItem = item;
    var corpus = getCorpusByDay(item.day);
    ebbWords = corpus.words;
    ebbIndex = 0;
    document.getElementById("ebbSessionLabel").textContent = "Day " + item.day + " · " + item.stageLabel;
    document.getElementById("ebbSessionTheme").textContent = corpus.theme;
    ebbDueList.style.display = "none";
    ebbSession.classList.remove("hidden");
    showEbbWord(0);
    ebbSession.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  window.renderEbbDueList = function renderEbbDueList() {
    var due = EbbinghausReview.getDueItems("m1");
    ebbDueCount.textContent = due.length;
    if (!due.length) {
      ebbReviewCard.style.display = "none";
      return;
    }
    ebbReviewCard.style.display = "block";
    ebbDueList.innerHTML = due
      .map(function(item) {
        var corpus = getCorpusByDay(item.day);
        var overdue =
          item.overdueDays > 0
            ? '<span class="ebb-overdue">Overdue ' + item.overdueDays + " day(s)</span>"
            : '<span style="color:var(--accent2);font-size:0.82rem;">Due today</span>';
        return (
          '<div class="ebb-due-item"><div class="ebb-due-meta"><strong>Day ' +
          item.day +
          " · " +
          item.stageLabel +
          "</strong><span>" +
          corpus.theme +
          ' · 5 words</span> ' +
          overdue +
          '</div><button type="button" class="btn btn-primary ebb-start-btn" data-day="' +
          item.day +
          '" data-stage="' +
          item.stageIndex +
          '">Review Now</button></div>'
        );
      })
      .join("");
    ebbDueList.querySelectorAll(".ebb-start-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var day = parseInt(btn.dataset.day, 10);
        var stage = parseInt(btn.dataset.stage, 10);
        var match = due.find(function(d) {
          return d.day === day && d.stageIndex === stage;
        });
        if (match) startEbbSession(match);
      });
    });
  };

  document.getElementById("ebbCloseBtn").addEventListener("click", closeEbbSession);
  document.getElementById("ebbListenBtn").addEventListener("click", function() {
    var u = new SpeechSynthesisUtterance(ebbWords[ebbIndex].word);
    u.lang = "en-US";
    u.rate = 0.9;
    speechSynthesis.speak(u);
  });
  document.getElementById("ebbPrevBtn").addEventListener("click", function() {
    if (ebbIndex > 0) showEbbWord(ebbIndex - 1);
  });
  document.getElementById("ebbNextBtn").addEventListener("click", function() {
    if (ebbIndex < ebbWords.length - 1) showEbbWord(ebbIndex + 1);
  });
  document.getElementById("ebbCompleteBtn").addEventListener("click", function() {
    if (!ebbActiveItem) return;
    EbbinghausReview.markStageDone("m1", ebbActiveItem.day, ebbActiveItem.stageIndex);
    closeEbbSession();
  });

  renderEbbDueList();
  if (typeof ModuleProgress !== "undefined" && ModuleProgress.isDone("m1")) {
    EbbinghausReview.recordLearned("m1", StudyDay.get());
    renderEbbDueList();
  }
})();
