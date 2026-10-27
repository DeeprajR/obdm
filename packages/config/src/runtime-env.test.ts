import { describe, expect, it } from 'vitest';

import {
  BOT_RUNTIME_RULES,
  ENV_FROM_FILE,
  WEB_RUNTIME_RULES,
  checkRuntimeEnv,
  describeEnvProblems,
  productionEnvProblems,
  type Env,
} from './runtime-env.js';

/** A deployment that set everything the way docs/deployment.md asks. */
const configured: Env = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://app_web:s3cret-and-long@db.internal:5432/obdm?sslmode=require',
  BOT_DATABASE_URL: 'postgres://app_bot:another-s3cret@db.internal:5432/obdm?sslmode=require',
  S3_ENDPOINT: 'https://s3.ap-south-1.amazonaws.com',
  S3_BUCKET: 'obdm-prod',
  S3_ACCESS_KEY_ID: 'AKIAEXAMPLEEXAMPLE',
  S3_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  SMTP_HOST: 'email-smtp.ap-south-1.amazonaws.com',
  SMTP_PORT: '587',
  S3_REGION: 'ap-south-1',
  MAIL_FROM: 'OBDM <no-reply@obdm.example.org>',
  DOCTOR_APP_URL: 'https://doctor.obdm.example.org',
  ADMIN_APP_URL: 'https://admin.obdm.example.org',
  CENTRE_APP_URL: 'https://centre.obdm.example.org',
  VOLUNTEER_APP_URL: 'https://volunteer.obdm.example.org',
};

/** `.env.example`, which is what a forgotten deployment runs on. */
const development: Env = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://app_web:app_web@localhost:5433/obdm',
  BOT_DATABASE_URL: 'postgres://app_bot:app_bot@localhost:5433/obdm',
  S3_ENDPOINT: 'http://localhost:9090',
  S3_BUCKET: 'obdm',
  S3_ACCESS_KEY_ID: 'local',
  S3_SECRET_ACCESS_KEY: 'local-dev-only',
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  S3_REGION: 'ap-south-1',
  MAIL_FROM: 'OBDM <no-reply@obdm.local>',
  DOCTOR_APP_URL: 'http://localhost:3000',
  ADMIN_APP_URL: 'http://localhost:3001',
  CENTRE_APP_URL: 'http://localhost:3002',
  VOLUNTEER_APP_URL: 'http://localhost:3003',
};

const variables = (env: Env) => checkRuntimeEnv(WEB_RUNTIME_RULES, env).map((p) => p.variable);

describe('the web release (§13)', () => {
  it('accepts a configured deployment', () => {
    expect(checkRuntimeEnv(WEB_RUNTIME_RULES, configured)).toEqual([]);
  });

  it('refuses the development defaults variable by variable, naming each', () => {
    expect(variables(development)).toEqual([
      'DATABASE_URL',
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY',
      'SMTP_PORT',
      'MAIL_FROM',
      'DOCTOR_APP_URL',
      'ADMIN_APP_URL',
      'CENTRE_APP_URL',
      'VOLUNTEER_APP_URL',
    ]);
  });

  it('refuses an empty environment', () => {
    expect(variables({})).toEqual(WEB_RUNTIME_RULES.map((rule) => rule.variable));
  });

  it('refuses the committed development password even on a real host', () => {
    const env = { ...configured, DATABASE_URL: 'postgres://app_web:app_web@db.internal/obdm' };
    expect(checkRuntimeEnv(WEB_RUNTIME_RULES, env)).toEqual([
      expect.objectContaining({ variable: 'DATABASE_URL', problem: expect.stringContaining('init.sql') }),
    ]);
  });

  it('wants https origins that are not localhost', () => {
    const plain = { ...configured, DOCTOR_APP_URL: 'http://doctor.obdm.example.org' };
    expect(checkRuntimeEnv(WEB_RUNTIME_RULES, plain)[0]?.problem).toMatch(/https/);

    const local = { ...configured, CENTRE_APP_URL: 'https://localhost:3002' };
    expect(checkRuntimeEnv(WEB_RUNTIME_RULES, local)[0]?.problem).toMatch(/localhost/);

    const junk = { ...configured, ADMIN_APP_URL: 'not a url' };
    expect(checkRuntimeEnv(WEB_RUNTIME_RULES, junk)[0]?.problem).toMatch(/not a URL/);
  });

  it('treats whitespace as unset', () => {
    expect(variables({ ...configured, SMTP_HOST: '   ' })).toEqual(['SMTP_HOST']);
  });
});

describe('the donor application (§13, ADR 0017)', () => {
  it('needs only its own connection string', () => {
    expect(checkRuntimeEnv(BOT_RUNTIME_RULES, configured)).toEqual([]);
    expect(checkRuntimeEnv(BOT_RUNTIME_RULES, development).map((p) => p.variable)).toEqual([
      'BOT_DATABASE_URL',
    ]);
  });
});

describe('when the check applies', () => {
  it('is silent outside production, so a fresh checkout starts unconfigured', () => {
    expect(productionEnvProblems(WEB_RUNTIME_RULES, { ...development, NODE_ENV: 'development' })).toEqual([]);
    expect(productionEnvProblems(WEB_RUNTIME_RULES, { ...development, NODE_ENV: 'test' })).toEqual([]);
    expect(productionEnvProblems(WEB_RUNTIME_RULES, {})).toEqual([]);
  });

  it('is silent during the production build, which has no secrets and needs none', () => {
    expect(
      productionEnvProblems(WEB_RUNTIME_RULES, { NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' }),
    ).toEqual([]);
  });

  it('is silent when the configuration was loaded from the workspace .env', () => {
    // `next start` on a developer's machine: a production build, the local stack.
    expect(
      productionEnvProblems(WEB_RUNTIME_RULES, { ...development, [ENV_FROM_FILE]: '/repo/.env' }),
    ).toEqual([]);
  });

  it('applies in production', () => {
    expect(productionEnvProblems(WEB_RUNTIME_RULES, development).length).toBeGreaterThan(0);
    expect(productionEnvProblems(WEB_RUNTIME_RULES, configured)).toEqual([]);
  });
});

describe('the message', () => {
  it('names every variable and never a value', () => {
    const text = describeEnvProblems(checkRuntimeEnv(WEB_RUNTIME_RULES, development));
    expect(text).toContain('DATABASE_URL');
    expect(text).toContain('VOLUNTEER_APP_URL');
    expect(text).not.toContain('app_web@localhost');
    expect(text).not.toContain('local-dev-only');
    expect(text).toContain('docs/deployment.md');
  });
});
