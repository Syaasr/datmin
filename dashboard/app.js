(() => {
  let rules = [];
  let allItems = [];
  let activeCategory = "all";
  const cart = new Set();

  // Pemetaan kategori etalase toko roti
  const CATEGORY_MAP = {
    drink: new Set(["Coffee", "Tea", "Hot chocolate", "Juice", "Coke", "Mineral water", "Smoothies"]),
    bread: new Set(["Bread", "Pastry", "Medialuna", "Baguette", "Toast", "Scandinavian", "Farm house", "Scone", "Muffin"]),
    sweet: new Set(["Cake", "Cookies", "Brownie", "Alfajores", "Truffles", "Fudge", "Jammie dodgers", "Bakewell", "Tiffin", "Vegan mincepie", "Jam"]),
    savory: new Set(["Sandwich", "Soup", "Salad", "Spanish brunch", "Frittata", "Chicken stew", "Tartine", "Hearty & seasonal", "Extra salami or feta", "The nomad", "Keeping it local"]),
  };

  const CATEGORY_LABEL = {
    drink: "Kopi & Minuman",
    bread: "Roti & Pastry",
    sweet: "Kue & Manis",
    savory: "Makanan Gurih",
    other: "Menu Lain",
  };

  // Hasil eksperimen notebook (implementasi from scratch, rata-rata 5 kali pengulangan pada 5.495 transaksi x 81 item)
  const BENCHMARK_DATA = [
    { ms: 0.001, itemsets: 763, apriori: 0.29517, fpgrowth: 0.03117, eclat: 0.00465 },
    { ms: 0.002, itemsets: 430, apriori: 0.20093, fpgrowth: 0.03253, eclat: 0.00365 },
    { ms: 0.003, itemsets: 283, apriori: 0.13124, fpgrowth: 0.02926, eclat: 0.00343 },
    { ms: 0.005, itemsets: 179, apriori: 0.10006, fpgrowth: 0.03005, eclat: 0.00324 },
    { ms: 0.010, itemsets: 99,  apriori: 0.07231, fpgrowth: 0.03028, eclat: 0.00456 },
    { ms: 0.020, itemsets: 48,  apriori: 0.04146, fpgrowth: 0.02876, eclat: 0.00229 },
    { ms: 0.050, itemsets: 24,  apriori: 0.02747, fpgrowth: 0.02749, eclat: 0.00208 },
  ];

  function getCategory(item) {
    for (const [key, set] of Object.entries(CATEGORY_MAP)) {
      if (set.has(item)) return key;
    }
    return "other";
  }

  function showStatus(message, type = "") {
    const el = document.getElementById("statusBanner");
    el.textContent = message;
    el.className = "status-banner" + (type ? ` is-${type}` : "");
    el.hidden = false;
  }

  function clearStatus() {
    const el = document.getElementById("statusBanner");
    el.hidden = true;
    el.textContent = "";
  }

  function splitCSVLine(line) {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur);
    return result;
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = splitCSVLine(lines[0]).map((h) => h.trim());
    const required = ["antecedents", "consequents", "support", "confidence", "lift"];
    if (!required.every((col) => headers.includes(col))) {
      return null;
    }

    const out = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = splitCSVLine(lines[i]);
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = (cols[idx] || "").trim();
      });
      const support = parseFloat(row.support);
      const confidence = parseFloat(row.confidence);
      const lift = parseFloat(row.lift);
      if (
        row.antecedents &&
        row.consequents &&
        !Number.isNaN(support) &&
        !Number.isNaN(confidence) &&
        !Number.isNaN(lift)
      ) {
        out.push({
          antecedents: row.antecedents,
          consequents: row.consequents,
          support,
          confidence,
          lift,
        });
      }
    }
    return out;
  }

  function parseItemSet(str) {
    return str.split(",").map((s) => s.trim()).filter(Boolean);
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // Implementasi recommend() dari notebook Sel 39
  function recommend(itemsInCart, topK = 5, minLift = 1.0) {
    const cartSet = new Set(itemsInCart);
    if (cartSet.size === 0) return [];

    const candidates = [];
    for (const r of rules) {
      const ante = parseItemSet(r.antecedents);
      const cons = parseItemSet(r.consequents);
      const anteInCart = ante.every((item) => cartSet.has(item));
      const consAllInCart = cons.every((item) => cartSet.has(item));

      if (anteInCart && !consAllInCart && r.lift >= minLift) {
        const recItems = cons.filter((item) => !cartSet.has(item)).sort();
        candidates.push({
          rekomendasi: recItems.join(", "),
          items: recItems,
          karena: r.antecedents,
          confidence: r.confidence,
          support: r.support,
          lift: r.lift,
        });
      }
    }

    candidates.sort((a, b) => b.lift - a.lift || b.confidence - a.confidence);

    const seen = new Set();
    const dedup = [];
    for (const c of candidates) {
      if (!seen.has(c.rekomendasi)) {
        seen.add(c.rekomendasi);
        dedup.push(c);
        if (dedup.length >= topK) break;
      }
    }
    return dedup;
  }

  function computeBundling(limit = 10) {
    const pairs = rules
      .filter(
        (r) =>
          parseItemSet(r.antecedents).length === 1 &&
          parseItemSet(r.consequents).length === 1 &&
          r.lift > 1.0
      )
      .sort((a, b) => b.lift - a.lift);

    const seen = new Set();
    const out = [];
    for (const r of pairs) {
      const sorted = [r.antecedents, r.consequents].sort();
      const key = sorted.join(" + ");
      if (!seen.has(key)) {
        seen.add(key);
        out.push({
          pair: key,
          items: sorted,
          support: r.support,
          confidence: r.confidence,
          lift: r.lift,
        });
        if (out.length >= limit) break;
      }
    }
    return out;
  }

  function loadRules(data, sourceLabel) {
    rules = data.slice().sort((a, b) => b.lift - a.lift);

    const itemSet = new Set();
    for (const r of rules) {
      parseItemSet(r.antecedents).forEach((i) => itemSet.add(i));
      parseItemSet(r.consequents).forEach((i) => itemSet.add(i));
    }
    allItems = Array.from(itemSet).sort();

    const positiveCount = rules.filter((r) => r.lift > 1).length;
    const top = rules[0];

    document.getElementById("kpiTotal").textContent = rules.length;
    document.getElementById("kpiSource").textContent = sourceLabel;
    document.getElementById("kpiPositive").textContent = positiveCount;
    document.getElementById("kpiItems").textContent = allItems.length;
    document.getElementById("kpiMaxLift").textContent = top ? `${top.lift.toFixed(2)}×` : "-";
    document.getElementById("kpiTopRule").textContent = top
      ? `${top.antecedents} -> ${top.consequents}`
      : "Belum ada aturan";

    syncCartViews();
    renderBundling();
    renderRulesTable();
  }

  function renderItemPicker() {
    const query = document.getElementById("itemSearch").value.trim().toLowerCase();
    const picker = document.getElementById("itemPicker");
    picker.innerHTML = "";

    const filtered = allItems.filter((item) => {
      if (activeCategory !== "all" && getCategory(item) !== activeCategory) return false;
      if (query && !item.toLowerCase().includes(query)) return false;
      return true;
    });

    if (filtered.length === 0) {
      picker.innerHTML = '<span class="muted">Tidak ada menu yang cocok.</span>';
      return;
    }

    for (const item of filtered) {
      const btn = document.createElement("button");
      btn.type = "button";
      const isSelected = cart.has(item);
      const catKey = getCategory(item);
      btn.className = "item-btn" + (isSelected ? " selected" : "");
      btn.setAttribute("aria-pressed", String(isSelected));
      btn.innerHTML = `
        <span>${escapeHTML(item)}</span>
        <span class="item-btn-cat">${CATEGORY_LABEL[catKey]}</span>`;
      btn.addEventListener("click", () => {
        if (cart.has(item)) cart.delete(item);
        else cart.add(item);
        syncCartViews();
      });
      picker.appendChild(btn);
    }
  }

  function renderCart() {
    const box = document.getElementById("cartBox");
    document.getElementById("cartCount").textContent = `${cart.size} item`;
    box.innerHTML = "";
    if (cart.size === 0) {
      box.innerHTML = '<span class="muted">Belum ada menu dipilih.</span>';
      return;
    }
    for (const item of cart) {
      const tag = document.createElement("span");
      tag.className = "cart-tag";
      tag.textContent = item;

      const rm = document.createElement("button");
      rm.type = "button";
      rm.setAttribute("aria-label", `Hapus ${item} dari pesanan`);
      rm.textContent = "×";
      rm.addEventListener("click", () => {
        cart.delete(item);
        syncCartViews();
      });

      tag.appendChild(rm);
      box.appendChild(tag);
    }
  }

  function renderRecommendations() {
    const container = document.getElementById("recResults");
    const subline = document.getElementById("recSubline");
    const minLift = parseFloat(document.getElementById("recMinLift").value);
    const safeMinLift = Number.isNaN(minLift) ? 1.0 : minLift;
    const topK = Math.max(1, parseInt(document.getElementById("recTopK").value, 10) || 5);

    if (cart.size === 0) {
      subline.textContent = "Menunggu pilihan pesanan";
      container.innerHTML = `
        <div class="empty-block">
          <p class="empty-title">Slip rekomendasi siap digunakan</p>
          <p class="muted">Pilih menu dari etalase di sebelah kiri untuk melihat produk pendamping dengan nilai lift tertinggi.</p>
        </div>`;
      return;
    }

    const recs = recommend(Array.from(cart), topK, safeMinLift);
    subline.textContent = `${recs.length} saran pendamping untuk pesanan ini`;

    if (recs.length === 0) {
      container.innerHTML = `
        <div class="empty-block">
          <p class="empty-title">Tidak ada saran dengan lift &ge; ${safeMinLift.toFixed(1)}</p>
          <p class="muted">Menu yang sangat populer (seperti Coffee atau Bread) jarang memiliki asosiasi positif sebagai pesanan tunggal. Tambahkan menu lain atau turunkan batas Min. lift.</p>
        </div>`;
      return;
    }

    container.innerHTML = "";
    for (const r of recs) {
      const row = document.createElement("div");
      row.className = "rec-row";

      const pct = Math.min(100, r.confidence * 100);
      row.innerHTML = `
        <div class="rec-row-top">
          <span class="rec-title">${escapeHTML(r.rekomendasi)}</span>
          <div class="rec-actions">
            <span class="tag-lift">${r.lift.toFixed(2)}× lift</span>
            <button class="btn-add-rec" type="button">+ Tambah</button>
          </div>
        </div>
        <div class="rec-meta">
          <span>Pasangan dari: ${escapeHTML(r.karena)}</span>
          <span class="mono">Conf ${pct.toFixed(1)}% · Supp ${(r.support * 100).toFixed(2)}%</span>
        </div>
        <div class="meter" aria-hidden="true">
          <div class="meter-fill" style="width: ${pct.toFixed(1)}%"></div>
        </div>`;

      row.querySelector(".btn-add-rec").addEventListener("click", () => {
        r.items.forEach((item) => cart.add(item));
        syncCartViews();
      });

      container.appendChild(row);
    }
  }

  function syncCartViews() {
    renderItemPicker();
    renderCart();
    renderRecommendations();
  }

  function renderBundling() {
    const list = document.getElementById("bundlingList");
    const bundles = computeBundling(10);
    list.innerHTML = "";

    if (bundles.length === 0) {
      list.innerHTML = '<p class="muted">Tidak ada kandidat bundling dengan lift &gt; 1.</p>';
      return;
    }

    bundles.forEach((b, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "bundle-row";
      btn.innerHTML = `
        <span class="bundle-rank">${String(idx + 1).padStart(2, "0")}</span>
        <div class="bundle-main">
          <div class="bundle-pair">${escapeHTML(b.pair)}</div>
          <div class="bundle-stats mono">
            <span>Conf ${(b.confidence * 100).toFixed(1)}%</span>
            <span>Supp ${(b.support * 100).toFixed(2)}%</span>
          </div>
        </div>
        <span class="tag-lift">${b.lift.toFixed(2)}×</span>`;

      btn.addEventListener("click", () => {
        cart.clear();
        cart.add(b.items[0]);
        activeCategory = "all";
        updateCategoryButtons();
        syncCartViews();
        activateTab("recommender");
      });

      list.appendChild(btn);
    });
  }

  function renderRulesTable() {
    const q = document.getElementById("ruleSearch").value.trim().toLowerCase();
    const minConf = parseFloat(document.getElementById("filterConf").value);
    const minLift = parseFloat(document.getElementById("filterLift").value);
    const sortBy = document.getElementById("sortBy").value;

    document.getElementById("valConf").textContent = minConf.toFixed(2);
    document.getElementById("valLift").textContent = minLift.toFixed(2);

    const filtered = rules
      .filter((r) => {
        if (r.confidence < minConf || r.lift < minLift) return false;
        if (!q) return true;
        return (
          r.antecedents.toLowerCase().includes(q) ||
          r.consequents.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b[sortBy] - a[sortBy]);

    document.getElementById("rulesCountLabel").textContent = `${filtered.length} / ${rules.length} aturan`;

    const tbody = document.getElementById("rulesTableBody");
    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="muted">Tidak ada aturan yang memenuhi filter.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered
      .map(
        (r) => `
        <tr>
          <td>${escapeHTML(r.antecedents)}</td>
          <td>${escapeHTML(r.consequents)}</td>
          <td class="num">${(r.support * 100).toFixed(2)}%</td>
          <td class="num">${(r.confidence * 100).toFixed(1)}%</td>
          <td class="num"><strong>${r.lift.toFixed(3)}</strong></td>
        </tr>`
      )
      .join("");
  }

  function renderBenchmark() {
    const visual = document.getElementById("benchmarkVisual");
    const tbody = document.getElementById("benchmarkBody");
    const maxTime = Math.max(
      ...BENCHMARK_DATA.flatMap((d) => [d.apriori, d.fpgrowth, d.eclat])
    );
    const wins = { Apriori: 0, "FP-Growth": 0, ECLAT: 0 };

    visual.innerHTML = BENCHMARK_DATA.map((row) => {
      const wAp = ((row.apriori / maxTime) * 100).toFixed(1);
      const wFp = ((row.fpgrowth / maxTime) * 100).toFixed(1);
      const wEc = ((row.eclat / maxTime) * 100).toFixed(1);
      return `
        <div class="bench-group">
          <div class="bench-ms">supp ${row.ms.toFixed(3)}</div>
          <div class="bench-bars">
            <div class="bench-bar-line">
              <div class="bench-track"><div class="bench-fill apriori" style="width:${wAp}%"></div></div>
              <span class="bench-val">${row.apriori.toFixed(4)}s</span>
            </div>
            <div class="bench-bar-line">
              <div class="bench-track"><div class="bench-fill fp" style="width:${wFp}%"></div></div>
              <span class="bench-val">${row.fpgrowth.toFixed(4)}s</span>
            </div>
            <div class="bench-bar-line">
              <div class="bench-track"><div class="bench-fill eclat" style="width:${wEc}%"></div></div>
              <span class="bench-val">${row.eclat.toFixed(4)}s</span>
            </div>
          </div>
        </div>`;
    }).join("");

    tbody.innerHTML = BENCHMARK_DATA.map((row) => {
      const minVal = Math.min(row.apriori, row.fpgrowth, row.eclat);
      const winner =
        row.eclat === minVal ? "ECLAT" : row.apriori === minVal ? "Apriori" : "FP-Growth";
      wins[winner]++;

      return `
        <tr>
          <td class="num">${row.ms.toFixed(3)}</td>
          <td class="num">${row.itemsets}</td>
          <td class="num ${winner === "Apriori" ? "best-time" : ""}">${row.apriori.toFixed(5)}</td>
          <td class="num ${winner === "FP-Growth" ? "best-time" : ""}">${row.fpgrowth.toFixed(5)}</td>
          <td class="num ${winner === "ECLAT" ? "best-time" : ""}">${row.eclat.toFixed(5)}</td>
          <td><span class="winner-tag">${winner}</span></td>
        </tr>`;
    }).join("");

    document.getElementById("benchSummary").innerHTML = `
      <strong>Ringkasan eksperimen (from scratch):</strong>
      ECLAT tercepat pada <strong>${wins.ECLAT} dari ${BENCHMARK_DATA.length}</strong> nilai <code class="mono">min_support</code>,
      diikuti FP-Growth (hingga ~9,5× lebih cepat dari Apriori pada <code class="mono">min_support=0.001</code>),
      sementara Apriori paling lambat karena pemindaian transaksi berulang di tiap level kandidat.
    `;
  }

  function updateCategoryButtons() {
    document.querySelectorAll(".cat-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.cat === activeCategory);
    });
  }

  document.querySelectorAll(".cat-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      updateCategoryButtons();
      renderItemPicker();
    });
  });

  // Tab navigation with keyboard support
  const tabButtons = Array.from(document.querySelectorAll(".tab"));

  function activateTab(tabName) {
    tabButtons.forEach((btn) => {
      const isTarget = btn.dataset.tab === tabName;
      btn.classList.toggle("active", isTarget);
      btn.setAttribute("aria-selected", String(isTarget));
      btn.tabIndex = isTarget ? 0 : -1;
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.id === `tab-${tabName}`);
    });
  }

  tabButtons.forEach((btn, idx) => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const nextIdx =
          e.key === "ArrowRight"
            ? (idx + 1) % tabButtons.length
            : (idx - 1 + tabButtons.length) % tabButtons.length;
        tabButtons[nextIdx].focus();
        activateTab(tabButtons[nextIdx].dataset.tab);
      }
    });
  });

  document.getElementById("itemSearch").addEventListener("input", renderItemPicker);
  document.getElementById("recMinLift").addEventListener("input", renderRecommendations);
  document.getElementById("recTopK").addEventListener("input", renderRecommendations);

  document.getElementById("clearCart").addEventListener("click", () => {
    cart.clear();
    syncCartViews();
  });

  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      cart.clear();
      btn.dataset.preset.split(",").forEach((item) => {
        if (allItems.includes(item)) cart.add(item);
      });
      syncCartViews();
    });
  });

  ["ruleSearch", "filterConf", "filterLift", "sortBy"].forEach((id) => {
    document.getElementById(id).addEventListener("input", renderRulesTable);
    document.getElementById(id).addEventListener("change", renderRulesTable);
  });

  document.querySelector('label[for="csvUpload"]').addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      document.getElementById("csvUpload").click();
    }
  });

  document.getElementById("csvUpload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCSV(reader.result);
      if (parsed === null) {
        showStatus(
          "Format CSV tidak valid. Pastikan memiliki kolom: antecedents, consequents, support, confidence, lift.",
          "error"
        );
        return;
      }
      if (parsed.length === 0) {
        showStatus("File CSV tidak memuat baris aturan yang valid.", "error");
        return;
      }
      cart.clear();
      loadRules(parsed, file.name);
      showStatus(`Berhasil memuat ${parsed.length} aturan dari ${file.name}.`, "success");
    };
    reader.onerror = () => {
      showStatus("Gagal membaca file CSV. Silakan coba lagi.", "error");
    };
    reader.readAsText(file);
  });

  // Boot
  renderBenchmark();
  clearStatus();
  fetch("../association_rules.csv")
    .then((res) => {
      if (!res.ok) throw new Error("HTTP error");
      return res.text();
    })
    .then((text) => {
      const parsed = parseCSV(text);
      if (!parsed || parsed.length === 0) throw new Error("Empty CSV");
      loadRules(parsed, "association_rules.csv");
    })
    .catch(() => {
      if (Array.isArray(window.EMBEDDED_RULES)) {
        loadRules(window.EMBEDDED_RULES, "association_rules.csv (lokal)");
      } else {
        showStatus("Data aturan asosiasi tidak dapat dimuat.", "error");
      }
    });
})();
