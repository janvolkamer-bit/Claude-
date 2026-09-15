// Biercounter Widget für Scriptable (iOS)
//
// Einrichtung:
// 1. Scriptable-App installieren (App Store, kostenlos).
// 2. Neues Script anlegen, diesen kompletten Code einfügen, Script "Biercounter" nennen.
// 3. Home-Bildschirm: gedrückt halten -> "+" -> Scriptable-Widget hinzufügen
//    (klein oder mittel).
// 4. Widget gedrückt halten -> "Widget bearbeiten" -> Script "Biercounter" auswählen.
// 5. Fertig: Tippen auf das Widget trägt +1 Bier ein (öffnet kurz Scriptable
//    und kehrt danach zum Home-Bildschirm zurück - das ist eine iOS-Vorgabe
//    für Scriptable-Widgets, lässt sich nicht "unsichtbar" machen).
//
// Zum Zurücksetzen: im "Widget bearbeiten"-Screen unter "Parameter" das Wort
// reset eintragen, einmal auf das Widget tippen (löscht alle Daten), danach
// den Parameter wieder leeren.
//
// Hinweis: Dieses Widget speichert seine Daten lokal in der Scriptable-App
// (unabhängig von der Web-App). Beide teilen sich aktuell KEINE gemeinsamen
// Einträge, da eine Website kein Dateisystem der iOS-App lesen kann.

const FILE_NAME = "biercounter-data.json";
const fm = FileManager.local();
const path = fm.joinPath(fm.documentsDirectory(), FILE_NAME);

function todayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfWeek(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  return start;
}

function loadData() {
  if (fm.fileExists(path)) {
    try {
      return JSON.parse(fm.readString(path));
    } catch (e) {
      // corrupt file - fall through to fresh data
    }
  }
  return { entries: [], startDate: todayKey(new Date()) };
}

function saveData(data) {
  fm.writeString(path, JSON.stringify(data));
}

function computeStats(data) {
  const now = new Date();
  const today = todayKey(now);
  const weekStart = startOfWeek(now);

  let todayTotal = 0;
  let weekTotal = 0;
  let total = 0;
  const byDay = new Map();

  data.entries.forEach((entry) => {
    const entryDate = new Date(entry.timestamp);
    const key = todayKey(entryDate);
    byDay.set(key, (byDay.get(key) || 0) + entry.amount);
    total += entry.amount;
    if (key === today) todayTotal += entry.amount;
    if (entryDate >= weekStart) weekTotal += entry.amount;
  });

  const drinkingDays = Array.from(byDay.keys()).filter((k) => k >= data.startDate).length;

  return { todayTotal, weekTotal, total, drinkingDays };
}

function addStat(stack, value, label) {
  const box = stack.addStack();
  box.layoutVertically();
  const v = box.addText(String(value));
  v.font = Font.boldSystemFont(16);
  v.textColor = new Color("#b5701a");
  const l = box.addText(label);
  l.font = Font.systemFont(10);
  l.textColor = Color.gray();
}

function buildWidget(stats) {
  const w = new ListWidget();
  w.backgroundColor = Color.dynamic(new Color("#f5f0e6"), new Color("#1a1712"));
  w.setPadding(14, 14, 14, 14);

  const title = w.addText("🍺 Biercounter");
  title.font = Font.boldSystemFont(14);
  title.textColor = Color.dynamic(new Color("#2b2118"), new Color("#f2e9da"));
  w.addSpacer(6);

  const big = w.addText(String(stats.todayTotal));
  big.font = Font.boldSystemFont(34);
  big.textColor = new Color("#d98c2b");

  const sub = w.addText("heute · Tippen für +1");
  sub.font = Font.systemFont(10);
  sub.textColor = Color.gray();

  w.addSpacer(8);
  const row = w.addStack();
  row.spacing = 14;
  addStat(row, stats.weekTotal, "Woche");
  addStat(row, stats.drinkingDays, "Trinktage");
  addStat(row, stats.total, "Gesamt");

  w.refreshAfterDate = new Date(Date.now() + 30 * 60 * 1000);
  return w;
}

// --- Hauptlogik ---
let data = loadData();

if (args.widgetParameter === "reset") {
  data = { entries: [], startDate: todayKey(new Date()) };
  saveData(data);
} else if (!config.runsInWidget) {
  // Kein Timeline-Refresh, sondern ein Tap/manueller Start -> ein Bier eintragen.
  data.entries.push({ amount: 1, timestamp: new Date().toISOString() });
  saveData(data);
}

const stats = computeStats(data);
const widget = buildWidget(stats);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentSmall();
}

Script.complete();
