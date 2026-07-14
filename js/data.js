const DAILY_CONTENT = [
  {
    day: 1,
    word: "Stakeholder",
    phonetic: "/ˈsteɪkˌhoʊldər/",
    meaning: "A person or group with an interest in a project or decision.",
    sentence: "We need to align all stakeholders before the product launch.",
    theme: "Quarterly Business Review",
    themeDesc: "Present last quarter's results to senior leadership.",
    scene: "boardroom",
    passage: "Good morning, everyone. Thank you for joining today's quarterly review. I will walk you through our key metrics, highlight major wins, and outline priorities for next quarter. Our revenue grew by twelve percent, driven mainly by enterprise clients. Looking ahead, we will focus on retention, operational efficiency, and cross-team collaboration.",
    passageHint: "QBR opening + results + next steps"
  },
  {
    day: 2,
    word: "Deliverable",
    phonetic: "/dɪˈlɪvərəbəl/",
    meaning: "A tangible output that must be completed and handed over.",
    sentence: "The final deliverable is due by Friday at 5 PM.",
    theme: "Project Kickoff Meeting",
    themeDesc: "Introduce the project scope, timeline, and team roles.",
    scene: "startup",
    passage: "Hi team, welcome to the kickoff. The goal of this project is to redesign our onboarding flow and reduce drop-off by twenty percent. I am the project lead, and Sarah will own design while James handles engineering. Our first deliverable is a user journey map, due in two weeks.",
    passageHint: "Kickoff: goal, roles, first deliverable"
  },
  {
    day: 3,
    word: "Bandwidth",
    phonetic: "/ˈbændwɪdθ/",
    meaning: "Available capacity to take on more work (informal business use).",
    sentence: "I don't have enough bandwidth to support another initiative this month.",
    theme: "Resource Planning Discussion",
    themeDesc: "Negotiate priorities when the team is at capacity.",
    scene: "glass",
    passage: "Thanks for raising this. Right now our team is fully committed to the migration and the compliance audit. I can support a small discovery phase, but a full build would require either a timeline shift or additional headcount. Could we revisit priority ranking in next week's planning session?",
    passageHint: "Capacity pushback + alternatives"
  },
  {
    day: 4,
    word: "Action Item",
    phonetic: "/ˈækʃən ˈaɪtəm/",
    meaning: "A specific task assigned during a meeting.",
    sentence: "Let's capture that as an action item and assign an owner.",
    theme: "Weekly Team Sync",
    themeDesc: "Summarize updates and close with clear action items.",
    scene: "huddle",
    passage: "To recap today's sync: first, the API integration is on track for Wednesday. Second, we are blocked on legal review for the vendor contract. Action items — Maria will follow up with Legal by tomorrow, and Tom will share the updated test plan in Slack. Any questions before we wrap?",
    passageHint: "Recap + blockers + action items"
  },
  {
    day: 5,
    word: "Leverage",
    phonetic: "/ˈlevərɪdʒ/",
    meaning: "To use something effectively to achieve a result.",
    sentence: "We should leverage existing customer data to personalize outreach.",
    theme: "Strategy Proposal",
    themeDesc: "Pitch an idea and explain how to use existing assets.",
    scene: "boardroom",
    passage: "I'd like to propose a pilot program for personalized onboarding. Instead of building from scratch, we can leverage our CRM data and existing email templates. This approach reduces cost, speeds up launch, and lets us validate impact within six weeks. I recommend starting with our top fifty enterprise accounts.",
    passageHint: "Proposal + leverage existing assets"
  },
  {
    day: 6,
    word: "Alignment",
    phonetic: "/əˈlaɪnmənt/",
    meaning: "Agreement among people on goals, plans, or direction.",
    sentence: "We need cross-functional alignment before changing the roadmap.",
    theme: "Cross-Functional Alignment",
    themeDesc: "Bridge gaps between teams with different priorities.",
    scene: "glass",
    passage: "I want to make sure we're aligned across product, sales, and support. Sales needs faster feature releases, while support is focused on stability. Our shared goal is customer satisfaction. I suggest we agree on two release themes this quarter and communicate trade-offs transparently to all teams.",
    passageHint: "Conflicting priorities + shared goal"
  },
  {
    day: 7,
    word: "Follow-up",
    phonetic: "/ˈfɒloʊ ʌp/",
    meaning: "A subsequent action to check progress or continue a discussion.",
    sentence: "I'll send a follow-up email with the meeting notes and deadlines.",
    theme: "Client Check-in Call",
    themeDesc: "Update a client and confirm next steps professionally.",
    scene: "startup",
    passage: "Thank you for your time today. As discussed, we completed phase one ahead of schedule. The remaining items are user acceptance testing and documentation. I will send a follow-up email with timelines and owners by end of day. Please let me know if you'd like to schedule a review session next Thursday.",
    passageHint: "Progress update + follow-up promise"
  }
];

function getDayIndex() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = Date.now() - start.getTime();
  const dayOfYear = Math.floor(diff / 86400000);
  return dayOfYear % DAILY_CONTENT.length;
}

function getTodayContent() {
  return DAILY_CONTENT[getDayIndex()];
}

function formatDateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(d = new Date()) {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}
