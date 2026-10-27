import { expect, type Locator, type Page } from '@playwright/test';

import { DONOR } from './apps';

/**
 * The donor chat, as a page object (ADR 0017).
 *
 * The screen is a transcript and a composer. Everything the bot says is a
 * bubble with `data-direction="out"`, its buttons inside it; everything the
 * person says is a bubble with `data-direction="in"`. A tap always goes to the
 * most recent live button with that label, which is the one the bot is asking
 * about, because every answered question's buttons are locked (§8).
 *
 * `waitForBubble` polls. A card, a stand-down or a thank-you arrives from the
 * ticker between a person's own messages, and the screen refreshes itself
 * every few seconds, so the wait is the real wait and never a fixed sleep.
 */

export type Registration = {
  readonly phone: string;
  readonly name: string;
  /** As the bot labels it: `B−`, `O−`, `AB+`. The minus is U+2212. */
  readonly group: string;
  readonly sex: 'Female' | 'Male' | 'Other';
  readonly birthYear: string;
  /** The district button to tap. */
  readonly district: string;
  /** Preferred city, town or locality buttons, tapped when offered. */
  readonly prefer: readonly string[];
};

export class ChatPage {
  readonly page: Page;
  readonly log: Locator;
  private readonly origin: string;

  constructor(page: Page, origin: string = DONOR.origin) {
    this.page = page;
    this.origin = origin;
    this.log = page.getByRole('log', { name: 'Conversation' });
  }

  async open(path = '/chat'): Promise<void> {
    await this.page.goto(`${this.origin}${path}`);
    await expect(this.log).toBeVisible();
  }

  outgoing(): Locator {
    return this.log.locator('[data-direction="out"]');
  }

  incoming(): Locator {
    return this.log.locator('[data-direction="in"]');
  }

  /** The text of the most recent thing the bot said. */
  async lastSaid(): Promise<string> {
    return (await this.outgoing().last().locator('p').first().innerText()).trim();
  }

  /** Waits for the bot to say something matching, and returns that bubble. */
  async waitForBubble(text: string | RegExp, timeout = 20_000): Promise<Locator> {
    const bubble = this.outgoing().filter({ hasText: text }).last();
    await expect(bubble, `waited for the bot to say ${String(text)}`).toBeVisible({ timeout });
    return bubble;
  }

  /** The composer settles once the reply has been drawn. */
  private async settle(): Promise<void> {
    await expect(this.page.getByRole('button', { name: 'Send' })).not.toHaveAttribute('aria-busy', 'true');
  }

  async say(text: string): Promise<void> {
    await this.page.getByRole('textbox', { name: 'Your message' }).fill(text);
    await this.page.getByRole('button', { name: 'Send' }).click();
    await expect(this.incoming().last()).toContainText(text);
    await this.settle();
  }

  /** The most recent live button with this label. */
  live(label: string | RegExp): Locator {
    return this.log
      .getByRole('button', { name: label, exact: typeof label === 'string', disabled: false })
      .last();
  }

  async tap(label: string | RegExp): Promise<void> {
    const button = this.live(label);
    await expect(button, `a live button ${String(label)}`).toBeVisible();
    await button.click();
    await this.settle();
  }

  /** The first live button on the latest message, for a list of matches. */
  async tapFirstOffered(): Promise<void> {
    const button = this.outgoing().last().getByRole('button', { disabled: false }).first();
    await expect(button).toBeVisible();
    await button.click();
    await this.settle();
  }

  /** What the person chose on an answered question, read back from the lock. */
  async chosenOn(question: string | RegExp): Promise<string | null> {
    // The last bubble that both matches and carries a locked answer: a later
    // message may quote the same words without being the question.
    const bubble = this.outgoing()
      .filter({ hasText: question })
      .filter({ has: this.page.getByRole('button', { pressed: true }) })
      .last();
    const chosen = bubble.getByRole('button', { pressed: true });
    return (await chosen.count()) > 0 ? (await chosen.first().innerText()).replace(/^✓\s*/, '').trim() : null;
  }

  /**
   * The interview, the way a person walks it (§5).
   *
   * Phone, name, date of birth by three taps, sex, group, weight, the durable
   * health questions, the location chain and the last donation, then the
   * summary and the acknowledgement. Ends on "You are registered."
   */
  async register(who: Registration): Promise<void> {
    await this.waitForBubble(/phone number/);
    await this.say(who.phone);

    await this.waitForBubble(/What is your name/);
    await this.say(who.name);

    await this.waitForBubble(/Which year/);
    await this.tap(who.birthYear);
    await this.waitForBubble(/Which month/);
    await this.tap('Mar');
    await this.waitForBubble(/Which day/);
    await this.tap('12');

    await this.waitForBubble(/male or female/);
    await this.tap(who.sex);

    await this.waitForBubble(/blood group/);
    await this.tap(who.group);

    await this.waitForBubble(/what do you weigh/);
    await this.tap('50–60');

    // The durable health questions: No to each, until the district is asked.
    for (let i = 0; i < 6; i += 1) {
      const said = await this.lastSaid();
      if (said.includes('Which district')) break;
      await this.tap('No');
    }

    await this.walkLocation(who);

    await this.waitForBubble(/last give blood/);
    await this.tap('I have never donated');

    await this.waitForBubble(/Please check these details/);
    await this.tap('Yes, this is correct');
    await this.waitForBubble(/You are registered/);
  }

  /**
   * District, then city, town and locality, by button where the list is
   * short and by type-ahead where it is not (§5). Stops when the last-
   * donation question appears, which is how the bot ends the chain.
   */
  private async walkLocation(who: Registration): Promise<void> {
    await this.waitForBubble(/Which district/);
    await this.tap(who.district);

    const prefixes = ['a', 'e', 'k', 'm'];
    let prefix = 0;

    for (let i = 0; i < 12; i += 1) {
      const said = await this.lastSaid();
      if (/last give blood/i.test(said)) return;

      if (/first few letters/i.test(said)) {
        await this.say(prefixes[prefix % prefixes.length] ?? 'a');
        prefix += 1;
        continue;
      }

      if (said.includes('Places matching')) {
        await this.tapFirstOffered();
        continue;
      }

      if (/Which (city|town|part)/i.test(said)) {
        let tapped = false;
        for (const label of who.prefer) {
          if ((await this.live(label).count()) > 0) {
            await this.tap(label);
            tapped = true;
            break;
          }
        }
        if (!tapped) await this.tapFirstOffered();
        continue;
      }

      throw new Error(`unexpected step in the location chain: ${said}`);
    }

    throw new Error('the location chain did not end at the last-donation question');
  }

  /** Accepts a request card and answers the four visit questions well (§5). */
  async acceptAndScreen(): Promise<void> {
    await this.tap('Yes, I can give');
    await this.waitForBubble(/feeling well/);
    await this.tap('Yes');
    await this.waitForBubble(/eaten/);
    await this.tap('Yes');
    await this.waitForBubble(/antibiotics/);
    await this.tap('No');
    await this.waitForBubble(/surgery|tattoo|piercing/);
    await this.tap('No');
  }
}
