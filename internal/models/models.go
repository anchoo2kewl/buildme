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
	ProviderGitHub      ProviderType = "github"
	ProviderGitHubLocal ProviderType = "github_local"
	ProviderTravis      ProviderType = "travis"
	ProviderCircleCI    ProviderType = "circleci"
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
	ID               int64     `json:"id"`
	Email            string    `json:"email"`
	PasswordHash     string    `json:"-"`
	GitHubID         *int64    `json:"github_id,omitempty"`
	GitHubLogin      string    `json:"github_login,omitempty"`
	DisplayName      string    `json:"display_name"`
	AvatarURL        string    `json:"avatar_url,omitempty"`
	IsSuperAdmin     bool      `json:"is_super_admin"`
	InvitesRemaining int       `json:"invites_remaining"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// Invite represents a registration invite code.
type Invite struct {
	ID        int64      `json:"id"`
	Code      string     `json:"code"`
	CreatedBy int64      `json:"created_by"`
	UsedBy    *int64     `json:"used_by,omitempty"`
	Email     string     `json:"email,omitempty"`
	UsedAt    *time.Time `json:"used_at,omitempty"`
	ExpiresAt time.Time  `json:"expires_at"`
	CreatedAt time.Time  `json:"created_at"`
}

// Project represents a monitored project group.
type Project struct {
	ID            int64     `json:"id"`
	Name          string    `json:"name"`
	Slug          string    `json:"slug"`
	Description   string    `json:"description,omitempty"`
	StagingURL    string    `json:"staging_url,omitempty"`
	UATURL        string    `json:"uat_url,omitempty"`
	ProductionURL string    `json:"production_url,omitempty"`
	VersionPath   string    `json:"version_path,omitempty"`
	VersionField  string    `json:"version_field,omitempty"`
	HealthPath    string    `json:"health_path,omitempty"`
	Metadata      string    `json:"metadata,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
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

// APIKey represents a user's API key for programmatic access.
type APIKey struct {
	ID         int64      `json:"id"`
	UserID     int64      `json:"user_id"`
	Name       string     `json:"name"`
	KeyHash    string     `json:"-"`
	KeyPrefix  string     `json:"key_prefix"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`
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

// EnvironmentStatus holds the status of a single environment for a project.
type EnvironmentStatus struct {
	ProjectID         int64                  `json:"project_id"`
	ProjectName       string                 `json:"project_name"`
	Env               string                 `json:"env"`
	BaseURL           string                 `json:"base_url"`
	DeployedSHA       string                 `json:"deployed_sha"`
	VersionInfo       map[string]interface{} `json:"version_info"`
	HealthStatus      int                    `json:"health_status"`
	ResponseTimeMS    int64                  `json:"response_time_ms"`
	BranchHeadSHA     string                 `json:"branch_head_sha,omitempty"`
	IsDrifted         bool                   `json:"is_drifted"`
	CheckedAt         string                 `json:"checked_at"`
	Error             string                 `json:"error,omitempty"`
	MCPHealthStatus   int                    `json:"mcp_health_status,omitempty"`
	MCPResponseTimeMS int64                  `json:"mcp_response_time_ms,omitempty"`
}

// DriftProject groups environment statuses for a single project.
type DriftProject struct {
	Project      Project             `json:"project"`
	Environments []EnvironmentStatus `json:"environments"`
}

// DriftDashboard is the response type for the drift check endpoint.
type DriftDashboard struct {
	Projects []DriftProject `json:"projects"`
}

// VersionSnapshot stores a point-in-time version/health check for a project environment.
type VersionSnapshot struct {
	ID             int64     `json:"id"`
	ProjectID      int64     `json:"project_id"`
	Env            string    `json:"env"`
	VersionInfo    string    `json:"version_info"`
	DeployedSHA    string    `json:"deployed_sha"`
	HealthStatus   int       `json:"health_status"`
	ResponseTimeMS int64     `json:"response_time_ms"`
	Service        string    `json:"service"`
	CreatedAt      time.Time `json:"created_at"`
}

// MetricPoint stores a structured time-series metric extracted from version data.
type MetricPoint struct {
	ID                    int64     `json:"id"`
	ProjectID             int64     `json:"project_id"`
	Env                   string    `json:"env"`
	MemoryAllocMB         float64   `json:"memory_alloc_mb"`
	HeapInuseMB           float64   `json:"heap_inuse_mb"`
	Goroutines            int       `json:"goroutines"`
	GCPauseMS             float64   `json:"gc_pause_ms"`
	ContainerMemoryMB     float64   `json:"container_memory_mb"`
	ContainerMemoryLimitMB float64  `json:"container_memory_limit_mb"`
	CPUUsageNS            int64     `json:"cpu_usage_ns"`
	ResponseTimeMS        int64     `json:"response_time_ms"`
	CreatedAt             time.Time `json:"created_at"`
}

// ResourceIncident records a threshold breach for a resource metric.
type ResourceIncident struct {
	ID          int64      `json:"id"`
	ProjectID   int64      `json:"project_id"`
	ProjectName string     `json:"project_name,omitempty"`
	Env         string     `json:"env"`
	Metric      string     `json:"metric"`
	Value       float64    `json:"value"`
	Threshold   float64    `json:"threshold"`
	Message     string     `json:"message"`
	CreatedAt   time.Time  `json:"created_at"`
	ResolvedAt  *time.Time `json:"resolved_at,omitempty"`
}

// VersionOverviewEntry is the latest snapshot for a project+env, enriched with project name.
type VersionOverviewEntry struct {
	ProjectID         int64                  `json:"project_id"`
	ProjectName       string                 `json:"project_name"`
	Env               string                 `json:"env"`
	VersionInfo       map[string]interface{} `json:"version_info"`
	DeployedSHA       string                 `json:"deployed_sha"`
	HealthStatus      int                    `json:"health_status"`
	ResponseTimeMS    int64                  `json:"response_time_ms"`
	CheckedAt         string                 `json:"checked_at"`
	MCPHealthStatus   int                    `json:"mcp_health_status,omitempty"`
	MCPResponseTimeMS int64                  `json:"mcp_response_time_ms,omitempty"`
}
