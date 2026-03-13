package store

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/anchoo2kewl/buildme/internal/models"
	_ "modernc.org/sqlite"
)

type SQLiteStore struct {
	db *sql.DB
}

func NewSQLite(path string) (*SQLiteStore, error) {
	dsn := fmt.Sprintf("file:%s?_journal_mode=WAL&_busy_timeout=5000&_foreign_keys=ON", path)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)

	if _, err := db.Exec(schema); err != nil {
		return nil, fmt.Errorf("run migrations: %w", err)
	}

	// Run incremental migrations (ignore errors for existing columns)
	for _, m := range migrations {
		db.Exec(m)
	}

	return &SQLiteStore{db: db}, nil
}

func (s *SQLiteStore) Close() error {
	return s.db.Close()
}

// --- Users ---

func (s *SQLiteStore) CreateUser(ctx context.Context, u *models.User) error {
	res, err := s.db.ExecContext(ctx,
		`INSERT INTO users (email, password_hash, github_id, github_login, display_name, avatar_url, is_super_admin, invites_remaining)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		u.Email, u.PasswordHash, u.GitHubID, u.GitHubLogin, u.DisplayName, u.AvatarURL, u.IsSuperAdmin, u.InvitesRemaining)
	if err != nil {
		return err
	}
	u.ID, _ = res.LastInsertId()
	return nil
}

func (s *SQLiteStore) GetUserByID(ctx context.Context, id int64) (*models.User, error) {
	return s.scanUser(s.db.QueryRowContext(ctx,
		`SELECT id, email, password_hash, github_id, github_login, display_name, avatar_url, is_super_admin, invites_remaining, created_at, updated_at
		 FROM users WHERE id = ?`, id))
}

func (s *SQLiteStore) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	return s.scanUser(s.db.QueryRowContext(ctx,
		`SELECT id, email, password_hash, github_id, github_login, display_name, avatar_url, is_super_admin, invites_remaining, created_at, updated_at
		 FROM users WHERE email = ?`, email))
}

func (s *SQLiteStore) GetUserByGitHubID(ctx context.Context, githubID int64) (*models.User, error) {
	return s.scanUser(s.db.QueryRowContext(ctx,
		`SELECT id, email, password_hash, github_id, github_login, display_name, avatar_url, is_super_admin, invites_remaining, created_at, updated_at
		 FROM users WHERE github_id = ?`, githubID))
}

func (s *SQLiteStore) UpdateUser(ctx context.Context, u *models.User) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE users SET email=?, password_hash=?, github_id=?, github_login=?, display_name=?, avatar_url=?, invites_remaining=?, updated_at=datetime('now')
		 WHERE id=?`,
		u.Email, u.PasswordHash, u.GitHubID, u.GitHubLogin, u.DisplayName, u.AvatarURL, u.InvitesRemaining, u.ID)
	return err
}

func (s *SQLiteStore) scanUser(row *sql.Row) (*models.User, error) {
	u := &models.User{}
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.GitHubID, &u.GitHubLogin,
		&u.DisplayName, &u.AvatarURL, &u.IsSuperAdmin, &u.InvitesRemaining, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return u, err
}

// --- Projects ---

