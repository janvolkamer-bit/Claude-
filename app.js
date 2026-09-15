(function () {
  "use strict";

  const STORAGE_KEY = "biercounter.entries";
  const START_DATE_KEY = "biercounter.startDate";
  const MAX_PHOTO_DIMENSION = 800;
  const PHOTO_QUALITY = 0.7;

  const totalCountEl = document.getElementById("totalCount");
  const addForm = document.getElementById("addForm");
  const amountInput = document.getElementById("amount");
  const decBtn = document.getElementById("decBtn");
  const incBtn = document.getElementById("incBtn");
  const drinkInput = document.getElementById("drink");
  const drinkOptionsEl = document.getElementById("drinkOptions");
  const drinkChipsEl = document.getElementById("drinkChips");
  const sizeChipsEl = document.getElementById("sizeChips");
  const sizeInput = document.getElementById("sizeInput");
  const noteInput = document.getElementById("note");
  const photoInput = document.getElementById("photo");
  const photoPreview = document.getElementById("photoPreview");
  const clearPhotoBtn = document.getElementById("clearPhotoBtn");
  const historyList = document.getElementById("historyList");
  const emptyState = document.getElementById("emptyState");
  const resetBtn = document.getElementById("resetBtn");
  const todayCountEl = document.getElementById("todayCount");
  const weekCountEl = document.getElementById("weekCount");
  const weekChartEl = document.getElementById("weekChart");
  const startDateInput = document.getElementById("startDate");
  const streakDaysCountEl = document.getElementById("streakDaysCount");
  const streakDaysLabelEl = document.getElementById("streakDaysLabel");

  const galleryDrinkFilter = document.getElementById("galleryDrinkFilter");
  const galleryDateFilter = document.getElementById("galleryDateFilter");
  const gallerySort = document.getElementById("gallerySort");
  const galleryResetBtn = document.getElementById("galleryResetBtn");
  const galleryGrid = document.getElementById("galleryGrid");
  const galleryEmptyState = document.getElementById("galleryEmptyState");

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightboxImg");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxClose = document.getElementById("lightboxClose");

  const dualCameraBtn = document.getElementById("dualCameraBtn");
  const cameraModal = document.getElementById("cameraModal");
  const backVideo = document.getElementById("backVideo");
  const frontVideo = document.getElementById("frontVideo");
  const cameraStatus = document.getElementById("cameraStatus");
  const captureBtn = document.getElementById("captureBtn");
  const cancelCameraBtn = document.getElementById("cancelCameraBtn");

  const RESET_CONFIRM_WORD = "LÖSCHEN";
  const WEEKDAY_LABELS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const DEFAULT_DRINKS = ["Bier", "Radler", "Wein", "Sekt", "Cocktail", "Wasser", "Limo"];
  const DEFAULT_SIZES = ["0,2l", "0,3l", "0,33l", "0,5l", "1,0l"];
  const MAX_DRINK_CHIPS = 8;

  let pendingPhoto = null;

  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function loadStartDate() {
    return localStorage.getItem(START_DATE_KEY);
  }

  function saveStartDate(dateKey) {
    localStorage.setItem(START_DATE_KEY, dateKey);
  }

  function ensureStartDate(entries) {
    let startDate = loadStartDate();
    if (startDate) return startDate;

    if (entries.length > 0) {
      const earliest = entries.reduce(
        (min, e) => (e.timestamp < min ? e.timestamp : min),
        entries[0].timestamp
      );
      startDate = localDateKey(new Date(earliest));
    } else {
      startDate = localDateKey(new Date());
    }
    saveStartDate(startDate);
    return startDate;
  }

  function formatTimestamp(iso) {
    const date = new Date(iso);
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function localDateKey(date) {
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

  function renderStats(entries) {
    const now = new Date();
    const todayKey = localDateKey(now);
    const weekStart = startOfWeek(now);
    const startDate = ensureStartDate(entries);
    startDateInput.value = startDate;

    let todayTotal = 0;
    let weekTotal = 0;
    const byDay = new Map();

    entries.forEach((entry) => {
      const entryDate = new Date(entry.timestamp);
      const key = localDateKey(entryDate);
      byDay.set(key, (byDay.get(key) || 0) + entry.amount);

      if (key === todayKey) todayTotal += entry.amount;
      if (entryDate >= weekStart) weekTotal += entry.amount;
    });

    todayCountEl.textContent = String(todayTotal);
    weekCountEl.textContent = String(weekTotal);

    const drinkingDays = Array.from(byDay.keys()).filter((key) => key >= startDate).length;
    const elapsedDays =
      Math.round((new Date(todayKey) - new Date(startDate)) / 86400000) + 1;
    streakDaysCountEl.textContent = String(drinkingDays);
    streakDaysLabelEl.textContent = "Trinktage seit Start";
    streakDaysLabelEl.title = `${drinkingDays} von ${Math.max(elapsedDays, drinkingDays)} Tagen seit ${startDate}`;

    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      days.push(d);
    }
    const maxAmount = Math.max(1, ...days.map((d) => byDay.get(localDateKey(d)) || 0));

    weekChartEl.innerHTML = "";
    days.forEach((d) => {
      const key = localDateKey(d);
      const amount = byDay.get(key) || 0;
      const isToday = key === todayKey;

      const bar = document.createElement("div");
      bar.className = "chart-bar" + (isToday ? " is-today" : "");

      const countEl = document.createElement("div");
      countEl.className = "chart-bar-count";
      countEl.textContent = amount > 0 ? String(amount) : "";
      bar.appendChild(countEl);

      const fill = document.createElement("div");
      fill.className = "chart-bar-fill";
      const heightPct = Math.max(4, Math.round((amount / maxAmount) * 100));
      fill.style.height = `${heightPct}%`;
      bar.appendChild(fill);

      const labelEl = document.createElement("div");
      labelEl.className = "chart-bar-label";
      labelEl.textContent = WEEKDAY_LABELS[d.getDay()];
      bar.appendChild(labelEl);

      weekChartEl.appendChild(bar);
    });
  }

  function getDistinctDrinks(entries) {
    const set = new Set(DEFAULT_DRINKS);
    entries.forEach((e) => {
      if (e.drink) set.add(e.drink);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "de"));
  }

  function getFrequentDrinks(entries) {
    const counts = new Map();
    entries.forEach((e) => {
      const drink = e.drink || "Bier";
      counts.set(drink, (counts.get(drink) || 0) + 1);
    });

    const used = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de"));
    const result = used.map(([drink]) => drink);

    DEFAULT_DRINKS.forEach((drink) => {
      if (!result.includes(drink)) result.push(drink);
    });

    return result.slice(0, MAX_DRINK_CHIPS);
  }

  function renderDrinkChips(entries) {
    const chips = getFrequentDrinks(entries);
    drinkChipsEl.innerHTML = "";
    chips.forEach((drink) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (drinkInput.value === drink ? " is-active" : "");
      btn.textContent = drink;
      btn.addEventListener("click", () => {
        drinkInput.value = drink;
        renderDrinkChips(entries);
      });
      drinkChipsEl.appendChild(btn);
    });
  }

  function renderSizeChips() {
    sizeChipsEl.innerHTML = "";
    DEFAULT_SIZES.forEach((size) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (sizeInput.value === size ? " is-active" : "");
      btn.textContent = size;
      btn.addEventListener("click", () => {
        sizeInput.value = size;
        renderSizeChips();
      });
      sizeChipsEl.appendChild(btn);
    });
  }

  function renderDrinkOptions(entries) {
    const drinks = getDistinctDrinks(entries);

    drinkOptionsEl.innerHTML = "";
    drinks.forEach((drink) => {
      const opt = document.createElement("option");
      opt.value = drink;
      drinkOptionsEl.appendChild(opt);
    });

    const previousFilter = galleryDrinkFilter.value;
    galleryDrinkFilter.innerHTML = '<option value="">Alle Getränke</option>';
    drinks.forEach((drink) => {
      const opt = document.createElement("option");
      opt.value = drink;
      opt.textContent = drink;
      galleryDrinkFilter.appendChild(opt);
    });
    if (drinks.includes(previousFilter)) {
      galleryDrinkFilter.value = previousFilter;
    }
  }

  function renderGallery(entries) {
    const withPhotos = entries.filter((e) => e.photo);
    const drinkFilter = galleryDrinkFilter.value;
    const dateFilter = galleryDateFilter.value;
    const sortDir = gallerySort.value;

    let filtered = withPhotos.filter((e) => {
      if (drinkFilter && (e.drink || "Bier") !== drinkFilter) return false;
      if (dateFilter && localDateKey(new Date(e.timestamp)) !== dateFilter) return false;
      return true;
    });

    filtered = filtered.sort((a, b) => {
      const diff = new Date(a.timestamp) - new Date(b.timestamp);
      return sortDir === "asc" ? diff : -diff;
    });

    galleryGrid.innerHTML = "";
    galleryEmptyState.hidden = filtered.length > 0;

    filtered.forEach((entry) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gallery-thumb";

      const img = document.createElement("img");
      img.src = entry.photo;
      img.alt = `${entry.drink || "Bier"} am ${formatTimestamp(entry.timestamp)}`;
      btn.appendChild(img);

      const badge = document.createElement("span");
      badge.className = "gallery-thumb-badge";
      badge.textContent = entry.drink || "Bier";
      btn.appendChild(badge);

      btn.addEventListener("click", () => openLightbox(entry));
      galleryGrid.appendChild(btn);
    });
  }

  function openLightbox(entry) {
    lightboxImg.src = entry.photo;
    const drinkLabel = entry.size ? `${entry.drink || "Bier"} (${entry.size})` : entry.drink || "Bier";
    lightboxCaption.textContent = `${entry.amount}x ${drinkLabel} · ${formatTimestamp(entry.timestamp)}${entry.note ? " · " + entry.note : ""}`;
    lightbox.hidden = false;
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.src = "";
  }

  function render() {
    const entries = loadEntries();
    const total = entries.reduce((sum, e) => sum + e.amount, 0);
    totalCountEl.textContent = String(total);
    renderStats(entries);
    renderDrinkOptions(entries);
    renderDrinkChips(entries);
    renderSizeChips();
    renderGallery(entries);

    historyList.innerHTML = "";
    emptyState.hidden = entries.length > 0;

    entries
      .slice()
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .forEach((entry) => {
        const li = document.createElement("li");
        li.className = "history-item";

        if (entry.photo) {
          const img = document.createElement("img");
          img.src = entry.photo;
          img.alt = "Foto zum Eintrag";
          li.appendChild(img);
        } else {
          const placeholder = document.createElement("div");
          placeholder.className = "thumb-placeholder";
          placeholder.textContent = "🍺";
          li.appendChild(placeholder);
        }

        const info = document.createElement("div");
        info.className = "history-item-info";

        const amountEl = document.createElement("div");
        amountEl.className = "history-item-amount";
        const unit = entry.drink || "Bier";
        amountEl.textContent = `${entry.amount}x`;
        const drinkBadge = document.createElement("span");
        drinkBadge.className = "history-item-drink";
        drinkBadge.textContent = entry.size ? `${unit} · ${entry.size}` : unit;
        amountEl.appendChild(drinkBadge);
        info.appendChild(amountEl);

        if (entry.note) {
          const noteEl = document.createElement("div");
          noteEl.className = "history-item-note";
          noteEl.textContent = entry.note;
          info.appendChild(noteEl);
        }

        const timeEl = document.createElement("div");
        timeEl.className = "history-item-time";
        timeEl.textContent = formatTimestamp(entry.timestamp);
        info.appendChild(timeEl);

        li.appendChild(info);

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "delete-entry-btn";
        deleteBtn.setAttribute("aria-label", "Eintrag löschen");
        deleteBtn.textContent = "✕";
        deleteBtn.addEventListener("click", () => deleteEntry(entry.id));
        li.appendChild(deleteBtn);

        historyList.appendChild(li);
      });
  }

  function deleteEntry(id) {
    const entries = loadEntries().filter((e) => e.id !== id);
    saveEntries(entries);
    render();
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > MAX_PHOTO_DIMENSION) {
            height = Math.round((height * MAX_PHOTO_DIMENSION) / width);
            width = MAX_PHOTO_DIMENSION;
          } else if (height > MAX_PHOTO_DIMENSION) {
            width = Math.round((width * MAX_PHOTO_DIMENSION) / height);
            height = MAX_PHOTO_DIMENSION;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", PHOTO_QUALITY));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  drinkInput.addEventListener("input", () => renderDrinkChips(loadEntries()));

  photoInput.addEventListener("change", async () => {
    const file = photoInput.files[0];
    if (!file) {
      pendingPhoto = null;
      photoPreview.hidden = true;
      clearPhotoBtn.hidden = true;
      return;
    }
    try {
      pendingPhoto = await resizeImage(file);
      photoPreview.src = pendingPhoto;
      photoPreview.hidden = false;
      clearPhotoBtn.hidden = false;
    } catch (e) {
      alert("Foto konnte nicht verarbeitet werden.");
      pendingPhoto = null;
    }
  });

  clearPhotoBtn.addEventListener("click", () => {
    pendingPhoto = null;
    photoInput.value = "";
    photoPreview.hidden = true;
    clearPhotoBtn.hidden = true;
  });

  startDateInput.addEventListener("change", () => {
    if (!startDateInput.value) {
      startDateInput.value = loadStartDate();
      return;
    }
    saveStartDate(startDateInput.value);
    render();
  });

  decBtn.addEventListener("click", () => {
    const val = Math.max(1, (parseInt(amountInput.value, 10) || 1) - 1);
    amountInput.value = val;
  });

  incBtn.addEventListener("click", () => {
    const val = Math.max(1, (parseInt(amountInput.value, 10) || 1) + 1);
    amountInput.value = val;
  });

  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const amount = Math.max(1, parseInt(amountInput.value, 10) || 1);
    const note = noteInput.value.trim();
    const drink = drinkInput.value.trim() || "Bier";
    const size = sizeInput.value || "";

    const entries = loadEntries();
    entries.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      amount,
      drink,
      size,
      note,
      photo: pendingPhoto,
      timestamp: new Date().toISOString(),
    });

    try {
      saveEntries(entries);
    } catch (e) {
      alert("Speicher ist voll. Das Foto konnte nicht gespeichert werden.");
      return;
    }

    addForm.reset();
    amountInput.value = 1;
    drinkInput.value = "Bier";
    sizeInput.value = "0,5l";
    pendingPhoto = null;
    photoPreview.hidden = true;
    clearPhotoBtn.hidden = true;
    render();
  });

  galleryDrinkFilter.addEventListener("change", () => renderGallery(loadEntries()));
  galleryDateFilter.addEventListener("change", () => renderGallery(loadEntries()));
  gallerySort.addEventListener("change", () => renderGallery(loadEntries()));

  galleryResetBtn.addEventListener("click", () => {
    galleryDrinkFilter.value = "";
    galleryDateFilter.value = "";
    gallerySort.value = "desc";
    renderGallery(loadEntries());
  });

  lightboxClose.addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  const CAPTURE_WIDTH = 900;
  const CAPTURE_HEIGHT = Math.round(CAPTURE_WIDTH * (4 / 3));

  let backStream = null;
  let frontStream = null;
  let cameraMode = null; // "simultaneous" | "sequential"
  let sequentialStep = null; // "back" | "front"
  let bufferedBackCanvas = null;

  function stopStream(stream) {
    if (stream) stream.getTracks().forEach((track) => track.stop());
  }

  function stopCameraStreams() {
    stopStream(backStream);
    stopStream(frontStream);
    backStream = null;
    frontStream = null;
    backVideo.srcObject = null;
    frontVideo.srcObject = null;
  }

  function closeCameraModal() {
    stopCameraStreams();
    cameraModal.hidden = true;
    captureBtn.hidden = true;
    backVideo.hidden = false;
    frontVideo.hidden = false;
    frontVideo.classList.remove("back");
    frontVideo.classList.add("front");
    cameraMode = null;
    sequentialStep = null;
    bufferedBackCanvas = null;
  }

  function drawFrameToCanvas(video) {
    const canvas = document.createElement("canvas");
    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_HEIGHT;
    canvas.getContext("2d").drawImage(video, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    return canvas;
  }

  function drawPipOverlay(ctx, source) {
    const pipWidth = Math.round(CAPTURE_WIDTH * 0.3);
    const pipHeight = Math.round(pipWidth * (4 / 3));
    const margin = 14;
    ctx.save();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.drawImage(source, CAPTURE_WIDTH - pipWidth - margin, margin, pipWidth, pipHeight);
    ctx.strokeRect(CAPTURE_WIDTH - pipWidth - margin, margin, pipWidth, pipHeight);
    ctx.restore();
  }

  function finishCapture(dataUrl) {
    pendingPhoto = dataUrl;
    photoPreview.src = pendingPhoto;
    photoPreview.hidden = false;
    clearPhotoBtn.hidden = false;
    closeCameraModal();
  }

  async function startSequentialFrontStep() {
    if (backVideo.videoWidth) {
      bufferedBackCanvas = drawFrameToCanvas(backVideo);
    }
    stopStream(backStream);
    backStream = null;
    backVideo.srcObject = null;
    backVideo.hidden = true;

    cameraStatus.textContent = "Foto 2/2: Frontkamera - aufnehmen, wenn bereit.";
    captureBtn.textContent = "Foto 2/2 aufnehmen";

    try {
      frontStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" } },
        audio: false,
      });
      frontVideo.srcObject = frontStream;
      frontVideo.classList.remove("front");
      frontVideo.classList.add("back");
      frontVideo.hidden = false;
      sequentialStep = "front";
    } catch (err) {
      cameraStatus.textContent = "Frontkamera nicht verfügbar - nur Rückkamera-Foto wird verwendet.";
      const canvas = bufferedBackCanvas || document.createElement("canvas");
      finishCapture(canvas.toDataURL("image/jpeg", PHOTO_QUALITY));
    }
  }

  function finishSequentialCapture() {
    const canvas = document.createElement("canvas");
    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (bufferedBackCanvas) ctx.drawImage(bufferedBackCanvas, 0, 0);
    if (frontVideo.videoWidth) drawPipOverlay(ctx, frontVideo);
    finishCapture(canvas.toDataURL("image/jpeg", PHOTO_QUALITY));
  }

  function captureSimultaneous() {
    const canvas = document.createElement("canvas");
    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (backVideo.videoWidth) ctx.drawImage(backVideo, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    if (frontVideo.videoWidth) drawPipOverlay(ctx, frontVideo);
    finishCapture(canvas.toDataURL("image/jpeg", PHOTO_QUALITY));
  }

  async function openCameraModal() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Dein Browser unterstützt keinen Kamerazugriff. Bitte normales Foto verwenden.");
      photoInput.click();
      return;
    }

    cameraModal.hidden = false;
    captureBtn.hidden = true;
    captureBtn.textContent = "Foto aufnehmen";
    cameraStatus.textContent = "Kamera wird gestartet...";

    try {
      backStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      backVideo.srcObject = backStream;

      try {
        frontStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "user" } },
          audio: false,
        });
        frontVideo.srcObject = frontStream;
        frontVideo.hidden = false;
        cameraMode = "simultaneous";
        cameraStatus.textContent = "Beide Kameras aktiv. Foto aufnehmen, wenn bereit.";
      } catch (frontErr) {
        // Viele Geräte/Browser (v. a. iOS Safari) erlauben nur eine aktive
        // Kamera gleichzeitig - wir nehmen dann beide Fotos kurz nacheinander auf.
        frontVideo.hidden = true;
        cameraMode = "sequential";
        sequentialStep = "back";
        captureBtn.textContent = "Foto 1/2 aufnehmen";
        cameraStatus.textContent =
          "Dein Gerät erlaubt nur eine Kamera gleichzeitig - Foto 1/2: Rückkamera, aufnehmen wenn bereit.";
      }

      captureBtn.hidden = false;
    } catch (err) {
      cameraStatus.textContent =
        "Kamerazugriff nicht möglich. Bitte stattdessen ein normales Foto auswählen.";
      stopCameraStreams();
      setTimeout(() => {
        closeCameraModal();
        photoInput.click();
      }, 1800);
    }
  }

  function handleCaptureClick() {
    if (cameraMode === "simultaneous") {
      captureSimultaneous();
    } else if (cameraMode === "sequential" && sequentialStep === "back") {
      captureBtn.hidden = true;
      startSequentialFrontStep().finally(() => {
        captureBtn.hidden = false;
      });
    } else if (cameraMode === "sequential" && sequentialStep === "front") {
      finishSequentialCapture();
    }
  }

  dualCameraBtn.addEventListener("click", openCameraModal);
  captureBtn.addEventListener("click", handleCaptureClick);
  cancelCameraBtn.addEventListener("click", closeCameraModal);

  resetBtn.addEventListener("click", () => {
    const input = prompt(
      `Das löscht ALLE Einträge unwiderruflich.\nTippe "${RESET_CONFIRM_WORD}" ein, um zu bestätigen:`
    );
    if (input === null) return;
    if (input.trim().toUpperCase() !== RESET_CONFIRM_WORD) {
      alert("Abgebrochen: Bestätigungswort stimmte nicht überein.");
      return;
    }
    saveEntries([]);
    render();
  });

  render();
})();
