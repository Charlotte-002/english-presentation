const STORAGE_KEY = "workplaceEnglishCheckins";
const MODULE_KEY = "workplaceEnglishModules";
const STUDY_DAY_KEY = "workplaceEnglishStudyDay";
const START_DATE_KEY = "workplaceEnglishStartDate";
const LAST_SYNC_KEY = "workplaceEnglishLastSyncDate";

const StudyDay = {
  maxDay() {
    return typeof CORPUS_DAYS !== "undefined" ? CORPUS_DAYS : 100;
  },

  get() {
    const v = parseInt(localStorage.getItem(STUDY_DAY_KEY) || "1", 10);
    if (isNaN(v) || v < 1) return 1;
    if (v > this.maxDay()) return this.maxDay();
    return v;
  },

  set(day) {
    const d = Math.max(1, Math.min(this.maxDay(), parseInt(day, 10) || 1));
    localStorage.setItem(STUDY_DAY_KEY, String(d));
    window.dispatchEvent(new CustomEvent("studydaychange", { detail: { day: d } }));
  },

  getAutoDay() {
    const checkins = CheckIn.getAll().slice().sort();
    const today = formatDateKey();
    const idx = checkins.indexOf(today);
    if (idx !== -1) return idx + 1;
    return Math.min(checkins.length + 1, this.maxDay());
  },

  ensureToday() {
    const today = formatDateKey();
    if (localStorage.getItem(LAST_SYNC_KEY) === today) return this.get();

    const checkins = CheckIn.getAll().slice().sort();
    if (checkins.includes(today)) {
      this.set(checkins.indexOf(today) + 1);
    } else {
      this.set(Math.min(checkins.length + 1, this.maxDay()));
    }
    localStorage.setItem(LAST_SYNC_KEY, today);
    return this.get();
  },

  getStartDate() {
    const checkins = CheckIn.getAll().slice().sort();
    if (checkins.length) return new Date(checkins[0] + "T12:00:00");
    let s = localStorage.getItem(START_DATE_KEY);
    if (!s) {
      s = formatDateKey(new Date());
      localStorage.setItem(START_DATE_KEY, s);
    }
    return new Date(s + "T12:00:00");
  },

  dateToLesson(date) {
    const key = formatDateKey(date);
    const checkins = CheckIn.getAll().slice().sort();
    const idx = checkins.indexOf(key);
    if (idx !== -1) return idx + 1;
    if (key === formatDateKey(new Date())) return this.getAutoDay();
    return null;
  },

  lessonToDate(lesson) {
    const checkins = CheckIn.getAll().slice().sort();
    if (lesson >= 1 && lesson <= checkins.length) {
      return new Date(checkins[lesson - 1] + "T12:00:00");
    }
    if (lesson === this.getAutoDay()) return new Date();
    if (checkins.length) {
      const d = new Date(checkins[checkins.length - 1] + "T12:00:00");
      d.setDate(d.getDate() + (lesson - checkins.length));
      return d;
    }
    const start = this.getStartDate();
    const d = new Date(start);
    d.setDate(start.getDate() + lesson - 1);
    return d;
  }
};

function getTodayCorpus() {
  return getCorpusByDay(StudyDay.get());
}

function getTodayContent() {
  const c = getTodayCorpus();
  const idx = StudyDay.get() - 1;
  const scenes = ["boardroom", "startup", "glass", "huddle"];
  return {
    day: c.day,
    theme: c.theme,
    themeDesc: "Practice this meeting paragraph in English.",
    scene: scenes[idx % scenes.length],
    passage: c.paragraphEn,
    passageHint: c.paragraphZh,
    paragraphZh: c.paragraphZh,
    words: c.words,
    word: c.words.map(function(w) { return w.word; }).join(", "),
    phonetic: "",
    meaning: c.words.map(function(w) { return w.word + ": " + w.meaning; }).join("; "),
    sentence: c.paragraphEn
  };
}

function getDayIndex() {
  return StudyDay.get() - 1;
}

function progressKey() {
  return "lesson-" + StudyDay.get();
}

const CheckIn = {
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch (e) {
      return [];
    }
  },

  save(dates) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dates));
  },

  isCheckedIn(dateKey = formatDateKey()) {
    return this.getAll().includes(dateKey);
  },

  checkIn(dateKey = formatDateKey()) {
    const dates = this.getAll();
    if (!dates.includes(dateKey)) {
      dates.push(dateKey);
      dates.sort();
      this.save(dates);
    }
  },

  getStreak() {
    const dates = new Set(this.getAll());
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = formatDateKey(d);
      if (dates.has(key)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else if (streak === 0 && key === formatDateKey()) {
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  },

  getTotalDays() {
    return this.getAll().length;
  },

  getRecentDays(count = 7) {
    const result = [];
    const d = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const day = new Date(d);
      day.setDate(d.getDate() - i);
      result.push({
        key: formatDateKey(day),
        label: day.toLocaleDateString("en-US", { weekday: "short" }),
        checked: this.getAll().includes(formatDateKey(day))
      });
    }
    return result;
  }
};