func (s *SQLiteStore) CreateProject(ctx context.Context, p *models.Project) error {
	res, err := s.db.ExecContext(ctx,
		`INSERT INTO projects (name, slug, description, staging_url, uat_url, production_url, version_path, version_field, health_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.Name, p.Slug, p.Description, p.StagingURL, p.UATURL, p.ProductionURL, p.VersionPath, p.VersionField, p.HealthPath)
	if err != nil {
		return err
	}
	p.ID, _ = res.LastInsertId()
	return nil
}

func (s *SQLiteStore) GetProjectByID(ctx context.Context, id int64) (*models.Project, error) {
	p := &models.Project{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, name, slug, description, staging_url, uat_url, production_url, version_path, version_field, health_path, created_at, updated_at FROM projects WHERE id = ?`, id).
		Scan(&p.ID, &p.Name, &p.Slug, &p.Description, &p.StagingURL, &p.UATURL, &p.ProductionURL, &p.VersionPath, &p.VersionField, &p.HealthPath, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return p, err
}

func (s *SQLiteStore) GetProjectBySlug(ctx context.Context, slug string) (*models.Project, error) {
	p := &models.Project{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, name, slug, description, staging_url, uat_url, production_url, version_path, version_field, health_path, created_at, updated_at FROM projects WHERE slug = ?`, slug).
		Scan(&p.ID, &p.Name, &p.Slug, &p.Description, &p.StagingURL, &p.UATURL, &p.ProductionURL, &p.VersionPath, &p.VersionField, &p.HealthPath, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return p, err
}

func (s *SQLiteStore) UpdateProject(ctx context.Context, p *models.Project) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE projects SET name=?, slug=?, description=?, staging_url=?, uat_url=?, production_url=?, version_path=?, version_field=?, health_path=?, updated_at=datetime('now') WHERE id=?`,
		p.Name, p.Slug, p.Description, p.StagingURL, p.UATURL, p.ProductionURL, p.VersionPath, p.VersionField, p.HealthPath, p.ID)
	return err
}

func (s *SQLiteStore) DeleteProject(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM projects WHERE id=?`, id)
	return err
}

func (s *SQLiteStore) ListProjectsForUser(ctx context.Context, userID int64) ([]models.Project, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT p.id, p.name, p.slug, p.description, p.staging_url, p.uat_url, p.production_url, p.version_path, p.version_field, p.health_path, p.created_at, p.updated_at
		 FROM projects p
		 JOIN project_members pm ON pm.project_id = p.id
		 WHERE pm.user_id = ?
		 ORDER BY p.name`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []models.Project
	for rows.Next() {
		var p models.Project
		if err := rows.Scan(&p.ID, &p.Name, &p.Slug, &p.Description, &p.StagingURL, &p.UATURL, &p.ProductionURL, &p.VersionPath, &p.VersionField, &p.HealthPath, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, rows.Err()
}

// --- Project Members ---

func (s *SQLiteStore) AddProjectMember(ctx context.Context, m *models.ProjectMember) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)`,
		m.ProjectID, m.UserID, m.Role)
	return err
}

func (s *SQLiteStore) GetProjectMember(ctx context.Context, projectID, userID int64) (*models.ProjectMember, error) {
	m := &models.ProjectMember{}
	err := s.db.QueryRowContext(ctx,
		`SELECT project_id, user_id, role, created_at FROM project_members WHERE project_id=? AND user_id=?`,
		projectID, userID).Scan(&m.ProjectID, &m.UserID, &m.Role, &m.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return m, err
}

func (s *SQLiteStore) UpdateProjectMemberRole(ctx context.Context, projectID, userID int64, role models.ProjectRole) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE project_members SET role=? WHERE project_id=? AND user_id=?`,
		role, projectID, userID)
	return err
}

func (s *SQLiteStore) RemoveProjectMember(ctx context.Context, projectID, userID int64) error {
	_, err := s.db.ExecContext(ctx,
		`DELETE FROM project_members WHERE project_id=? AND user_id=?`,
		projectID, userID)
	return err
}

func (s *SQLiteStore) ListProjectMembers(ctx context.Context, projectID int64) ([]models.ProjectMember, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT pm.project_id, pm.user_id, pm.role, pm.created_at,
		        u.id, u.email, u.display_name, u.avatar_url
		 FROM project_members pm
		 JOIN users u ON u.id = pm.user_id
		 WHERE pm.project_id = ?
		 ORDER BY pm.role, u.display_name`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var members []models.ProjectMember
	for rows.Next() {
		var m models.ProjectMember
		u := &models.User{}
		if err := rows.Scan(&m.ProjectID, &m.UserID, &m.Role, &m.CreatedAt,
			&u.ID, &u.Email, &u.DisplayName, &u.AvatarURL); err != nil {
			return nil, err
		}
		m.User = u
		members = append(members, m)
	}
	return members, rows.Err()
}

// --- CI Providers ---

func (s *SQLiteStore) CreateCIProvider(ctx context.Context, p *models.CIProvider) error {
	res, err := s.db.ExecContext(ctx,
		`INSERT INTO ci_providers (project_id, provider_type, display_name, repo_owner, repo_name, api_token, webhook_secret, poll_interval_s, enabled)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		p.ProjectID, p.ProviderType, p.DisplayName, p.RepoOwner, p.RepoName, p.APIToken, p.WebhookSecret, p.PollIntervalS, p.Enabled)
	if err != nil {
		return err
	}
	p.ID, _ = res.LastInsertId()
	return nil
}

