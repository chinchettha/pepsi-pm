declare module 'animejs' {
  type AnimeParams = Record<string, unknown>;
  interface AnimeInstance {
    (params: AnimeParams): AnimeInstance;
    stagger: (value: number | ((el: Element, i: number) => number)) => (el: Element, i: number) => number;
  }
  const anime: AnimeInstance;
  export default anime;
}
