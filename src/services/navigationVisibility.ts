/** Modal ownership and typing/IME state share one source of truth. */
export class NavigationVisibility {
  private dialogs = new Set<symbol>();
  private editing = false;
  private keyboard = false;
  private listeners = new Set<() => void>();

  getSnapshot = () => this.dialogs.size > 0 || this.editing || this.keyboard;
  isKeyboardVisible = () => this.keyboard;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private change(update: () => void) {
    const before = this.getSnapshot();
    update();
    if (before !== this.getSnapshot()) this.listeners.forEach((listener) => listener());
  }
  holdDialog = () => {
    const owner = Symbol();
    this.change(() => this.dialogs.add(owner));
    return () => this.change(() => { this.dialogs.delete(owner); });
  };
  setEditing = (editing: boolean) => this.change(() => { this.editing = editing; });
  setKeyboardVisible = (visible: boolean) => this.change(() => {
    // Android Back can close the IME while its input retains DOM focus.
    if (this.keyboard && !visible) this.editing = false;
    this.keyboard = visible;
  });
}

export const navigationVisibility = new NavigationVisibility();