func (s *SQLiteStore) GetCIProviderByID(ctx context.Context, id int64) (*models.CIProvider, error) {
	p := &models.CIProvider{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, project_id, provider_type, display_name, repo_owner, repo_name, api_token, webhook_secret, poll_interval_s, next_poll_at, enabled, created_at, updated_at
		 FROM ci_providers WHERE id = ?`, id).
		Scan(&p.ID, &p.ProjectID, &p.ProviderType, &p.DisplayName, &p.RepoOwner, &p.RepoName, &p.APIToken, &p.WebhookSecret, &p.PollIntervalS, &p.NextPollAt, &p.Enabled, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return p, err
}

func (s *SQLiteStore) UpdateCIProvider(ctx context.Context, p *models.CIProvider) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE ci_providers SET display_name=?, repo_owner=?, repo_name=?, api_token=?, webhook_secret=?, poll_interval_s=?, enabled=?, updated_at=datetime('now')
		 WHERE id=?`,
		p.DisplayName, p.RepoOwner, p.RepoName, p.APIToken, p.WebhookSecret, p.PollIntervalS, p.Enabled, p.ID)
	return err
}

func (s *SQLiteStore) DeleteCIProvider(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM ci_providers WHERE id=?`, id)
	return err
}

func (s *SQLiteStore) ListCIProviders(ctx context.Context, projectID int64) ([]models.CIProvider, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, project_id, provider_type, display_name, repo_owner, repo_name, poll_interval_s, next_poll_at, enabled, created_at, updated_at
		 FROM ci_providers WHERE project_id = ?`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var providers []models.CIProvider
	for rows.Next() {
		var p models.CIProvider
		if err := rows.Scan(&p.ID, &p.ProjectID, &p.ProviderType, &p.DisplayName, &p.RepoOwner, &p.RepoName, &p.PollIntervalS, &p.NextPollAt, &p.Enabled, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		providers = append(providers, p)
	}
	return providers, rows.Err()
}

func (s *SQLiteStore) GetDueProviders(ctx context.Context, now time.Time) ([]models.CIProvider, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, project_id, provider_type, display_name, repo_owner, repo_name, api_token, webhook_secret, poll_interval_s, next_poll_at, enabled, created_at, updated_at
		 FROM ci_providers WHERE enabled = 1 AND next_poll_at <= ?`, now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var providers []models.CIProvider
	for rows.Next() {
		var p models.CIProvider
		if err := rows.Scan(&p.ID, &p.ProjectID, &p.ProviderType, &p.DisplayName, &p.RepoOwner, &p.RepoName, &p.APIToken, &p.WebhookSecret, &p.PollIntervalS, &p.NextPollAt, &p.Enabled, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		providers = append(providers, p)
	}
	return providers, rows.Err()
}

func (s *SQLiteStore) ListAllProvidersByType(ctx context.Context, providerType models.ProviderType) ([]models.CIProvider, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, project_id, provider_type, display_name, repo_owner, repo_name, api_token, webhook_secret, poll_interval_s, next_poll_at, enabled, created_at, updated_at
		 FROM ci_providers WHERE provider_type = ?`, providerType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var providers []models.CIProvider
	for rows.Next() {
		var p models.CIProvider
		if err := rows.Scan(&p.ID, &p.ProjectID, &p.ProviderType, &p.DisplayName, &p.RepoOwner, &p.RepoName, &p.APIToken, &p.WebhookSecret, &p.PollIntervalS, &p.NextPollAt, &p.Enabled, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		providers = append(providers, p)
	}
	return providers, rows.Err()
}

func (s *SQLiteStore) UpdateProviderNextPoll(ctx context.Context, id int64, next time.Time) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE ci_providers SET next_poll_at=? WHERE id=?`, next, id)
	return err
}

// --- Builds ---

func (s *SQLiteStore) UpsertBuild(ctx context.Context, b *models.Build) (bool, error) {
	existing, err := s.GetBuildByExternalID(ctx, b.ProviderID, b.ExternalID)
	if err != nil {
		return false, err
	}

	if existing != nil {
		b.ID = existing.ID
		_, err := s.db.ExecContext(ctx,
			`UPDATE builds SET status=?, branch=?, commit_sha=?, commit_message=?, commit_author=?, trigger=?, workflow_name=?, duration_ms=?, started_at=?, finished_at=?, provider_url=?, updated_at=datetime('now')
			 WHERE id=?`,
			b.Status, b.Branch, b.CommitSHA, b.CommitMessage, b.CommitAuthor, b.Trigger, b.WorkflowName, b.DurationMS, b.StartedAt, b.FinishedAt, b.ProviderURL, b.ID)
		return false, err
	}

	res, err := s.db.ExecContext(ctx,
		`INSERT INTO builds (project_id, provider_id, external_id, status, branch, commit_sha, commit_message, commit_author, trigger, workflow_name, duration_ms, started_at, finished_at, provider_url)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		b.ProjectID, b.ProviderID, b.ExternalID, b.Status, b.Branch, b.CommitSHA, b.CommitMessage, b.CommitAuthor, b.Trigger, b.WorkflowName, b.DurationMS, b.StartedAt, b.FinishedAt, b.ProviderURL)
	if err != nil {
		return false, err
	}
	b.ID, _ = res.LastInsertId()
	return true, nil
}

