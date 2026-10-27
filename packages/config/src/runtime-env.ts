/**
 * The environment, checked before anything is served (§13).
 *
 * §13 says a process refuses to start on a missing secret. What it did not say
 * is what happens on a *present but wrong* one, and the adapters answer that
 * badly: the storage adapter falls back to MinIO on localhost with the
 * published `minioadmin` credentials, the application origins fall back to the
 * development ports, and a deployment that forgot one variable would run, send
 * invite emails pointing at `localhost:3000`, and look fine from the outside.
 *
 * So each side of the system names what it needs here, as data, and the
 * applications assert it once at boot. A rule is a predicate over one variable
 * returning what is wrong with it, or nothing. The checker is pure, so a test
 * can hand it a fake environment; the decision to refuse is the caller's, and
 * only in production: a fresh checkout on the development defaults must keep
 * starting with no configuration at all.
 *
 * Nothing here reads a value: the checker is handed the environment, and the
 * caller decides what to do with the list that comes back.
 */

export type EnvProblem = {
  readonly variable: string;
  readonly problem: string;
};

export type Env = Readonly<Record<string, string | undefined>>;

type Check = (value: string | undefined) => string | null;

export type EnvRule = {
  readonly variable: string;
  readonly check: Check;
};

const isBlank = (value: string | undefined): value is undefined =>
  value === undefined || value.trim() === '';

/* -------------------------------------------------------------------------- */
/* Predicates                                                                  */
/* -------------------------------------------------------------------------- */

const present =
  (why: string): Check =>
  (value) =>
    isBlank(value) ? `is not set. ${why}` : null;

/**
 * The committed development password from `db/docker/init.sql`, where every
 * role's password is its own name. A connection string carrying it in
 * production means the role was created from the development file rather
 * than provisioned, which is the one thing that file says never to do.
 */
const notDevelopmentCredential =
  (role: string): Check =>
  (value) =>
    value?.includes(`://${role}:${role}@`) === true
      ? `carries the development password for ${role} from db/docker/init.sql. Provision the role with its own password.`
      : null;

const notOneOf =
  (values: readonly string[], why: string): Check =>
  (value) =>
    value !== undefined && values.includes(value) ? `is the development default. ${why}` : null;

const notEndingIn =
  (suffix: string, why: string): Check =>
  (value) =>
    value?.trimEnd().replace(/>$/, '').endsWith(suffix) === true
      ? `ends in ${suffix}. ${why}`
      : null;

/**
 * An origin a browser will reach from outside. `https`, because every session
 * cookie is marked `secure` in production and a plain-http origin would issue
 * cookies the browser then refuses to send back; not localhost, because that
 * is what a forgotten variable falls back to.
 */
const publicHttpsOrigin: Check = (value) => {
  if (isBlank(value)) {
    return 'is not set. Every link between the applications is built from it: an invite, a reset, an alert.';
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return 'is not a URL.';
  }
  if (url.protocol !== 'https:') {
    return 'must be an https:// origin. Session cookies are marked secure in production and would never be sent back over plain http.';
  }
  if (/^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0)$/.test(url.hostname)) {
    return 'points at localhost, which is the development default.';
  }
  return null;
};

const all =
  (...checks: readonly Check[]): Check =>
  (value) => {
    for (const check of checks) {
      const problem = check(value);
      if (problem !== null) return problem;
    }
    return null;
  };

/* -------------------------------------------------------------------------- */
/* What each side needs                                                        */
/* -------------------------------------------------------------------------- */

