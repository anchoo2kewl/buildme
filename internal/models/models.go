package models

import "time"

// BuildStatus represents a normalized CI build status.
type BuildStatus string

const (
	BuildStatusQueued    BuildStatus = "queued"
	BuildStatusRunning   BuildStatus = "running"
	BuildStatusSuccess   BuildStatus = "success"
	BuildStatusFailure   BuildStatus = "failure"
	BuildStatusCancelled BuildStatus = "cancelled"
	BuildStatusError     BuildStatus = "error"
	BuildStatusSkipped   BuildStatus = "skipped"
)

func (s BuildStatus) IsTerminal() bool {
	switch s {
	case BuildStatusSuccess, BuildStatusFailure, BuildStatusCancelled, BuildStatusError, BuildStatusSkipped:
		return true
	}
	return false
}

// ProviderType represents a CI/CD provider.
type ProviderType string

const (
	ProviderGitHub   ProviderType = "github"
	ProviderTravis   ProviderType = "travis"
	ProviderCircleCI ProviderType = "circleci"
)

// ProjectRole represents a member's role in a project.
type ProjectRole string

const (
	RoleOwner  ProjectRole = "owner"
	RoleAdmin  ProjectRole = "admin"
	RoleEditor ProjectRole = "editor"
	RoleViewer ProjectRole = "viewer"
)

func (r ProjectRole) Level() int {
	switch r {
	case RoleOwner:
		return 4
	case RoleAdmin:
		return 3
	case RoleEditor:
		return 2
	case RoleViewer:
		return 1
	}
	return 0
}

// ChannelType represents a notification channel type.
type ChannelType string

const (
	ChannelEmail   ChannelType = "email"
	ChannelWebhook ChannelType = "webhook"
	ChannelWebPush ChannelType = "webpush"
)

// NotificationStatus represents the status of a notification delivery.
type NotificationStatus string

const (
	NotifSending    NotificationStatus = "sending"
	NotifSent       NotificationStatus = "sent"
	NotifRetry      NotificationStatus = "retry"
	NotifDeadLetter NotificationStatus = "dead_letter"
)

// User represents an application user.
type User struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	GitHubID     *int64    `json:"github_id,omitempty"`
	GitHubLogin  string    `json:"github_login,omitempty"`
	DisplayName  string    `json:"display_name"`
	AvatarURL    string    `json:"avatar_url,omitempty"`
	IsSuperAdmin bool      `json:"is_super_admin"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Project represents a monitored project group.
type Project struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Description string    `json:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// ProjectMember represents a user's membership in a project.
type ProjectMember struct {
	ProjectID int64       `json:"project_id"`
	UserID    int64       `json:"user_id"`
	Role      ProjectRole `json:"role"`
	CreatedAt time.Time   `json:"created_at"`
	User      *User       `json:"user,omitempty"`
}

// CIProvider represents a linked CI connection for a project.
type CIProvider struct {
	ID             int64        `json:"id"`
	ProjectID      int64        `json:"project_id"`
	ProviderType   ProviderType `json:"provider_type"`
	DisplayName    string       `json:"display_name"`
	RepoOwner      string       `json:"repo_owner"`
	RepoName       string       `json:"repo_name"`
	APIToken       string       `json:"-"`
	WebhookSecret  string       `json:"-"`
	PollIntervalS  int          `json:"poll_interval_s"`
	NextPollAt     time.Time    `json:"next_poll_at"`
	Enabled        bool         `json:"enabled"`
	CreatedAt      time.Time    `json:"created_at"`
	UpdatedAt      time.Time    `json:"updated_at"`
}

// Build represents a normalized build from any CI provider.
type Build struct {
	ID            int64       `json:"id"`
	ProjectID     int64       `json:"project_id"`
	ProviderID    int64       `json:"provider_id"`
	ExternalID    string      `json:"external_id"`
	Status        BuildStatus `json:"status"`
	Branch        string      `json:"branch"`
	CommitSHA     string      `json:"commit_sha"`
	CommitMessage string      `json:"commit_message"`
	CommitAuthor  string      `json:"commit_author"`
	Trigger       string      `json:"trigger"`
	WorkflowName  string      `json:"workflow_name"`
	DurationMS    *int64      `json:"duration_ms,omitempty"`
	StartedAt     *time.Time  `json:"started_at,omitempty"`
	FinishedAt    *time.Time  `json:"finished_at,omitempty"`
	ProviderURL   string      `json:"provider_url"`
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`

	// Joined fields
	ProviderType ProviderType `json:"provider_type,omitempty"`
	Jobs         []BuildJob   `json:"jobs,omitempty"`
}

// BuildJob represents an individual job within a build.
type BuildJob struct {
	ID         int64       `json:"id"`
	BuildID    int64       `json:"build_id"`
	ExternalID string      `json:"external_id"`
	Name       string      `json:"name"`
	Status     BuildStatus `json:"status"`
	DurationMS *int64      `json:"duration_ms,omitempty"`
	StartedAt  *time.Time  `json:"started_at,omitempty"`
	FinishedAt *time.Time  `json:"finished_at,omitempty"`
	CreatedAt  time.Time   `json:"created_at"`
	UpdatedAt  time.Time   `json:"updated_at"`
}

// NotificationChannel represents a per-project notification routing config.
type NotificationChannel struct {
	ID          int64       `json:"id"`
	ProjectID   int64       `json:"project_id"`
	ChannelType ChannelType `json:"channel_type"`
	Config      string      `json:"config"`
	EventFilter string      `json:"event_filter"`
	Enabled     bool        `json:"enabled"`
	CreatedAt   time.Time   `json:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at"`
}

// NotificationLog represents an audit trail + retry queue entry.
type NotificationLog struct {
	ID          int64              `json:"id"`
	ChannelID   int64              `json:"channel_id"`
	BuildID     int64              `json:"build_id"`
	EventType   string             `json:"event_type"`
	Status      NotificationStatus `json:"status"`
	Attempts    int                `json:"attempts"`
	NextRetryAt *time.Time         `json:"next_retry_at,omitempty"`
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
}

// PushSubscription represents a Web Push API subscription.
type PushSubscription struct {
	ID       int64  `json:"id"`
	UserID   int64  `json:"user_id"`
	Endpoint string `json:"endpoint"`
	P256dh   string `json:"p256dh_key"`
	Auth     string `json:"auth_key"`
}

// BuildEvent is a WebSocket event payload.
type BuildEvent struct {
	Type      string `json:"type"`
	ProjectID int64  `json:"project_id"`
	Build     *Build `json:"build,omitempty"`
	Job       *BuildJob `json:"job,omitempty"`
}

// Pagination holds pagination parameters.
type Pagination struct {
	Page    int `json:"page"`
	PerPage int `json:"per_page"`
}

// BuildFilter holds build list filter parameters.
type BuildFilter struct {
	Branch string      `json:"branch,omitempty"`
	Status BuildStatus `json:"status,omitempty"`
	Pagination
}
