/**
 * What an account form's action hands back. Shared by the server functions
 * that produce it and the client forms that render it, so it lives in a file
 * with no directive that both sides can import.
 */
export type FormState = { readonly error: string | null; readonly done?: boolean };

export type SignInFormState = { readonly error: string | null };

export type FormAction = (state: FormState, form: FormData) => Promise<FormState>;

export type SignInAction = (state: SignInFormState, form: FormData) => Promise<SignInFormState>;
