import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const dotRef  = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const dot  = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    // Skip on touch-only devices
    if (!window.matchMedia('(hover: hover)').matches) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX  = mouseX;
    let ringY  = mouseY;
    let rafId;

    function lerp(a, b, n) { return (1 - n) * a + n * b; }

    // Dot follows exactly — no lag
    function onMouseMove(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    }

    // Ring follows with smooth lag
    function loop() {
      ringX = lerp(ringX, mouseX, 0.12);
      ringY = lerp(ringY, mouseY, 0.12);
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(loop);
    }

    // Hover detection — check element type
    function isInteractive(el) {
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      if (['button', 'a', 'input', 'select', 'textarea', 'label'].includes(tag)) return true;
      if (el.getAttribute('role') === 'button') return true;
      if (el.getAttribute('tabindex') !== null && el.getAttribute('tabindex') !== '-1') return true;
      if (el.classList?.contains('clickable') || el.classList?.contains('tr-link')) return true;
      return false;
    }

    function setHover(el) {
      let node = el;
      while (node && node !== document.body) {
        if (isInteractive(node)) {
          dot.classList.add('cursor-hover');
          ring.classList.add('cursor-hover');
          return;
        }
        node = node.parentElement;
      }
      dot.classList.remove('cursor-hover');
      ring.classList.remove('cursor-hover');
    }

    function onMouseOver(e) { setHover(e.target); }
    function onMouseOut()   { setHover(null); }

    function onMouseDown() {
      dot.classList.add('cursor-click');
      ring.classList.add('cursor-click');
    }
    function onMouseUp() {
      dot.classList.remove('cursor-click');
      ring.classList.remove('cursor-click');
    }

    function onMouseLeave() {
      dot.classList.add('cursor-hidden');
      ring.classList.add('cursor-hidden');
    }
    function onMouseEnter() {
      dot.classList.remove('cursor-hidden');
      ring.classList.remove('cursor-hidden');
    }

    document.addEventListener('mousemove',  onMouseMove,  { passive: true });
    document.addEventListener('mouseover',  onMouseOver,  { passive: true });
    document.addEventListener('mouseout',   onMouseOut,   { passive: true });
    document.addEventListener('mousedown',  onMouseDown,  { passive: true });
    document.addEventListener('mouseup',    onMouseUp,    { passive: true });
    document.addEventListener('mouseleave', onMouseLeave, { passive: true });
    document.addEventListener('mouseenter', onMouseEnter, { passive: true });

    rafId = requestAnimationFrame(loop);

    return () => {
      document.removeEventListener('mousemove',  onMouseMove);
      document.removeEventListener('mouseover',  onMouseOver);
      document.removeEventListener('mouseout',   onMouseOut);
      document.removeEventListener('mousedown',  onMouseDown);
      document.removeEventListener('mouseup',    onMouseUp);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <div ref={dotRef}  className="cursor-dot"  aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
    </>
  );
}
