// ==UserScript==
// @name         Pinato
// @name:ru      Pinato
// @namespace    https://github.com/vanja-san/JS-UserScripts/main/scripts/Pinato
// @version      1.23
// @description  Opens Pinterest pins in a clean modal overlay.
// @description:ru  Открывайте пины в Pinterest в чистом модульном оверлее.
// @author       vanja-san
// @icon         https://www.google.com/s2/favicons?sz=64&domain=pinterest.com
// @match        *://*.pinterest.com/*
// @grant        GM_addStyle
// @run-at       document-start
// ==/UserScript==

(() => {
  'use strict';

  // ─── Styles ───
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
      max-width: 95vw;
      max-height: 95vh;
      width: auto;
      height: auto;
      background: transparent;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.4);
      animation: pm-scaleIn 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.2);
    }
    @keyframes pm-scaleIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .pm-image {
      display: block;
      width: auto;
      height: auto;
      max-width: 95vw;
      max-height: 95vh;
      object-fit: contain;
      background: #181818;
      border-radius: 12px;
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
    .pm-modal:hover .pm-close {
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
    }
    .pm-modal:hover .pm-info {
      opacity: 1;
    }
    .pm-info * { pointer-events: auto; }

    .pm-text {
      flex: 1 1 auto;
      min-width: 0;
    }
    .pm-title {
      font-size: 18px;
      font-weight: 700;
      line-height: 1.3;
      margin: 0 0 2px 0;
      color: #fff;
      text-shadow: 0 1px 4px rgba(0,0,0,0.3);
      word-break: break-word;
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
      .pm-image {
        max-width: 100vw;
        max-height: 100vh;
        border-radius: 0;
      }
      .pm-info {
        border-radius: 0;
        padding: 16px 18px 20px;
        opacity: 1;
        pointer-events: auto;
        flex-wrap: wrap;
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

  // ─── Helpers ───
  const escapeHtml = text => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };

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

  const findImage = link => {
    let img = link.querySelector('img');
    if (img) return img;

    const containerSelectors = ['[data-testid="pin"]', '.Pin', '.Grid__Pin', '.pinWrapper'];
    const container = findClosest(link, containerSelectors);
    if (container) {
      img = container.querySelector('img');
      if (img) return img;
    }

    let el = link.parentElement;
    let level = 0;
    while (el && el !== document.body && level < 10) {
      img = el.querySelector('img');
      if (img) return img;
      el = el.parentElement;
      level++;
    }

    const parent = link.parentElement;
    if (parent) {
      img = parent.querySelector('img');
      if (img) return img;
      const grandparent = parent.parentElement;
      if (grandparent) {
        const siblings = grandparent.querySelectorAll('img');
        for (const sib of siblings) {
          if (sib.closest('a[href*="/pin/"]') === link) {
            return sib;
          }
        }
      }
    }

    return null;
  };

  const getPinData = link => {
    const data = {
      imageUrl: '',
      title: '',
      description: '',
      pinUrl: link.href,
    };

    const img = findImage(link);
    if (img) data.imageUrl = getBestImageUrl(img);

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
      if (alt && !alt.startsWith('Пин содержит это изображение')) {
        title = alt;
      }
    }

    if (!title) {
      const linkText = link.textContent.trim();
      if (linkText && !linkText.startsWith('Пин содержит это изображение')) {
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

  // ─── Modal management ───
  const createModal = data => {
    const old = document.querySelector('.pm-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.className = 'pm-overlay';
    const escapedTitle = escapeHtml(data.title);
    const escapedDescription = data.description ? escapeHtml(data.description) : '';
    const escapedImageUrl = escapeHtml(data.imageUrl || '');
    const escapedPinUrl = escapeHtml(data.pinUrl || '#');

    overlay.innerHTML = `
      <div class="pm-modal" role="dialog" aria-modal="true">
        <button class="pm-close" type="button">✕</button>
        <img class="pm-image" alt="${escapedTitle}" src="${escapedImageUrl}" crossorigin="anonymous" referrerpolicy="no-referrer">
        <div class="pm-loader">Loading...</div>
        <div class="pm-info">
          <div class="pm-text">
            <div class="pm-title">${escapedTitle}</div>
            ${escapedDescription ? `<div class="pm-description">${escapedDescription}</div>` : ''}
          </div>
          <div class="pm-actions">
            <a class="pm-button" href="${escapedPinUrl}" target="_blank" rel="noopener noreferrer" data-pm-ignore="true">Open on Pinterest</a>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const modal = overlay.querySelector('.pm-modal');
    const closeBtn = overlay.querySelector('.pm-close');
    const img = overlay.querySelector('.pm-image');
    const loader = overlay.querySelector('.pm-loader');

    if (data.imageUrl) {
      img.src = data.imageUrl;
      img.onload = () => {
        loader.style.display = 'none';
      };
      img.onerror = () => {
        loader.style.display = 'none';
        if (img.crossOrigin === 'anonymous') {
          img.removeAttribute('crossorigin');
          img.src = data.imageUrl;
          img.onerror = () => {
            showError(modal, 'Image failed to load');
          };
        } else {
          showError(modal, 'Image failed to load');
        }
      };
    } else {
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

    closeBtn.addEventListener('click', closeModal);

    document.body.classList.add('pm-no-scroll');
    overlay.classList.add('active');
    modal.focus();
  };

  // ─── Click interceptor ───
  document.addEventListener(
    'click',
    e => {
      const link = e.target.closest('a[href*="/pin/"]');
      if (!link) return;
      if (link.closest('.pm-overlay') || link.dataset.pmIgnore === 'true') return;
      if (e.ctrlKey || e.metaKey || e.button === 1) return;

      e.preventDefault();
      e.stopPropagation();

      const data = getPinData(link);
      createModal(data);
    },
    true,
  );
})();