/** The four web applications and the worker, on `app_web`. */
export const WEB_RUNTIME_RULES: readonly EnvRule[] = [
  {
    variable: 'DATABASE_URL',
    check: all(present('The web release connects as app_web.'), notDevelopmentCredential('app_web')),
  },
  { variable: 'S3_ENDPOINT', check: present('Seals are stored in a private bucket.') },
  { variable: 'S3_BUCKET', check: present('Seals are stored in a private bucket.') },
  {
    variable: 'S3_ACCESS_KEY_ID',
    check: all(
      present('The bucket needs credentials.'),
      notOneOf(['minioadmin', 'local', 'local-dev-only'], 'Issue a key scoped to this bucket.'),
    ),
  },
  {
    variable: 'S3_SECRET_ACCESS_KEY',
    check: all(
      present('The bucket needs credentials.'),
      notOneOf(['minioadmin', 'local', 'local-dev-only'], 'Issue a key scoped to this bucket.'),
    ),
  },
  {
    variable: 'SMTP_HOST',
    check: present('Invites, reset codes and address-change warnings are email.'),
  },
  {
    variable: 'SMTP_PORT',
    check: all(
      present('587 for STARTTLS, 465 for implicit TLS; the adapter would otherwise use Mailpit’s 1025.'),
      notOneOf(['1025'], 'That is Mailpit. A provider listens on 587 or 465.'),
    ),
  },
  {
    variable: 'S3_REGION',
    check: present('Requests are signed for a region; a bucket elsewhere refuses every write.'),
  },
  {
    variable: 'MAIL_FROM',
    check: all(
      present('The sending address must be one the provider is allowed to send as.'),
      notEndingIn('.local', 'Use an address on the verified sending domain.'),
    ),
  },
  { variable: 'DOCTOR_APP_URL', check: publicHttpsOrigin },
  { variable: 'ADMIN_APP_URL', check: publicHttpsOrigin },
  { variable: 'CENTRE_APP_URL', check: publicHttpsOrigin },
  { variable: 'VOLUNTEER_APP_URL', check: publicHttpsOrigin },
];

/** The donor application, on `app_bot`. It sends no email and stores no file. */
export const BOT_RUNTIME_RULES: readonly EnvRule[] = [
  {
    variable: 'BOT_DATABASE_URL',
    check: all(present('The donor application connects as app_bot.'), notDevelopmentCredential('app_bot')),
  },
];

/* -------------------------------------------------------------------------- */
/* Checking                                                                    */
/* -------------------------------------------------------------------------- */

/** Every rule, against the environment given. Pure; the caller reads `process.env`. */
export function checkRuntimeEnv(rules: readonly EnvRule[], env: Env): readonly EnvProblem[] {
  const problems: EnvProblem[] = [];
  for (const rule of rules) {
    const problem = rule.check(env[rule.variable]);
    if (problem !== null) problems.push({ variable: rule.variable, problem });
  }
  return problems;
}

/**
 * Set by every loader of the workspace `.env` (each `next.config.ts`, the
 * worker) to the file it loaded.
 *
 * It is how a production *build* on a developer's machine is told apart from
 * a production *deployment*: `next start` sets `NODE_ENV=production` either
 * way, but a deployment supplies its environment to the container and never
 * has the file, which `.dockerignore` keeps out of every image. Configuration
 * that came from a file came from a developer, and the development values in
 * it are the point.
 */
export const ENV_FROM_FILE = 'OBDM_ENV_FROM_FILE';

/**
 * The problems that should stop a production process from starting.
 *
 * Empty outside production, so the development defaults keep working with no
 * configuration. Empty when the configuration was loaded from the workspace
 * `.env`, which is a developer running a production build against the local
 * stack. Empty during `next build` too: the build evaluates the
 * instrumentation hook in a worker that has no runtime secrets and needs none,
 * and a build that failed for want of an SMTP host would be a build that could
 * never be made in CI.
 */
export function productionEnvProblems(rules: readonly EnvRule[], env: Env): readonly EnvProblem[] {
  if (env['NODE_ENV'] !== 'production') return [];
  if (env['NEXT_PHASE'] === 'phase-production-build') return [];
  if (env[ENV_FROM_FILE] !== undefined && env[ENV_FROM_FILE] !== '') return [];
  return checkRuntimeEnv(rules, env);
}

/**
 * Writes the problems to the terminal and ends the process.
 *
 * Node only, and deliberately not written in an instrumentation hook's own
 * body: Next bundles that hook for the Edge runtime as well, where `process`
 * does not exist, and warns about every use of it. The applications import
 * this dynamically behind their runtime check, which is the shape the hook
 * already uses for everything else that needs Node.
 */
export function refuseToStartUnconfigured(rules: readonly EnvRule[], env: Env = process.env): void {
  const problems = productionEnvProblems(rules, env);
  if (problems.length === 0) return;
  process.stderr.write(describeEnvProblems(problems));
  process.exit(1);
}

/** One line per problem, for the terminal. The values are never printed. */
export function describeEnvProblems(problems: readonly EnvProblem[]): string {
  const lines = problems.map((problem) => `  ${problem.variable} ${problem.problem}`);
  return [
    'Refusing to start: the environment is not configured for production.',
    ...lines,
    'See docs/deployment.md for every variable a deployment sets.',
    '',
  ].join('\n');
}
