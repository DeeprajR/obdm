'use server';

import {
  accountActions,
  type FormState,
  type SignInFormState,
} from '@obdm/staff-web';

import { APP } from '@/lib/app';

/**
 * The account actions, bound to this application (§9.1).
 *
 * The work is shared and lives in `@obdm/staff-web`. These are the
 * server actions the forms post to, and binding them here is what makes a
 * sign-in on this application issue this application's session and cookie.
 */

const account = accountActions(APP);

export async function signInAction(
  previous: SignInFormState,
  formData: FormData,
): Promise<SignInFormState> {
  return account.signIn(previous, formData);
}

export async function enterDemoAction(): Promise<SignInFormState> {
  return account.enterDemo();
}

export async function signOutAction(): Promise<void> {
  return account.signOut();
}

export async function activateAction(
  token: string,
  previous: FormState,
  formData: FormData,
): Promise<FormState> {
  return account.activate(token, previous, formData);
}

export async function requestResetAction(
  previous: FormState,
  formData: FormData,
): Promise<FormState> {
  return account.requestReset(previous, formData);
}

export async function completeResetAction(
  previous: FormState,
  formData: FormData,
): Promise<FormState> {
  return account.completeReset(previous, formData);
}

export async function requestEmailChangeAction(
  previous: FormState,
  formData: FormData,
): Promise<FormState> {
  return account.requestEmailChange(previous, formData);
}

export async function cancelEmailChangeAction(): Promise<void> {
  return account.cancelEmailChange();
}

export async function requestAccountUpdateAction(
  previous: FormState,
  formData: FormData,
): Promise<FormState> {
  return account.requestAccountUpdate(previous, formData);
}

export async function withdrawAccountUpdateAction(formData: FormData): Promise<void> {
  return account.withdrawAccountUpdate(formData);
}
