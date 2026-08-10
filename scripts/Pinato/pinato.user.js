// ==UserScript==
// @name         Pinato
// @name:ru      Pinato
// @namespace    https://github.com/vanja-san/JS-UserScripts/main/scripts/Pinato
// @version      1.38
// @description  Opens Pinterest image pins in a full‑screen modal with upgraded quality. Video pins are ignored.
// @description:ru  Открывает пины-изображения в полноэкранном модальном окне с улучшенным качеством. Видео-пины игнорируются.
// @author       vanja-san
// @icon         https://www.google.com/s2/favicons?sz=64&domain=pinterest.com
// @match        *://*.pinterest.com/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  GM_addStyle(`
    .pm-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 999999;
      display: none;
      align-items: center;
      justify-content: center;
      animation: pm-fadeIn 0.2s ease;
    }
    .pm-overlay.active { display: flex; }
    @keyframes pm-fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .pm-modal {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
      animation: pm-scaleIn 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.2);
      max-width: 95vw;
      max-height: 95vh;
      width: auto;
      height: auto;
    }
    @keyframes pm-scaleIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .pm-image-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: 95vw;
      max-height: 95vh;
      width: auto;
      height: auto;
    }

    .pm-image {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      background: #181818;
      border-radius: 12px;
      display: block;
    }

    .pm-close {
      position: absolute;
      top: 16px;
      right: 16px;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      padding: 0;
      font-size: 18px;
      text-align: center;
      color: #fff;
      cursor: pointer;
      z-index: 10;
      transition: opacity 0.25s ease, background 0.15s;
      font-weight: 300;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      opacity: 0;
      pointer-events: none;
    }
    .pm-image-wrapper:hover .pm-close {
      opacity: 1;
      pointer-events: auto;
    }
    .pm-close:hover {
      background: rgba(255, 77, 64, 0.3);
    }

    .pm-info {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 20px 24px 24px;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      color: #fff;
      border-radius: 0 0 12px 12px;
      box-sizing: border-box;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 8px 16px;
      max-height: 40%;
      overflow: hidden;
    }
    .pm-image-wrapper:hover .pm-info {
      opacity: 1;
    }
    .pm-info * { pointer-events: auto; }

    .pm-text {
      flex: 1 1 auto;
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
    }
    .pm-title {
      font-size: 18px;
      font-weight: 700;
      line-height: 1.3;
      margin: 0 0 2px 0;
      color: #fff;
      text-shadow: 0 1px 4px rgba(0,0,0,0.3);
      word-break: break-word;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      max-height: 2.6em;
    }
    .pm-description {
      font-size: 14px;
      line-height: 1.4;
      margin: 0;
      color: rgba(255,255,255,0.9);
      text-shadow: 0 1px 4px rgba(0,0,0,0.3);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 100%;
    }

    .pm-actions {
      flex: 0 0 auto;
      margin-left: auto;
      align-self: center;
    }
    .pm-button {
      display: inline-block;
      padding: 6px 16px;
      background: #e60023;
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      border-radius: 24px;
      text-decoration: none;
      transition: background 0.15s;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .pm-button:hover { background: #ad081b; }

    @media (max-width: 640px) {
      .pm-modal {
        max-width: 100vw;
        max-height: 100vh;
        border-radius: 0;
        box-shadow: none;
      }
      .pm-image-wrapper {
        max-width: 100vw;
        max-height: 100vh;
        width: 100%;
        height: 100%;
      }
      .pm-image {
        border-radius: 0;
        max-width: 100%;
        max-height: 100%;
      }
      .pm-info {
        border-radius: 0;
        padding: 16px 18px 20px;
        opacity: 1;
        pointer-events: auto;
        flex-wrap: wrap;
        max-height: 30%;
      }
      .pm-close {
        top: 8px;
        right: 12px;
        width: 36px;
        height: 36px;
        font-size: 22px;
        line-height: 36px;
        opacity: 1;
        pointer-events: auto;
      }
      .pm-actions {
        margin-left: 0;
        width: 100%;
        text-align: right;
      }
    }

    body.pm-no-scroll { overflow: hidden !important; }

    .pm-loader {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 14px;
      background: rgba(0,0,0,0.5);
      border-radius: 12px;
      z-index: 1;
      pointer-events: none;
    }
    .pm-loader::after {
      content: '';
      width: 24px;
      height: 24px;
      margin-left: 12px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: pm-spin 0.8s linear infinite;
    }
    @keyframes pm-spin {
      to { transform: rotate(360deg); }
    }
  `);

  const escapeHtml = text => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

  // ─── Upgrade image URL to original quality ──────────────────────

  const getUpgradedUrls = url => {
    if (!url || !url.includes('i.pinimg.com')) return [url];

    // Find size pattern like /236x/, /474x/, /736x/, etc.
    const sizeMatch = url.match(/\/(\d+x)\//);
    if (!sizeMatch) return [url];

    const size = sizeMatch[1];
    // Replace size segment with /originals/
    const baseUrl = url.replace(`/${size}/`, '/originals/');
    // Remove query parameters
    const cleanBase = baseUrl.split('?')[0];

    // Generate possible extensions
    const extensions = ['.jpg', '.png', '.webp'];
    const urls = [];

    // Original with current extension (keep as is)
    urls.push(cleanBase);

    // Try other extensions
    const baseWithoutExt = cleanBase.replace(/\.[^.]+$/, '');
    for (const ext of extensions) {
      const newUrl = baseWithoutExt + ext;
      if (newUrl !== cleanBase) urls.push(newUrl);
    }

    // Fallback to the original URL as last resort
    urls.push(url);

    return urls;
  };

  // ─── Helpers ──────────────────────────────────────────────────────

  const getBestImageUrl = img => {
    if (!img) return '';
    if (img.srcset) {
      const parts = img.srcset.split(',').map(s => s.trim().split(' '));
      const best = parts.reduce(
        (acc, [url, size]) => {
          const s = Number(size) || 0;
          return s > acc.size ? { url, size: s } : acc;
        },
        { url: '', size: 0 }
      );
      if (best.url) return best.url;
    }
    return img.dataset?.src || img.src || '';
  };

  const findClosest = (element, selectors) => {
    for (const sel of selectors) {
      const found = element.closest(sel);
      if (found) return found;
    }
    return null;
  };

  const isVideoPin = link => {
    if (link.querySelector('video')) return true;
    const containerSelectors = ['[data-testid="pin"]', '.Pin', '.Grid__Pin', '.pinWrapper'];
    const container = findClosest(link, containerSelectors);
    if (container && container.querySelector('video')) return true;
    return false;
  };

  const isJunkText = text => {
    if (!text) return true;
    const clean = text.trim();
    if (/^video::cue/.test(clean)) return true;
    if (/\{.*\}/.test(clean) && /:\s*[^;]+;/.test(clean)) return true;
    if (/color\s*:\s*white/.test(clean)) return true;
    return false;
  };

  const getPinData = link => {
    const data = {
      imageUrl: '',
      title: '',
      description: '',
      pinUrl: link.href,
      urls: [],
    };

    let img = link.querySelector('img');
    if (!img) {
      const containerSelectors = ['[data-testid="pin"]', '.Pin', '.Grid__Pin', '.pinWrapper'];
      const container = findClosest(link, containerSelectors);
      if (container) img = container.querySelector('img');
    }
    if (img) {
      const rawUrl = getBestImageUrl(img);
      if (rawUrl) {
        data.imageUrl = rawUrl;
        data.urls = getUpgradedUrls(rawUrl);
      }
    }

    const containerSelectors = ['[data-testid="pin"]', '.Pin', '.Grid__Pin', '.pinWrapper'];
    const container = findClosest(link, containerSelectors) || link.parentElement;

    const pinPath = new URL(link.href).pathname;
    const titleBlocks = document.querySelectorAll('[data-test-id="pinrep-footer-organic-title"]');
    let title = '';
    for (const block of titleBlocks) {
      const linkInside = block.querySelector('a[href]');
      if (!linkInside) continue;
      const blockPath = new URL(linkInside.href, window.location.origin).pathname;
      if (pinPath === blockPath) {
        title = linkInside.textContent.trim();
        break;
      }
    }

    if (!title && container) {
      const titleSelectors = [
        '[data-test-id="pinrep-footer-organic-title"] a',
        '.PinTitle',
        '.title',
        '.xhp-title',
        '[data-testid="pin-title"]',
        '.wyEmcc a',
        '.RichPin__title a',
        '.v6LvO6 a'
      ];
      for (const sel of titleSelectors) {
        const el = container.querySelector(sel);
        if (el) {
          title = el.textContent.trim();
          break;
        }
      }
    }

    if (!title && img) {
      const alt = img.alt;
      if (alt && !isJunkText(alt)) {
        title = alt;
      }
    }

    if (!title) {
      const linkText = link.textContent.trim();
      if (linkText && !isJunkText(linkText)) {
        title = linkText;
      }
    }

    data.title = title || 'Untitled';

    if (container) {
      const descSelectors = [
        '[data-testid="pin-description"]',
        '.PinDescription',
        '.description',
        '.xhp-description',
      ];
      for (const sel of descSelectors) {
        const el = container.querySelector(sel);
        if (el) {
          data.description = el.textContent.trim();
          break;
        }
      }
    }

    return data;
  };

  const showError = (modal, message) => {
    const el = document.createElement('div');
    el.style.cssText =
      'position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#fff; font-size:16px; text-align:center;';
    el.textContent = message;
    modal.appendChild(el);
    modal.style.width = 'min(90vw, 400px)';
    modal.style.height = '300px';
    modal.style.background = '#222';
  };

  const createModal = data => {
    const old = document.querySelector('.pm-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.className = 'pm-overlay';
    const escapedTitle = escapeHtml(data.title);
    const escapedDescription = data.description ? escapeHtml(data.description) : '';
    const escapedPinUrl = escapeHtml(data.pinUrl || '#');

    // Use the first upgraded URL or fallback to original
    const imageUrls = data.urls && data.urls.length ? data.urls : [data.imageUrl];
    const firstUrl = imageUrls[0] || '';

    let mediaHtml = '';

    if (firstUrl) {
      mediaHtml = `
        <div class="pm-image-wrapper">
          <img class="pm-image" alt="${escapedTitle}" src="${escapeHtml(firstUrl)}" crossorigin="anonymous" referrerpolicy="no-referrer">
          <button class="pm-close" type="button">✕</button>
          <div class="pm-info">
            <div class="pm-text">
              <div class="pm-title">${escapedTitle}</div>
              ${escapedDescription ? `<div class="pm-description">${escapedDescription}</div>` : ''}
            </div>
            <div class="pm-actions">
              <a class="pm-button" href="${escapedPinUrl}" target="_blank" rel="noopener noreferrer" data-pm-ignore="true">Open on Pinterest</a>
            </div>
          </div>
          <div class="pm-loader">Loading...</div>
        </div>
      `;
    } else {
      mediaHtml = `
        <div style="display:flex;align-items:center;justify-content:center;background:#222;color:#fff;font-size:16px;width:400px;height:300px;text-align:center;padding:20px;border-radius:12px;">
          <div>
            <div>Image not available</div>
            <a href="${escapedPinUrl}" target="_blank" rel="noopener noreferrer" style="color:#e60023;text-decoration:underline;display:inline-block;margin-top:12px;">Open on Pinterest</a>
          </div>
        </div>
      `;
    }

    overlay.innerHTML = `
      <div class="pm-modal" role="dialog" aria-modal="true">
        ${mediaHtml}
      </div>
    `;

    document.body.appendChild(overlay);

    const modal = overlay.querySelector('.pm-modal');
    const closeBtn = overlay.querySelector('.pm-close');
    const loader = overlay.querySelector('.pm-loader');
    const img = overlay.querySelector('.pm-image');

    if (img && firstUrl) {
      let urlIndex = 0;
      const tryNextUrl = () => {
        urlIndex++;
        if (urlIndex < imageUrls.length) {
          const nextUrl = imageUrls[urlIndex];
          img.src = nextUrl;
        } else {
          loader.style.display = 'none';
          showError(modal, 'Image failed to load');
        }
      };

      img.onload = () => {
        loader.style.display = 'none';
        // After image loads, the wrapper will adjust its size automatically
      };
      img.onerror = () => {
        tryNextUrl();
      };
      // Start loading
      img.src = firstUrl;
    } else if (img) {
      loader.style.display = 'none';
      showError(modal, 'Image not found');
    }

    const closeModal = () => {
      overlay.classList.remove('active');
      document.body.classList.remove('pm-no-scroll');
      setTimeout(() => overlay.remove(), 300);
    };

    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    document.body.classList.add('pm-no-scroll');
    overlay.classList.add('active');
    modal.focus();
  };

  // ─── Click interceptor ──────────────────────────────────────────

  document.addEventListener(
    'click',
    e => {
      const link = e.target.closest('a[href*="/pin/"]');

      // If click is inside our own modal, ignore
      if (e.target.closest('.pm-overlay')) return;

      // If click is inside Pinterest's closeup (video/image viewer), ignore
      if (e.target.closest('[data-test-id="closeup-visual-container"]')) return;

      if (!link) return;
      if (link.dataset.pmIgnore === 'true') return;
      if (e.ctrlKey || e.metaKey || e.button === 1) return;

      // Check if this pin is a video — if yes, ignore it (let it open normally)
      if (isVideoPin(link)) return;

      e.preventDefault();
      e.stopPropagation();

      const data = getPinData(link);
      createModal(data);
    },
    true,
  );
})();