import 'server-only';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';

import {
  anonymousActor,
  appOrigin,
  audienceFor,
  cancelPendingEmailChange,
  consumeInvite,
  db,
  drainEmailOutbox,
  landingFor,
  nodeTokens,
  UPDATE_REQUEST_FIELDS,
  requestAccountUpdate,
  requestEmailChange,
  requestPasswordOtp,
  signIn,
  signOut,
  smtpEmailPort,
  verifyOtpAndReset,
  withdrawAccountUpdate,
  type UserRole,
} from '@blood-connect/platform';

import type { StaffApp } from './app.js';
import type { FormState, SignInFormState } from './form-state.js';
import { useCaseContext } from './guards.js';
import {
  assertSameOrigin,
  clearSessionCookie,
  currentActor,
  readSessionToken,
  setSessionCookie,
} from './session.js';

/**
 * The account actions every staff application has (§9.1).
 *
 * Plain server functions rather than server actions: a `'use server'` module
 * can only export functions, not build them, so each application keeps a
 * short `actions.ts` of its own that binds these to its `StaffApp` and is the
 * thing the forms actually post to.
 *
 * The rule that matters is unchanged: each parses its input with Zod and calls
 * exactly one use case. No business logic lives here.
 */

const signInSchema = z.object({
  // `.trim()` and not `.email()`: an address that fails our idea of valid must
  // reach the use case anyway, so the response stays identical to a wrong
  // password and the form does not become an enumeration oracle (§15).
  email: z.string().trim().min(1, 'Enter your email address.').max(320),
  password: z.string().min(1, 'Enter your password.').max(1024),
});

const passwordSchema = z.object({
  password: z.string().min(1, 'Choose a password.').max(1024),
});

const updateRequestSchema = z.object({
  field: z.enum(UPDATE_REQUEST_FIELDS),
  proposedValue: z.string().trim().min(1, 'Fill in the new value.').max(200),
  reason: z
    .string()
    .trim()
    .min(1, 'Say why it needs changing.')
    .max(500, 'Keep it under 500 characters.'),
});

/**
 * A form field as a string.
 *
 * `FormData.get` returns `string | File | null`, and a File stringifies to
 * `[object Object]`, which would sail through validation as a perfectly good
 * 15-character password. Anything that is not a string is treated as absent.
 */
