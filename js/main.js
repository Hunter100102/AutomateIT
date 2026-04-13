
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('#menu-toggle');
  const menu = document.querySelector('#menu');
  if (!toggle || !menu) return;

  const syncState = () => toggle.setAttribute('aria-expanded', String(menu.classList.contains('open')));

  toggle.addEventListener('click', () => {
    menu.classList.toggle('open');
    syncState();
  });

  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      menu.classList.remove('open');
      syncState();
    }
  });

  document.addEventListener('click', (event) => {
    if (!menu.classList.contains('open')) return;
    if (!event.target.closest('header')) {
      menu.classList.remove('open');
      syncState();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      menu.classList.remove('open');
      syncState();
    }
  });

  syncState();
});
