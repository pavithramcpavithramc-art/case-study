const navToggle = document.getElementById('nav-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const navLinks = Array.from(document.querySelectorAll('.nav-link'));

export function initNavigation(){
  if(!navToggle || !mobileMenu) return;
  navToggle.addEventListener('click', toggleMenu);
  navToggle.addEventListener('keydown', (e)=>{ if(e.key==='Enter'||e.key===' ') toggleMenu(); });
  document.addEventListener('click', (e)=>{ if(!mobileMenu.contains(e.target) && !navToggle.contains(e.target)) closeMenu(); });
  window.addEventListener('hashchange', highlightCurrent);
  highlightCurrent();
}

function toggleMenu(){
  const open = mobileMenu.getAttribute('aria-hidden') === 'false';
  if(open) closeMenu(); else openMenu();
}
function openMenu(){
  mobileMenu.classList.remove('hidden');
  mobileMenu.setAttribute('aria-hidden','false');
  navToggle.setAttribute('aria-expanded','true');
  mobileMenu.querySelector('a')?.focus();
}
function closeMenu(){
  mobileMenu.classList.add('hidden');
  mobileMenu.setAttribute('aria-hidden','true');
  navToggle.setAttribute('aria-expanded','false');
}

function highlightCurrent(){
  const id = location.hash || '#hero';
  navLinks.forEach(a=> a.classList.toggle('nav-active', a.getAttribute('href')===id));
}

export function scrollSpy(){
  const sections = document.querySelectorAll('main section[id]');
  if(!sections.length) return;
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      const id = entry.target.id;
      const link = document.querySelector(`.nav-link[href="#${id}"]`);
      if(link) link.classList.toggle('nav-active', entry.isIntersecting);
    });
  }, {threshold: 0.6});
  sections.forEach(s=>observer.observe(s));
}