func (s *SQLiteStore) GetBuildByID(ctx context.Context, id int64) (*models.Build, error) {
	b := &models.Build{}
	err := s.db.QueryRowContext(ctx,
		`SELECT b.id, b.project_id, b.provider_id, b.external_id, b.status, b.branch, b.commit_sha, b.commit_message, b.commit_author, b.trigger, b.workflow_name, b.duration_ms, b.started_at, b.finished_at, b.provider_url, b.created_at, b.updated_at, cp.provider_type
		 FROM builds b JOIN ci_providers cp ON cp.id = b.provider_id
		 WHERE b.id = ?`, id).
		Scan(&b.ID, &b.ProjectID, &b.ProviderID, &b.ExternalID, &b.Status, &b.Branch, &b.CommitSHA, &b.CommitMessage, &b.CommitAuthor, &b.Trigger, &b.WorkflowName, &b.DurationMS, &b.StartedAt, &b.FinishedAt, &b.ProviderURL, &b.CreatedAt, &b.UpdatedAt, &b.ProviderType)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return b, err
}

func (s *SQLiteStore) GetBuildByExternalID(ctx context.Context, providerID int64, externalID string) (*models.Build, error) {
	b := &models.Build{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, project_id, provider_id, external_id, status, branch, commit_sha, commit_message, commit_author, trigger, workflow_name, duration_ms, started_at, finished_at, provider_url, created_at, updated_at
		 FROM builds WHERE provider_id = ? AND external_id = ?`, providerID, externalID).
		Scan(&b.ID, &b.ProjectID, &b.ProviderID, &b.ExternalID, &b.Status, &b.Branch, &b.CommitSHA, &b.CommitMessage, &b.CommitAuthor, &b.Trigger, &b.WorkflowName, &b.DurationMS, &b.StartedAt, &b.FinishedAt, &b.ProviderURL, &b.CreatedAt, &b.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return b, err
}

func (s *SQLiteStore) ListBuilds(ctx context.Context, projectID int64, filter models.BuildFilter) ([]models.Build, int, error) {
	where := "WHERE b.project_id = ?"
	args := []any{projectID}

	if filter.Branch != "" {
		where += " AND b.branch = ?"
		args = append(args, filter.Branch)
	}
	if filter.Status != "" {
		where += " AND b.status = ?"
		args = append(args, filter.Status)
	}

	var total int
	countArgs := make([]any, len(args))
	copy(countArgs, args)
	err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM builds b "+where, countArgs...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	page := filter.Page
	if page < 1 {
		page = 1
	}
	perPage := filter.PerPage
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	query := fmt.Sprintf(
		`SELECT b.id, b.project_id, b.provider_id, b.external_id, b.status, b.branch, b.commit_sha, b.commit_message, b.commit_author, b.trigger, b.workflow_name, b.duration_ms, b.started_at, b.finished_at, b.provider_url, b.created_at, b.updated_at, cp.provider_type
		 FROM builds b JOIN ci_providers cp ON cp.id = b.provider_id
		 %s ORDER BY b.created_at DESC LIMIT ? OFFSET ?`, where)
	args = append(args, perPage, offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var builds []models.Build
	for rows.Next() {
		var b models.Build
		if err := rows.Scan(&b.ID, &b.ProjectID, &b.ProviderID, &b.ExternalID, &b.Status, &b.Branch, &b.CommitSHA, &b.CommitMessage, &b.CommitAuthor, &b.Trigger, &b.WorkflowName, &b.DurationMS, &b.StartedAt, &b.FinishedAt, &b.ProviderURL, &b.CreatedAt, &b.UpdatedAt, &b.ProviderType); err != nil {
			return nil, 0, err
		}
		builds = append(builds, b)
	}
	return builds, total, rows.Err()
}

func (s *SQLiteStore) GetPreviousBuild(ctx context.Context, projectID int64, branch string, beforeID int64) (*models.Build, error) {
	b := &models.Build{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, project_id, provider_id, external_id, status, branch, commit_sha, commit_message, commit_author, trigger, workflow_name, duration_ms, started_at, finished_at, provider_url, created_at, updated_at
		 FROM builds WHERE project_id = ? AND branch = ? AND id < ? ORDER BY id DESC LIMIT 1`,
		projectID, branch, beforeID).
		Scan(&b.ID, &b.ProjectID, &b.ProviderID, &b.ExternalID, &b.Status, &b.Branch, &b.CommitSHA, &b.CommitMessage, &b.CommitAuthor, &b.Trigger, &b.WorkflowName, &b.DurationMS, &b.StartedAt, &b.FinishedAt, &b.ProviderURL, &b.CreatedAt, &b.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return b, err
}

// --- Build Jobs ---

func (s *SQLiteStore) UpsertBuildJob(ctx context.Context, j *models.BuildJob) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO build_jobs (build_id, external_id, name, status, duration_ms, started_at, finished_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?)
		 ON CONFLICT(build_id, external_id) DO UPDATE SET
		   name=excluded.name, status=excluded.status, duration_ms=excluded.duration_ms,
		   started_at=excluded.started_at, finished_at=excluded.finished_at, updated_at=datetime('now')`,
		j.BuildID, j.ExternalID, j.Name, j.Status, j.DurationMS, j.StartedAt, j.FinishedAt)
	return err
}

func (s *SQLiteStore) ListBuildJobs(ctx context.Context, buildID int64) ([]models.BuildJob, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, build_id, external_id, name, status, duration_ms, started_at, finished_at, created_at, updated_at
		 FROM build_jobs WHERE build_id = ? ORDER BY id`, buildID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []models.BuildJob
	for rows.Next() {
		var j models.BuildJob
		if err := rows.Scan(&j.ID, &j.BuildID, &j.ExternalID, &j.Name, &j.Status, &j.DurationMS, &j.StartedAt, &j.FinishedAt, &j.CreatedAt, &j.UpdatedAt); err != nil {
			return nil, err
		}
		jobs = append(jobs, j)
	}
	return jobs, rows.Err()
}

