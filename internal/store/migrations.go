package store

const schema = `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL DEFAULT '',
    github_id INTEGER UNIQUE,
    github_login TEXT NOT NULL DEFAULT '',
    display_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT NOT NULL DEFAULT '',
    is_super_admin INTEGER NOT NULL DEFAULT 0,
    invites_remaining INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    staging_url TEXT NOT NULL DEFAULT '',
    uat_url TEXT NOT NULL DEFAULT '',
    production_url TEXT NOT NULL DEFAULT '',
    version_path TEXT NOT NULL DEFAULT '/api/version',
    version_field TEXT NOT NULL DEFAULT 'git_commit',
    health_path TEXT NOT NULL DEFAULT '/health',
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_members (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'viewer',
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

CREATE TABLE IF NOT EXISTS ci_providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider_type TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    repo_owner TEXT NOT NULL DEFAULT '',
    repo_name TEXT NOT NULL DEFAULT '',
    api_token TEXT NOT NULL DEFAULT '',
    webhook_secret TEXT NOT NULL DEFAULT '',
    poll_interval_s INTEGER NOT NULL DEFAULT 60,
    next_poll_at DATETIME NOT NULL DEFAULT (datetime('now')),
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ci_providers_poll ON ci_providers(next_poll_at) WHERE enabled = 1;

CREATE TABLE IF NOT EXISTS builds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider_id INTEGER NOT NULL REFERENCES ci_providers(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    status TEXT NOT NULL,
    branch TEXT NOT NULL DEFAULT '',
    commit_sha TEXT NOT NULL DEFAULT '',
    commit_message TEXT NOT NULL DEFAULT '',
    commit_author TEXT NOT NULL DEFAULT '',
    trigger TEXT NOT NULL DEFAULT '',
    workflow_name TEXT NOT NULL DEFAULT '',
    duration_ms INTEGER,
    started_at DATETIME,
    finished_at DATETIME,
    provider_url TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
    UNIQUE(provider_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_builds_project_created ON builds(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS build_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    build_id INTEGER NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    external_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL,
    duration_ms INTEGER,
    started_at DATETIME,
    finished_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now')),
    UNIQUE(build_id, external_id)
);

CREATE TABLE IF NOT EXISTS notification_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    channel_type TEXT NOT NULL,
    config TEXT NOT NULL DEFAULT '{}',
    event_filter TEXT NOT NULL DEFAULT '[]',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notification_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL REFERENCES notification_channels(id) ON DELETE CASCADE,
    build_id INTEGER NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sending',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_retry_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    used_by INTEGER REFERENCES users(id),
    email TEXT NOT NULL DEFAULT '',
    used_at DATETIME,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(code);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    last_used_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT (datetime('now')),
    expires_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
`

// migrations contains incremental ALTER TABLE statements.
// Errors are ignored (column may already exist on existing DBs).
var migrations = []string{
	"ALTER TABLE projects ADD COLUMN staging_url TEXT NOT NULL DEFAULT ''",
	"ALTER TABLE projects ADD COLUMN uat_url TEXT NOT NULL DEFAULT ''",
	"ALTER TABLE projects ADD COLUMN production_url TEXT NOT NULL DEFAULT ''",
	"ALTER TABLE projects ADD COLUMN version_path TEXT NOT NULL DEFAULT '/api/version'",
	"ALTER TABLE projects ADD COLUMN version_field TEXT NOT NULL DEFAULT 'git_commit'",
	"ALTER TABLE projects ADD COLUMN health_path TEXT NOT NULL DEFAULT '/health'",
	`CREATE TABLE IF NOT EXISTS api_keys (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		name TEXT NOT NULL,
		key_hash TEXT NOT NULL UNIQUE,
		key_prefix TEXT NOT NULL,
		last_used_at DATETIME,
		created_at DATETIME NOT NULL DEFAULT (datetime('now')),
		expires_at DATETIME
	)`,
	"CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id)",
	"CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)",
	"ALTER TABLE projects ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}'",
}
