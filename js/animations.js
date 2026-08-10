export function initAnimations(){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const reveals = document.querySelectorAll('[data-reveal]');
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('opacity-100','translate-y-0');
        io.unobserve(entry.target);
      }
    });
  }, {threshold: 0.12});
  reveals.forEach(el=>{
    el.classList.add('opacity-0','translate-y-4','transition','duration-500','ease-out');
    io.observe(el);
  });
}
