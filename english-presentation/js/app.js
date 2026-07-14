const STORAGE_KEY = "workplaceEnglishCheckins";
const MODULE_KEY = "workplaceEnglishModules";

const CheckIn = {
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
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
    } catch {
      return {};
    }
  },

  save(data) {
    localStorage.setItem(MODULE_KEY, JSON.stringify(data));
  },

  markDone(moduleId, dateKey = formatDateKey()) {
    const data = this.get();
    if (!data[dateKey]) data[dateKey] = {};
    data[dateKey][moduleId] = true;
    this.save(data);
  },

  isDone(moduleId, dateKey = formatDateKey()) {
    return !!(this.get()[dateKey] && this.get()[dateKey][moduleId]);
  },

  todayCount(dateKey = formatDateKey()) {
    const day = this.get()[dateKey] || {};
    return ["m1", "m2", "m3"].filter((id) => day[id]).length;
  }
};

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
