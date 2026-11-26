# DESIGN.md: Bread Basket Bakery Dashboard

> Reading this as: operational bakery counter dashboard for bakery staff and data-mining reviewers, in an Artisan Bakery Counter style, dial **ENERGY 2 / RHYTHM 2 / MOTION 1**.

## 1. Dials & Levers (Antislop Part 3)
- **ENERGY 2 (Balanced):** Papan kasir *roasted espresso* memberi karakter toko roti yang hangat dan tegas tanpa efek visual berlebihan.
- **RHYTHM 2 (Consistent with intentional breaks):** Pita ringkasan horizontal di bawah header, grid asimetris `1.35fr : 1fr` pada simulasi kasir, daftar 2-kolom untuk paket bundling, dan grafik batang proporsional + tabel untuk benchmark algoritma.
- **MOTION 1 (Hover & press states only):** Transisi warna/border `110ms` dan feedback tekan `translateY(1px)` tanpa animasi berulang atau *scroll-reveal* dekoratif.
- **One focal point per screen:** Slip pesanan & saran upsell di sisi kanan (pada tab utama) menjadi fokus keputusan kasir.
- **One deliberate accent:** *Caramelized crust* (`oklch(0.53 0.145 45)`) dipakai hanya pada tombol aksi utama, indikator tab aktif, dan penanda sorotan terkuat.

## 2. Written Reasons for Every Decision (R-31)
- **Color (R-01, R-29):** 2 warna inti (*roasted espresso* untuk papan header + *flour-linen* untuk latar) dan 1 aksen (*caramelized crust*), plus *herb sage* khusus status positif; dipilih karena merefleksikan material fisik toko roti (kopi, tepung, kulit roti).
- **Theme (R-21):** Tema terang hangat dipilih permanen karena dipakai di lingkungan kasir toko roti siang hari dan memudahkan pembacaan tabel angka serta slip pesanan.
- **Background (R-07):** Latar polos *flour-linen* tanpa pola titik atau grid agar data dan daftar menu tetap fokus dan tidak berisik.
- **Typography (R-06):** `Playfair Display` (display) untuk karakter papan nama/menu toko roti klasik, `Inter` (body) sesuai permintaan pengguna untuk keterbacaan UI & label Bahasa Indonesia, dan `JetBrains Mono` (`tabular-nums`) khusus angka metrik agar kolom numerik sejajar.
- **Layout (R-05, R-20):** Dibangun sekitar tugas utama kasir (memilih menu per kategori etalase dan membaca saran upsell di slip kanan), bukan template sidebar + 4 kotak KPI identik.
- **Spacing & Radius (R-11, R-12):** Skala `4px` dengan jarak rapat di dalam grup (`8px-12px`) dan lega antar bagian (`24px-36px`). Maksimal 2 radius (`3px` tag/bar, `8px` panel/tombol). Tanpa bayangan difus; hierarki dibentuk oleh garis `1px` dan kontras permukaan.
- **Icons (R-04):** Hanya 2 ikon SVG relevan (ikon roti pada brand dan ikon unggah pada tombol Muat CSV), tanpa emoji atau ikon generik.
- **Motion (R-19):** Sesuai dial MOTION 1, hanya respons hover/active/focus di bawah `150ms` dan menghormati `prefers-reduced-motion`.

## 3. Color Tokens (OKLCH)
| Token | Value | Role |
|---|---|---|
| `--color-espresso` | `oklch(0.24 0.028 48)` | Header papan kasir |
| `--color-espresso-fg` | `oklch(0.96 0.012 78)` | Teks di atas header espresso |
| `--color-bg` | `oklch(0.968 0.014 78)` | Latar kertas tepung polos |
| `--color-surface` | `oklch(0.994 0.006 80)` | Permukaan panel & slip kasir |
| `--color-surface-subtle` | `oklch(0.942 0.018 76)` | Strip filter & header tabel |
| `--color-fg` | `oklch(0.23 0.025 48)` | Teks utama (AA >= 4.5:1) |
| `--color-muted` | `oklch(0.45 0.024 55)` | Teks sekunder (AA >= 4.5:1) |
| `--color-border` | `oklch(0.86 0.020 72)` | Garis struktural 1px |
| `--color-accent` | `oklch(0.53 0.145 45)` | Aksen tunggal (*caramelized crust*) |
| `--color-success` | `oklch(0.41 0.105 148)` | Status lift positif & algoritma tercepat |
| `--color-error` | `oklch(0.47 0.155 24)` | Status error validasi CSV |

## 4. Changelog
- `v2.1`: Audit dan penyelarasan penuh dengan `antislop` core + `antislop-ui` (hapus em-dash, hapus dot-grid latar, tambah loading state eksplisit, perbesar target sentuh mobile >= 44px, hapus kicker uppercase monospace).
