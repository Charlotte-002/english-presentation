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
  const d = parseDateKeyLocal(dateKey);
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
}

function daysBetweenKeys(fromKey, toKey) {
  return Math.round((parseDateKeyLocal(toKey) - parseDateKeyLocal(fromKey)) / 86400000);
}

const EbbinghausReview = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(EBBINGHAUS_KEY) || "{}");
    } catch (e) {
      return {};
    }
  },

  save(data) {
    localStorage.setItem(EBBINGHAUS_KEY, JSON.stringify(data));
  },

  recordLearned(moduleId, dayNum) {
    const data = this.get();
    if (!data[moduleId]) data[moduleId] = {};
    const key = String(dayNum);
    if (!data[moduleId][key]) {
      data[moduleId][key] = {
        learnedAt: formatDateKey(),
        completed: []
      };
    }
    this.save(data);
  },

  markStageDone(moduleId, dayNum, stageIndex) {
    const data = this.get();
    const entry = data[moduleId] && data[moduleId][String(dayNum)];
    if (!entry) return;
    if (!entry.completed.includes(stageIndex)) {
      entry.completed.push(stageIndex);
      entry.completed.sort(function(a, b) { return a - b; });
    }
    this.save(data);
  },

  getDueItems(moduleId, todayKey) {
    if (!todayKey) todayKey = formatDateKey();
    const data = this.get();
    const moduleData = data[moduleId] || {};
    const due = [];

    Object.keys(moduleData).forEach(function(dayKey) {
      const dayNum = parseInt(dayKey, 10);
      const entry = moduleData[dayKey];
      if (!entry || !entry.learnedAt) return;

      EBBINGHAUS_INTERVALS.forEach(function(interval, stageIndex) {
        if (entry.completed.includes(stageIndex)) return;
        const dueDate = addDaysToKey(entry.learnedAt, interval);
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

  countDue(moduleId) {
    return this.getDueItems(moduleId).length;
  },

  countAllDue() {
    return this.countDue("m1") + this.countDue("m3");
  }
};

if (typeof window !== "undefined") {
  window.EbbinghausReview = EbbinghausReview;
}
