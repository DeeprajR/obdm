import { devices, type Browser, type BrowserContext, type Page } from '@playwright/test';

/**
 * The stage: windows, captions and pacing for a watchable run.
 *
 * A test opens every browser it needs at once and jumps between them; a
 * demonstration shows one thing at a time and says what it is. The stage
 * keeps one window per role, brings the right one to the front for each
 * step, writes a caption onto the page in the demo plan's words, and pauses
 * long enough to read it. Nothing here asserts; the chapters do that.
 *
 * Captions are injected with an init script so they survive navigation: the
 * text lives in the tab's sessionStorage and is redrawn on every page load.
 */

export type Kind = 'desktop' | 'phone';

export type StageOptions = {
  /** Milliseconds a caption is held before the next action. */
  readonly pace: number;
  /** Where to write one recording per window, or undefined for none. */
  readonly videoDir?: string | undefined;
  readonly log?: ((line: string) => void) | undefined;
};

const CAPTION_SCRIPT = `(() => {
  const ID = 'bc-showcase-caption';
  const render = () => {
    const text = sessionStorage.getItem('bc-showcase-caption') || '';
    const where = sessionStorage.getItem('bc-showcase-where') || 'bottom';
    let el = document.getElementById(ID);
    if (!text) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = ID;
      Object.assign(el.style, {
        position: 'fixed', left: '50%', transform: 'translateX(-50%)',
        maxWidth: '92vw', padding: '10px 16px', borderRadius: '10px',
        background: 'rgba(26,29,33,0.92)', color: '#fff',
        font: '500 15px/1.4 ui-sans-serif, system-ui, sans-serif',
        boxShadow: '0 6px 24px rgba(0,0,0,0.25)', zIndex: '2147483647',
        pointerEvents: 'none', whiteSpace: 'pre-wrap', textAlign: 'center',
      });
      document.documentElement.appendChild(el);
    }
    el.style.top = where === 'top' ? '12px' : '';
    el.style.bottom = where === 'top' ? '' : '18px';
    el.textContent = text;
  };
  window.__bcShowcase = (text, where) => {
    sessionStorage.setItem('bc-showcase-caption', text);
    if (where) sessionStorage.setItem('bc-showcase-where', where);
    render();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
  else render();
  new MutationObserver(() => { if (!document.getElementById(ID)) render(); })
    .observe(document.documentElement, { childList: true });
})();`;

type Window = {
  readonly context: BrowserContext;
  readonly page: Page;
  readonly kind: Kind;
};

export class Stage {
  private readonly windows = new Map<string, Window>();
  private readonly log: (line: string) => void;
  private readonly browser: Browser;
  private readonly options: StageOptions;

  constructor(browser: Browser, options: StageOptions) {
    this.browser = browser;
    this.options = options;
    this.log =
      options.log ??
      ((line: string): void => {
        process.stdout.write(`${new Date().toISOString().slice(11, 19)}  ${line}\n`);
      });
  }

  /** The pause after a caption, for a chapter that wants a multiple of it. */
  get pace(): number {
    return this.options.pace;
  }

  /**
   * The window for a role, created on first use and navigated at once, so
   * no blank tab sits on the screen waiting for its first page.
   */
  async window(name: string, kind: Kind, url: string): Promise<Page> {
    const existing = this.windows.get(name);
    if (existing) {
      await existing.page.bringToFront();
      return existing.page;
    }

    const context = await this.browser.newContext({
      ...(kind === 'phone' ? devices['Pixel 7'] : { viewport: { width: 1280, height: 800 } }),
      ...(this.options.videoDir !== undefined
        ? { recordVideo: { dir: this.options.videoDir, size: { width: 1280, height: 800 } } }
        : {}),
    });
    await context.addInitScript(CAPTION_SCRIPT);
    const page = await context.newPage();
    await page.goto(url);
    await page.bringToFront();
    this.windows.set(name, { context, page, kind });
    return page;
  }

  async focus(name: string): Promise<Page> {
    const window = this.windows.get(name);
    if (!window) throw new Error(`no window named ${name}`);
    await window.page.bringToFront();
    return window.page;
  }

  /** Says what is happening, on the page and in the terminal, then pauses. */
  async say(page: Page, text: string, hold: number = this.options.pace): Promise<void> {
    this.log(text);
    await this.caption(page, text);
    await page.waitForTimeout(hold);
  }

  /** A caption that stays up while something slow happens. */
  async during<T>(page: Page, text: string, work: () => Promise<T>): Promise<T> {
    this.log(text);
    await this.caption(page, text);
    const result = await work();
    await page.waitForTimeout(Math.min(this.options.pace, 800));
    return result;
  }

  /** A chapter heading: longer hold, so the audience knows the scene changed. */
  async chapter(page: Page, title: string): Promise<void> {
    this.log(`== ${title}`);
    await this.caption(page, title);
    await page.waitForTimeout(this.options.pace * 1.5);
  }

  async hold(page: Page, ms: number): Promise<void> {
    await page.waitForTimeout(ms);
  }

  private async caption(page: Page, text: string): Promise<void> {
    const kind = [...this.windows.values()].find((w) => w.page === page)?.kind ?? 'desktop';
    const where = kind === 'phone' ? 'top' : 'bottom';
    const draw = (): Promise<void> =>
      page.evaluate(
        ([t, w]) => {
          const show = (window as unknown as { __bcShowcase?: (text: string, where: string) => void })
            .__bcShowcase;
          if (show) show(t, w);
        },
        [text, where] as const,
      );
    try {
      await draw();
    } catch {
      // Mid-navigation. Wait for the next document and draw on that one.
      await page.waitForLoadState('domcontentloaded').catch(() => undefined);
      await draw().catch(() => undefined);
    }
  }

  async close(): Promise<void> {
    for (const window of this.windows.values()) {
      await window.context.close();
    }
    this.windows.clear();
  }
}