// --- Notification Channels ---

func (s *SQLiteStore) CreateNotificationChannel(ctx context.Context, ch *models.NotificationChannel) error {
	res, err := s.db.ExecContext(ctx,
		`INSERT INTO notification_channels (project_id, channel_type, config, event_filter, enabled) VALUES (?, ?, ?, ?, ?)`,
		ch.ProjectID, ch.ChannelType, ch.Config, ch.EventFilter, ch.Enabled)
	if err != nil {
		return err
	}
	ch.ID, _ = res.LastInsertId()
	return nil
}

func (s *SQLiteStore) GetNotificationChannelByID(ctx context.Context, id int64) (*models.NotificationChannel, error) {
	ch := &models.NotificationChannel{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, project_id, channel_type, config, event_filter, enabled, created_at, updated_at
		 FROM notification_channels WHERE id = ?`, id).
		Scan(&ch.ID, &ch.ProjectID, &ch.ChannelType, &ch.Config, &ch.EventFilter, &ch.Enabled, &ch.CreatedAt, &ch.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return ch, err
}

func (s *SQLiteStore) UpdateNotificationChannel(ctx context.Context, ch *models.NotificationChannel) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE notification_channels SET channel_type=?, config=?, event_filter=?, enabled=?, updated_at=datetime('now') WHERE id=?`,
		ch.ChannelType, ch.Config, ch.EventFilter, ch.Enabled, ch.ID)
	return err
}

