(function () {
  "use strict";

  const STORAGE_KEY = "biercounter.entries";
  const MAX_PHOTO_DIMENSION = 800;
  const PHOTO_QUALITY = 0.7;

  const totalCountEl = document.getElementById("totalCount");
  const addForm = document.getElementById("addForm");
  const amountInput = document.getElementById("amount");
  const decBtn = document.getElementById("decBtn");
  const incBtn = document.getElementById("incBtn");
  const noteInput = document.getElementById("note");
  const photoInput = document.getElementById("photo");
  const photoPreview = document.getElementById("photoPreview");
  const clearPhotoBtn = document.getElementById("clearPhotoBtn");
  const historyList = document.getElementById("historyList");
  const emptyState = document.getElementById("emptyState");
  const resetBtn = document.getElementById("resetBtn");

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

  function render() {
    const entries = loadEntries();
    const total = entries.reduce((sum, e) => sum + e.amount, 0);
    totalCountEl.textContent = String(total);

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
        amountEl.textContent = `${entry.amount} ${entry.amount === 1 ? "Bier" : "Biere"}`;
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

    const entries = loadEntries();
    entries.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      amount,
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
    pendingPhoto = null;
    photoPreview.hidden = true;
    clearPhotoBtn.hidden = true;
    render();
  });

  resetBtn.addEventListener("click", () => {
    if (confirm("Wirklich alle Einträge unwiderruflich löschen?")) {
      saveEntries([]);
      render();
    }
  });

  render();
})();
