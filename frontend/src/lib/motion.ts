import anime from 'animejs';

/** Entrance animation for IA prototype — Chart.js / Highcharts ไม่ผ่านที่นี่ */
export function staggerFadeIn(selector: string): void {
  anime({
    targets: selector,
    translateY: [12, 0],
    opacity: [0, 1],
    delay: anime.stagger(70),
    duration: 400,
    easing: 'easeOutQuad',
  });
}
