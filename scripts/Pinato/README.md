# Pinato

![Tampermonkey](https://img.shields.io/badge/Tampermonkey-✔-lightgreen?logo=tampermonkey) ![Violentmonkey](https://img.shields.io/badge/Violentmonkey-✔-lightgreen?logo=violentmonkey) ![Greasemonkey](https://img.shields.io/badge/Greasemonkey-✔-lightgreen?logo=greasemonkey)

> Opens Pinterest pins in a floating modal window directly on the page, without navigating to the pin page.

[![Russian version](https://img.shields.io/badge/Русская_версия-README.ru.md-blue?style=flat-square)](README.ru.md)

---

## 📸 Screenshots

*(coming soon)*

---

## ✨ Features

- **Instant preview** – click a pin to open it in a beautiful modal window.
- **Authentic Pinterest style** – responsive design, blur effects, and translucent panels that match the original interface.
- **Automatic data extraction** – the script finds the pin title, description, and the highest-quality image.
- **Convenient controls**:
  - Close button `✕` in the top‑right corner (appears on hover).
  - Bottom info panel with title, description, and an **“Open on Pinterest”** button (appears on hover).
  - Close by clicking the backdrop or pressing `Esc`.
- **Responsive** – works correctly on mobile devices (panels are always visible).
- **Lightweight** – no external dependencies, only works on Pinterest.

---

## 🚀 Installation

1. Install a userscript manager:
   - [Tampermonkey](https://www.tampermonkey.net/) (recommended)
   - [Violentmonkey](https://violentmonkey.github.io/)
   - [Greasemonkey](https://www.greasespot.net/) (may require adaptation)

2. Click the link below to install the script:  
   👉 **[Install Pinato](https://raw.githubusercontent.com/vanja-san/JS-UserScripts/main/scripts/Pinato/pinato.user.js)**

   Alternatively, create a new script manually and paste the contents of [this file](pinato.user.js).

---

## 🧑‍💻 Usage

1. Go to any Pinterest site (e.g., `pinterest.com`).
2. Scroll through the feed and click any pin.
3. Instead of navigating to the pin page, a modal window with the image and info will open.
4. To close:
   - click on the darkened backdrop,
   - press `Esc`,
   - click the `✕` button in the top‑right corner (appears on hover).

---

## ⚙️ Configuration

The script does not require additional configuration. All styles and logic are built‑in.

If you wish, you can change:
- The color of the “Open on Pinterest” button (default `#e60023`).
- The blur intensity of the panel (in CSS `backdrop-filter: blur(16px)`).
- The animation duration.

---

## 🛠 Technical details

- **Language:** JavaScript (ES6+)
- **API:** Uses only standard DOM API + `GM_addStyle` for style injection.
- **Compatibility:** Pinterest (all regional domains).
- **Performance:** Minimal impact, click handler only targets links pointing to `/pin/`.

---

## 📄 License

This project is distributed under the **MIT** license.  
You are free to use, modify, and distribute the script.

---

## 🤝 Contributing

If you find a bug or want to suggest an improvement:
- Create an Issue
- Or submit a Pull Request with your changes.

---

## ⭐ Support

If you like the script, please star the repository – it helps others discover it.

---