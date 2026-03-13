package store

import (
	"context"
	"os"
	"testing"

	"github.com/anchoo2kewl/buildme/internal/models"
)

func testStore(t *testing.T) *SQLiteStore {
	t.Helper()
	f, err := os.CreateTemp("", "buildme-test-*.db")
	if err != nil {
		t.Fatal(err)
	}
	f.Close()
	t.Cleanup(func() { os.Remove(f.Name()) })

	s, err := NewSQLite(f.Name())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { s.Close() })
	return s
}

func TestCreateAndGetUser(t *testing.T) {
	s := testStore(t)
	ctx := context.Background()

	user := &models.User{
		Email:        "test@example.com",
		PasswordHash: "hash123",
		DisplayName:  "Test User",
	}
	if err := s.CreateUser(ctx, user); err != nil {
		t.Fatal(err)
	}
	if user.ID == 0 {
		t.Fatal("expected user ID to be set")
	}

	got, err := s.GetUserByID(ctx, user.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Email != "test@example.com" {
		t.Fatalf("expected email test@example.com, got %s", got.Email)
	}

	gotByEmail, err := s.GetUserByEmail(ctx, "test@example.com")
	if err != nil {
		t.Fatal(err)
	}
	if gotByEmail.ID != user.ID {
		t.Fatal("expected same user by email lookup")
	}
}

func TestCreateProjectWithMember(t *testing.T) {
	s := testStore(t)
	ctx := context.Background()

	user := &models.User{Email: "owner@test.com", PasswordHash: "h", DisplayName: "Owner"}
	s.CreateUser(ctx, user)

	project := &models.Project{Name: "Test Project", Slug: "test-project"}
	if err := s.CreateProject(ctx, project); err != nil {
		t.Fatal(err)
	}

	member := &models.ProjectMember{ProjectID: project.ID, UserID: user.ID, Role: models.RoleOwner}
	if err := s.AddProjectMember(ctx, member); err != nil {
		t.Fatal(err)
	}

	projects, err := s.ListProjectsForUser(ctx, user.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(projects) != 1 {
		t.Fatalf("expected 1 project, got %d", len(projects))
	}
	if projects[0].Name != "Test Project" {
		t.Fatalf("expected project name 'Test Project', got '%s'", projects[0].Name)
	}

	members, err := s.ListProjectMembers(ctx, project.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(members) != 1 {
		t.Fatalf("expected 1 member, got %d", len(members))
	}
	if members[0].Role != models.RoleOwner {
		t.Fatalf("expected role owner, got %s", members[0].Role)
	}
}

func TestUpsertBuild(t *testing.T) {
	s := testStore(t)
	ctx := context.Background()

	user := &models.User{Email: "u@t.com", PasswordHash: "h", DisplayName: "U"}
	s.CreateUser(ctx, user)

	project := &models.Project{Name: "P", Slug: "p"}
	s.CreateProject(ctx, project)

	provider := &models.CIProvider{
		ProjectID:    project.ID,
		ProviderType: models.ProviderGitHub,
		DisplayName:  "GH",
		PollIntervalS: 60,
		Enabled:      true,
	}
	s.CreateCIProvider(ctx, provider)

	build := &models.Build{
		ProjectID:  project.ID,
		ProviderID: provider.ID,
		ExternalID: "123",
		Status:     models.BuildStatusRunning,
		Branch:     "main",
	}

	isNew, err := s.UpsertBuild(ctx, build)
	if err != nil {
		t.Fatal(err)
	}
	if !isNew {
		t.Fatal("expected new build")
	}

	// Upsert same build with updated status
	build.Status = models.BuildStatusSuccess
	isNew, err = s.UpsertBuild(ctx, build)
	if err != nil {
		t.Fatal(err)
	}
	if isNew {
		t.Fatal("expected existing build update")
	}

	got, err := s.GetBuildByID(ctx, build.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Status != models.BuildStatusSuccess {
		t.Fatalf("expected success status, got %s", got.Status)
	}
}