const ModuleProgress = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(MODULE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  },

  save(data) {
    localStorage.setItem(MODULE_KEY, JSON.stringify(data));
  },

  markDone(moduleId) {
    const data = this.get();
    const key = progressKey();
    if (!data[key]) data[key] = {};
    data[key][moduleId] = true;
    this.save(data);
    if (StudyDay.get() === StudyDay.getAutoDay()) {
      CheckIn.checkIn();
    }
    if ((moduleId === "m1" || moduleId === "m3") && typeof EbbinghausReview !== "undefined") {
      EbbinghausReview.recordLearned(moduleId, StudyDay.get());
    }
  },

  isDone(moduleId) {
    const key = progressKey();
    return !!(this.get()[key] && this.get()[key][moduleId]);
  },

  countForDay(dayNum) {
    const key = "lesson-" + dayNum;
    const day = this.get()[key] || {};
    return ["m1", "m2", "m3"].filter(function(id) { return day[id]; }).length;
  },

  todayCount() {
    const key = progressKey();
    const day = this.get()[key] || {};
    return ["m1", "m2", "m3"].filter(function(id) { return day[id]; }).length;
  }
};

function renderStudyCalendar(container, viewDate) {
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const selected = StudyDay.get();
  const start = StudyDay.getStartDate();
  const maxDay = typeof CORPUS_DAYS !== "undefined" ? CORPUS_DAYS : 100;

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const weekdays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  let html = '<div class="cal-header">';
  html += '<button type="button" class="cal-nav" data-cal="-1">&#8249;</button>';
  html += '<span class="cal-title">' + monthNames[m] + ' ' + y + '</span>';
  html += '<button type="button" class="cal-nav" data-cal="1">&#8250;</button>';
  html += '</div>';
  html += '<p class="cal-hint">Only checked-in days advance. Day 1 started ' + start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + '. Missed days do not skip content.</p>';
  html += '<div class="cal-weekdays">' + weekdays.map(function(w) {
    return '<span>' + w + '</span>';
  }).join("") + '</div><div class="cal-grid">';

  const first = new Date(y, m, 1);
  const startPad = first.getDay();
  for (let i = 0; i < startPad; i++) html += '<span class="cal-cell empty"></span>';

  const daysInMonth = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(y, m, d);
    const lesson = StudyDay.dateToLesson(cellDate);
    let cls = "cal-cell";
    if (lesson === null) cls += " disabled";
    if (lesson === selected) cls += " selected";
    if (formatDateKey(cellDate) === formatDateKey(new Date())) cls += " today";
    html += '<button type="button" class="' + cls + '" data-lesson="' + (lesson || "") + '">';
    html += '<span class="cal-date">' + d + '</span>';
    html += '</button>';
  }
  html += '</div>';
  html += '<p class="cal-selected">Studying: <strong>Day ' + selected + '</strong> of ' + maxDay + '</p>';

  container.innerHTML = html;
  container.dataset.year = y;
  container.dataset.month = m;

  container.querySelectorAll(".cal-nav").forEach(function(btn) {
    btn.addEventListener("click", function() {
      const dir = parseInt(btn.dataset.cal, 10);
      const nd = new Date(y, m + dir, 1);
      renderStudyCalendar(container, nd);
    });
  });

  container.querySelectorAll(".cal-cell:not(.disabled):not(.empty)").forEach(function(btn) {
    btn.addEventListener("click", function() {
      const lesson = parseInt(btn.dataset.lesson, 10);
      if (lesson) StudyDay.set(lesson);
    });
  });
}

function renderNav(active = "") {
  const links = [
    { href: "index.html", label: "Home", id: "home" },
    { href: "module1.html", label: "Vocabulary", id: "m1" },
    { href: "module2.html", label: "Presentation", id: "m2" },
    { href: "module3.html", label: "Memorization", id: "m3" }
  ];
  return `
    <nav class="nav">
      <a href="index.html" class="nav-brand">Workplace English</a>
      <div class="nav-links">
        ${links
          .filter((l) => l.id !== "home")
          .map(
            (l) =>
              `<a href="${l.href}" class="nav-link${active === l.id ? " active" : ""}">${l.label}</a>`
          )
          .join("")}
      </div>
    </nav>`;
}

function renderFooter() {
  return `<footer class="footer">Daily practice builds fluency. Keep showing up.</footer>`;
}