func (s *SQLiteStore) DeleteNotificationChannel(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM notification_channels WHERE id=?`, id)
	return err
}

func (s *SQLiteStore) ListNotificationChannels(ctx context.Context, projectID int64) ([]models.NotificationChannel, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, project_id, channel_type, config, event_filter, enabled, created_at, updated_at
		 FROM notification_channels WHERE project_id = ?`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var channels []models.NotificationChannel
	for rows.Next() {
		var ch models.NotificationChannel
		if err := rows.Scan(&ch.ID, &ch.ProjectID, &ch.ChannelType, &ch.Config, &ch.EventFilter, &ch.Enabled, &ch.CreatedAt, &ch.UpdatedAt); err != nil {
			return nil, err
		}
		channels = append(channels, ch)
	}
	return channels, rows.Err()
}

// --- Notification Logs ---

func (s *SQLiteStore) CreateNotificationLog(ctx context.Context, l *models.NotificationLog) error {
	res, err := s.db.ExecContext(ctx,
		`INSERT INTO notification_logs (channel_id, build_id, event_type, status, attempts, next_retry_at) VALUES (?, ?, ?, ?, ?, ?)`,
		l.ChannelID, l.BuildID, l.EventType, l.Status, l.Attempts, l.NextRetryAt)
	if err != nil {
		return err
	}
	l.ID, _ = res.LastInsertId()
	return nil
}

