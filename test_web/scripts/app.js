/* ========== 个人博客交互逻辑 ========== */

(function () {
  'use strict';

  /* ---------- DOM 元素 ---------- */
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section, .hero');
  const revealElements = document.querySelectorAll('.reveal');
  const checkboxes = document.querySelectorAll('.check-item input[type="checkbox"]');

  /* ---------- 导航栏滚动效果 ---------- */
  function handleScroll() {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  /* ---------- 移动端菜单切换 ---------- */
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      const spans = navToggle.querySelectorAll('span');
      if (navMenu.classList.contains('open')) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
      } else {
        spans[0].style.transform = '';
        spans[1].style.opacity = '';
        spans[2].style.transform = '';
      }
    });

    // 点击链接后关闭菜单
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        const spans = navToggle.querySelectorAll('span');
        spans[0].style.transform = '';
        spans[1].style.opacity = '';
        spans[2].style.transform = '';
      });
    });
  }

  /* ---------- 滚动高亮当前导航 ---------- */
  function highlightNav() {
    const scrollPos = window.scrollY + varNavHeight() + 50;

    sections.forEach(section => {
      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < bottom) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + id) {
            link.classList.add('active');
          }
        });
      }
    });

    // Hero 区域特殊处理
    if (window.scrollY < varNavHeight() + 100) {
      navLinks.forEach(link => link.classList.remove('active'));
    }
  }

  function varNavHeight() {
    return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 64;
  }

  window.addEventListener('scroll', highlightNav, { passive: true });
  highlightNav();

  /* ---------- Reveal 动画（Intersection Observer） ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // 添加 stagger 延迟效果（如果父元素有多个 .reveal 子元素）
        const parent = entry.target.parentElement;
        if (parent) {
          const siblings = Array.from(parent.querySelectorAll('.reveal'));
          const index = siblings.indexOf(entry.target);
          if (index > 0) {
            entry.target.style.transitionDelay = (index * 0.08) + 's';
          }
        }
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));

  /* ---------- 快速启动清单 localStorage ---------- */
  const STORAGE_KEY = 'personal_os_checklist';

  function loadChecklist() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      checkboxes.forEach(cb => {
        const id = cb.dataset.id;
        if (id && data[id] === true) {
          cb.checked = true;
        }
      });
      updateAllProgress();
    } catch (e) {
      console.warn('无法读取清单状态', e);
    }
  }

  function saveChecklist() {
    const data = {};
    checkboxes.forEach(cb => {
      if (cb.dataset.id) {
        data[cb.dataset.id] = cb.checked;
      }
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('无法保存清单状态', e);
    }
  }

  function updateProgress(group) {
    const groupCbs = document.querySelectorAll(`input[data-group="${group}"]`);
    const checked = Array.from(groupCbs).filter(cb => cb.checked).length;
    const total = groupCbs.length;
    const progressEl = document.querySelector(`.checklist-progress[data-group="${group}"]`);
    if (progressEl) {
      progressEl.textContent = `${checked}/${total}`;
      if (checked === total && total > 0) {
        progressEl.style.background = 'rgba(16,185,129,0.12)';
        progressEl.style.color = 'var(--green-dark)';
      } else {
        progressEl.style.background = '';
        progressEl.style.color = '';
      }
    }
  }

  function updateAllProgress() {
    const groups = new Set();
    checkboxes.forEach(cb => groups.add(cb.dataset.group));
    groups.forEach(group => updateProgress(group));
  }

  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      saveChecklist();
      updateProgress(cb.dataset.group);
    });
  });

  loadChecklist();

  /* ---------- 平滑滚动优化（处理 offset） ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offset = varNavHeight();
        const top = target.offsetTop - offset;
        window.scrollTo({
          top: top,
          behavior: 'smooth'
        });
      }
    });
  });

  /* ---------- 键盘快捷键 ---------- */
  document.addEventListener('keydown', (e) => {
    // ESC 关闭移动端菜单
    if (e.key === 'Escape' && navMenu && navMenu.classList.contains('open')) {
      navMenu.classList.remove('open');
      const spans = navToggle.querySelectorAll('span');
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    }
  });

})();