function formValue(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

export function accountActions(app: StaffApp) {
  /**
   * The end of activation and of a reset: signed in, on their own dashboard
   * (§3, §8), never back on a form to retype the password they just chose.
   *
   * Both links can be opened in the wrong application. A reset page is on all
   * three, and somebody who bookmarked the doctor app will use it whatever
   * their role. The session the use case issued is bound to the account's own
   * application, so setting it here would give this application a cookie it
   * cannot resolve. Instead they are sent to their own application's sign-in,
   * where the password they just chose works.
   */
  async function landSignedIn(role: UserRole, token: string, expiresAt: Date): Promise<never> {
    const audience = audienceFor(role);
    if (audience !== app.audience) redirect(`${appOrigin(audience)}/sign-in`);

    await setSessionCookie(app, token, expiresAt);
    redirect(landingFor(role));
  }

  return {
    async signIn(_previous: SignInFormState, formData: FormData): Promise<SignInFormState> {
      await assertSameOrigin();

      const parsed = signInSchema.safeParse({
        email: formData.get('email'),
        password: formData.get('password'),
      });

      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Check the form and try again.' };
      }

      const ctx = await useCaseContext(anonymousActor);
      const result = await signIn(ctx, { ...parsed.data, audience: app.audience });

      if (!result.ok) {
        return { error: result.error.message };
      }

      await setSessionCookie(app, result.value.token, result.value.expiresAt);

      // Signing in lands them on the dashboard for their role, never on a menu
      // and never back on the form they just completed (§3).
      redirect(landingFor(result.value.user.role));
    },

    async signOut(): Promise<void> {
      await assertSameOrigin();

      const token = await readSessionToken(app);
      if (token) {
        const actor = await currentActor(app);
        const ctx = await useCaseContext(actor);
        await signOut(ctx, nodeTokens.fingerprint(token));
      }

      await clearSessionCookie(app);

      redirect('/sign-in');
    },

    /**
     * Setting the password from an invite signs them in (§3).
     *
     * The redirect is the ending §8 names for this flow, never back to a
     * sign-in form to retype what they just chose.
     */
    async activate(token: string, _previous: FormState, formData: FormData): Promise<FormState> {
      await assertSameOrigin();

      const parsed = passwordSchema.safeParse({ password: formData.get('password') });
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Choose a password.' };
      }

      const ctx = await useCaseContext(anonymousActor);
      const result = await consumeInvite(ctx, token, parsed.data.password);
      if (!result.ok) return { error: result.error.message };

      after(() => drainEmailOutbox(db, smtpEmailPort, new Date()));
      return landSignedIn(result.value.role, result.value.token, result.value.expiresAt);
    },

    async requestReset(_previous: FormState, formData: FormData): Promise<FormState> {
      await assertSameOrigin();

      const email = formValue(formData, 'email');
      const ctx = await useCaseContext(anonymousActor);
      const result = await requestPasswordOtp(ctx, email);

      after(() => drainEmailOutbox(db, smtpEmailPort, new Date()));

      // Throttling is the only visible failure. Everything else answers the same
      // whether or not the address exists (§3).
      if (!result.ok) return { error: result.error.message };
      return { error: null, done: true };
    },

    async completeReset(_previous: FormState, formData: FormData): Promise<FormState> {
      await assertSameOrigin();

      const email = formValue(formData, 'email');
      const otp = formValue(formData, 'otp').trim();
      const password = formValue(formData, 'password');

      const ctx = await useCaseContext(anonymousActor);
      const result = await verifyOtpAndReset(ctx, email, otp, password);
      if (!result.ok) return { error: result.error.message };

      after(() => drainEmailOutbox(db, smtpEmailPort, new Date()));
      return landSignedIn(result.value.role, result.value.token, result.value.expiresAt);
    },

    async requestEmailChange(_previous: FormState, formData: FormData): Promise<FormState> {
      await assertSameOrigin();

      const actor = await currentActor(app);
      const ctx = await useCaseContext(actor);
      const result = await requestEmailChange(ctx, formValue(formData, 'email'));

      after(() => drainEmailOutbox(db, smtpEmailPort, new Date()));

      if (!result.ok) return { error: result.error.message };
      return { error: null, done: true };
    },

    async cancelEmailChange(): Promise<void> {
      await assertSameOrigin();

      const actor = await currentActor(app);
      const ctx = await useCaseContext(actor);
      await cancelPendingEmailChange(ctx);

      revalidatePath('/profile');
    },

    /* ---------------------------------------------------------------------- */
    /* Account update requests (§3)                                            */
    /* ---------------------------------------------------------------------- */

    async requestAccountUpdate(_previous: FormState, formData: FormData): Promise<FormState> {
      await assertSameOrigin();

      const parsed = updateRequestSchema.safeParse({
        field: formData.get('field'),
        proposedValue: formData.get('proposedValue'),
        reason: formData.get('reason'),
      });
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? 'Check the form.' };
      }

      const actor = await currentActor(app);
      const ctx = await useCaseContext(actor);
      const result = await requestAccountUpdate(ctx, parsed.data);

      if (!result.ok) return { error: result.error.message };

      revalidatePath('/profile');
      return { error: null, done: true };
    },

    async withdrawAccountUpdate(formData: FormData): Promise<void> {
      await assertSameOrigin();

      const actor = await currentActor(app);
      const ctx = await useCaseContext(actor);
      await withdrawAccountUpdate(ctx, formValue(formData, 'requestId'));

      revalidatePath('/profile');
    },
  };
}
