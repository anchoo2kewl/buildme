package store

import (
	"context"
	"time"

	"github.com/anchoo2kewl/buildme/internal/models"
)

// Store defines all data access methods.
type Store interface {
	Close() error

	// Users
	CreateUser(ctx context.Context, user *models.User) error
	GetUserByID(ctx context.Context, id int64) (*models.User, error)
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUserByGitHubID(ctx context.Context, githubID int64) (*models.User, error)
	UpdateUser(ctx context.Context, user *models.User) error

	// Projects
	CreateProject(ctx context.Context, project *models.Project) error
	GetProjectByID(ctx context.Context, id int64) (*models.Project, error)
	GetProjectBySlug(ctx context.Context, slug string) (*models.Project, error)
	UpdateProject(ctx context.Context, project *models.Project) error
	DeleteProject(ctx context.Context, id int64) error
	ListProjectsForUser(ctx context.Context, userID int64) ([]models.Project, error)

	// Project Members
	AddProjectMember(ctx context.Context, member *models.ProjectMember) error
	GetProjectMember(ctx context.Context, projectID, userID int64) (*models.ProjectMember, error)
	UpdateProjectMemberRole(ctx context.Context, projectID, userID int64, role models.ProjectRole) error
	RemoveProjectMember(ctx context.Context, projectID, userID int64) error
	ListProjectMembers(ctx context.Context, projectID int64) ([]models.ProjectMember, error)

	// CI Providers
	CreateCIProvider(ctx context.Context, p *models.CIProvider) error
	GetCIProviderByID(ctx context.Context, id int64) (*models.CIProvider, error)
	UpdateCIProvider(ctx context.Context, p *models.CIProvider) error
	DeleteCIProvider(ctx context.Context, id int64) error
	ListCIProviders(ctx context.Context, projectID int64) ([]models.CIProvider, error)
	GetDueProviders(ctx context.Context, now time.Time) ([]models.CIProvider, error)
	ListAllProvidersByType(ctx context.Context, providerType models.ProviderType) ([]models.CIProvider, error)
	ListAllCIProviders(ctx context.Context) ([]models.CIProviderWithProject, error)
	UpdateProviderNextPoll(ctx context.Context, id int64, next time.Time) error

	// Builds
	UpsertBuild(ctx context.Context, build *models.Build) (isNew bool, err error)
	GetBuildByID(ctx context.Context, id int64) (*models.Build, error)
	GetBuildByExternalID(ctx context.Context, providerID int64, externalID string) (*models.Build, error)
	ListBuilds(ctx context.Context, projectID int64, filter models.BuildFilter) ([]models.Build, int, error)
	GetPreviousBuild(ctx context.Context, projectID int64, branch string, beforeID int64) (*models.Build, error)

	// Build Jobs
	UpsertBuildJob(ctx context.Context, job *models.BuildJob) error
	ListBuildJobs(ctx context.Context, buildID int64) ([]models.BuildJob, error)

	// Notification Channels
	CreateNotificationChannel(ctx context.Context, ch *models.NotificationChannel) error
	GetNotificationChannelByID(ctx context.Context, id int64) (*models.NotificationChannel, error)
	UpdateNotificationChannel(ctx context.Context, ch *models.NotificationChannel) error
	DeleteNotificationChannel(ctx context.Context, id int64) error
	ListNotificationChannels(ctx context.Context, projectID int64) ([]models.NotificationChannel, error)

	// Notification Logs
	CreateNotificationLog(ctx context.Context, log *models.NotificationLog) error
	UpdateNotificationLog(ctx context.Context, log *models.NotificationLog) error
	GetPendingRetries(ctx context.Context, now time.Time) ([]models.NotificationLog, error)

	// Invites
	CreateInvite(ctx context.Context, invite *models.Invite) error
	GetInviteByCode(ctx context.Context, code string) (*models.Invite, error)
	RedeemInvite(ctx context.Context, code string, userID int64) error
	ListInvitesByUser(ctx context.Context, userID int64) ([]models.Invite, error)

	// Push Subscriptions
	CreatePushSubscription(ctx context.Context, sub *models.PushSubscription) error
	DeletePushSubscription(ctx context.Context, id int64) error
	ListPushSubscriptions(ctx context.Context, userIDs []int64) ([]models.PushSubscription, error)

	// API Keys
	CreateAPIKey(ctx context.Context, key *models.APIKey) error
	ListAPIKeysByUser(ctx context.Context, userID int64) ([]models.APIKey, error)
	GetUserByAPIKey(ctx context.Context, keyHash string) (*models.User, error)
	DeleteAPIKey(ctx context.Context, id, userID int64) error

	// App Settings
	GetSetting(ctx context.Context, key string) (string, error)
	SetSetting(ctx context.Context, key string, value string) error
	GetSettings(ctx context.Context, prefix string) (map[string]string, error)

	// Version Snapshots
	CreateVersionSnapshot(ctx context.Context, snap *models.VersionSnapshot) error
	GetLatestVersionSnapshot(ctx context.Context, projectID int64, env string) (*models.VersionSnapshot, error)
	GetLatestServiceSnapshot(ctx context.Context, projectID int64, env, service string) (*models.VersionSnapshot, error)
	ListVersionSnapshots(ctx context.Context, projectID int64, env string, limit int) ([]models.VersionSnapshot, error)
	PruneVersionSnapshots(ctx context.Context, olderThan time.Time) error

	// Metric Points
	CreateMetricPoint(ctx context.Context, point *models.MetricPoint) error
	ListMetricPoints(ctx context.Context, projectID int64, env string, since time.Time) ([]models.MetricPoint, error)
	PruneMetricPoints(ctx context.Context, olderThan time.Time) error

	// Resource Incidents
	CreateResourceIncident(ctx context.Context, incident *models.ResourceIncident) error
	ListResourceIncidents(ctx context.Context, projectID int64, limit int, showAll bool) ([]models.ResourceIncident, error)
	GetOpenResourceIncident(ctx context.Context, projectID int64, env, metric string) (*models.ResourceIncident, error)
	ResolveResourceIncident(ctx context.Context, id int64) error
	IgnoreResourceIncident(ctx context.Context, id int64, ignored bool) error
	HasRecentIncident(ctx context.Context, projectID int64, env, metric string, since time.Time) (bool, error)
	PruneResourceIncidents(ctx context.Context, olderThan time.Time) error

	// System-wide queries
	ListAllProjects(ctx context.Context) ([]models.Project, error)
	HasActiveBuilds(ctx context.Context) (bool, error)

	// Admin
	ListAllUsers(ctx context.Context) ([]models.User, error)
	SetUserSuperAdmin(ctx context.Context, userID int64, isSuperAdmin bool) error
	GetSystemCounts(ctx context.Context) (users int, projects int, builds int, err error)

	// Hosts
	CreateHost(ctx context.Context, h *models.Host) error
	GetHostByID(ctx context.Context, id int64) (*models.Host, error)
	GetHostByAPIKeyHash(ctx context.Context, hash string) (*models.Host, error)
	ListAllHosts(ctx context.Context) ([]models.Host, error)
	ListHostsByProject(ctx context.Context, projectID int64) ([]models.Host, error)
	UpdateHost(ctx context.Context, h *models.Host) error
	UpdateHostHeartbeat(ctx context.Context, id int64, h *models.Host) error
	DeleteHost(ctx context.Context, id int64) error
	LinkHostProject(ctx context.Context, hostID, projectID int64, env string) error
	UnlinkHostProject(ctx context.Context, hostID, projectID int64) error
	GetHostProjectIDs(ctx context.Context, hostID int64) ([]int64, error)
	GetHostForProjectEnv(ctx context.Context, projectID int64, env string) (*models.Host, error)
	ListHostProjectLinks(ctx context.Context, hostID int64) ([]models.HostProject, error)
	CreateHostMetric(ctx context.Context, m *models.HostMetric) error
	ListHostMetrics(ctx context.Context, hostID int64, limit int) ([]models.HostMetric, error)

	// Project Groups
	CreateProjectGroup(ctx context.Context, g *models.ProjectGroup) error
	GetProjectGroupByID(ctx context.Context, id int64) (*models.ProjectGroup, error)
	GetProjectGroupBySlug(ctx context.Context, slug string) (*models.ProjectGroup, error)
	UpdateProjectGroup(ctx context.Context, g *models.ProjectGroup) error
	DeleteProjectGroup(ctx context.Context, id int64) error
	ListProjectGroups(ctx context.Context) ([]models.ProjectGroup, error)
	SetProjectGroup(ctx context.Context, projectID int64, groupID *int64) error

	// Group Members
	AddGroupMember(ctx context.Context, m *models.GroupMember) error
	GetGroupMember(ctx context.Context, groupID, userID int64) (*models.GroupMember, error)
	UpdateGroupMemberRole(ctx context.Context, groupID, userID int64, role models.ProjectRole) error
	RemoveGroupMember(ctx context.Context, groupID, userID int64) error
	ListGroupMembers(ctx context.Context, groupID int64) ([]models.GroupMember, error)
	GetUserGroupRole(ctx context.Context, userID int64, groupID int64) (models.ProjectRole, error)
}
