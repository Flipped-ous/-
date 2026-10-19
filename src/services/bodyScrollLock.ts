/** Share a lock across nested sheets, including parents closed before children. */
export function createScrollLock(style: Pick<CSSStyleDeclaration, 'overflow'>) {
  let owners = 0;
  let original = '';
  return () => {
    if (owners++ === 0) original = style.overflow;
    style.overflow = 'hidden';
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (--owners === 0) style.overflow = original;
    };
  };
}

let hold: ReturnType<typeof createScrollLock> | undefined;
export function holdBodyScroll() {
  hold ??= createScrollLock(document.body.style);
  return hold();
}