func (s *SQLiteStore) UpdateNotificationLog(ctx context.Context, l *models.NotificationLog) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE notification_logs SET status=?, attempts=?, next_retry_at=?, updated_at=datetime('now') WHERE id=?`,
		l.Status, l.Attempts, l.NextRetryAt, l.ID)
	return err
}

func (s *SQLiteStore) GetPendingRetries(ctx context.Context, now time.Time) ([]models.NotificationLog, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, channel_id, build_id, event_type, status, attempts, next_retry_at, created_at, updated_at
		 FROM notification_logs WHERE status = 'retry' AND next_retry_at <= ?`, now)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.NotificationLog
	for rows.Next() {
		var l models.NotificationLog
		if err := rows.Scan(&l.ID, &l.ChannelID, &l.BuildID, &l.EventType, &l.Status, &l.Attempts, &l.NextRetryAt, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	return logs, rows.Err()
}

// --- Invites ---

func (s *SQLiteStore) CreateInvite(ctx context.Context, inv *models.Invite) error {
	res, err := s.db.ExecContext(ctx,
		`INSERT INTO invites (code, created_by, email, expires_at) VALUES (?, ?, ?, ?)`,
		inv.Code, inv.CreatedBy, inv.Email, inv.ExpiresAt)
	if err != nil {
		return err
	}
	inv.ID, _ = res.LastInsertId()
	return nil
}

func (s *SQLiteStore) GetInviteByCode(ctx context.Context, code string) (*models.Invite, error) {
	inv := &models.Invite{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, code, created_by, used_by, email, used_at, expires_at, created_at
		 FROM invites WHERE code = ?`, code).
		Scan(&inv.ID, &inv.Code, &inv.CreatedBy, &inv.UsedBy, &inv.Email, &inv.UsedAt, &inv.ExpiresAt, &inv.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return inv, err
}

func (s *SQLiteStore) RedeemInvite(ctx context.Context, code string, userID int64) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE invites SET used_by = ?, used_at = datetime('now') WHERE code = ? AND used_by IS NULL`,
		userID, code)
	return err
}

func (s *SQLiteStore) ListInvitesByUser(ctx context.Context, userID int64) ([]models.Invite, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, code, created_by, used_by, email, used_at, expires_at, created_at
		 FROM invites WHERE created_by = ? ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invites []models.Invite
	for rows.Next() {
		var inv models.Invite
		if err := rows.Scan(&inv.ID, &inv.Code, &inv.CreatedBy, &inv.UsedBy, &inv.Email, &inv.UsedAt, &inv.ExpiresAt, &inv.CreatedAt); err != nil {
			return nil, err
		}
		invites = append(invites, inv)
	}
	return invites, rows.Err()
}

// --- Push Subscriptions ---

func (s *SQLiteStore) CreatePushSubscription(ctx context.Context, sub *models.PushSubscription) error {
	res, err := s.db.ExecContext(ctx,
		`INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key) VALUES (?, ?, ?, ?)
		 ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id, p256dh_key=excluded.p256dh_key, auth_key=excluded.auth_key`,
		sub.UserID, sub.Endpoint, sub.P256dh, sub.Auth)
	if err != nil {
		return err
	}
	sub.ID, _ = res.LastInsertId()
	return nil
}

func (s *SQLiteStore) DeletePushSubscription(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM push_subscriptions WHERE id=?`, id)
	return err
}

func (s *SQLiteStore) ListPushSubscriptions(ctx context.Context, userIDs []int64) ([]models.PushSubscription, error) {
	if len(userIDs) == 0 {
		return nil, nil
	}
	query := "SELECT id, user_id, endpoint, p256dh_key, auth_key FROM push_subscriptions WHERE user_id IN ("
	args := make([]any, len(userIDs))
	for i, id := range userIDs {
		if i > 0 {
			query += ","
		}
		query += "?"
		args[i] = id
	}
	query += ")"

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subs []models.PushSubscription
	for rows.Next() {
		var sub models.PushSubscription
		if err := rows.Scan(&sub.ID, &sub.UserID, &sub.Endpoint, &sub.P256dh, &sub.Auth); err != nil {
			return nil, err
		}
		subs = append(subs, sub)
	}
	return subs, rows.Err()
}

// --- API Keys ---

func (s *SQLiteStore) CreateAPIKey(ctx context.Context, key *models.APIKey) error {
	res, err := s.db.ExecContext(ctx,
		`INSERT INTO api_keys (user_id, name, key_hash, key_prefix, expires_at) VALUES (?, ?, ?, ?, ?)`,
		key.UserID, key.Name, key.KeyHash, key.KeyPrefix, key.ExpiresAt)
	if err != nil {
		return err
	}
	key.ID, _ = res.LastInsertId()
	return nil
}

func (s *SQLiteStore) ListAPIKeysByUser(ctx context.Context, userID int64) ([]models.APIKey, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, user_id, name, key_prefix, last_used_at, created_at, expires_at
		 FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []models.APIKey
	for rows.Next() {
		var k models.APIKey
		if err := rows.Scan(&k.ID, &k.UserID, &k.Name, &k.KeyPrefix, &k.LastUsedAt, &k.CreatedAt, &k.ExpiresAt); err != nil {
			return nil, err
		}
		keys = append(keys, k)
	}
	return keys, rows.Err()
}

func (s *SQLiteStore) GetUserByAPIKey(ctx context.Context, keyHash string) (*models.User, error) {
	var expiresAt *time.Time
	var userID int64
	var keyID int64
	err := s.db.QueryRowContext(ctx,
		`SELECT id, user_id, expires_at FROM api_keys WHERE key_hash = ?`, keyHash).
		Scan(&keyID, &userID, &expiresAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	// Reject expired keys
	if expiresAt != nil && expiresAt.Before(time.Now()) {
		return nil, nil
	}

	// Update last_used_at
	s.db.ExecContext(ctx, `UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?`, keyID)

	return s.GetUserByID(ctx, userID)
}

func (s *SQLiteStore) DeleteAPIKey(ctx context.Context, id, userID int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM api_keys WHERE id = ? AND user_id = ?`, id, userID)
	return err
}

// App Settings

func (s *SQLiteStore) GetSetting(ctx context.Context, key string) (string, error) {
	var value string
	err := s.db.QueryRowContext(ctx, `SELECT value FROM app_settings WHERE key = ?`, key).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return value, err
}

func (s *SQLiteStore) SetSetting(ctx context.Context, key string, value string) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
		key, value)
	return err
}

func (s *SQLiteStore) GetSettings(ctx context.Context, prefix string) (map[string]string, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT key, value FROM app_settings WHERE key LIKE ?`, prefix+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		settings[k] = v
	}
	return settings, rows.Err()
}
