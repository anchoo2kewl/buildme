package store

import (
	"context"
	"database/sql"
	"time"

	"github.com/anchoo2kewl/buildme/internal/models"
)

func (s *SQLiteStore) CreateProjectGroup(ctx context.Context, g *models.ProjectGroup) error {
	now := time.Now().UTC()
	g.CreatedAt = now
	g.UpdatedAt = now
	res, err := s.db.ExecContext(ctx,
		`INSERT INTO project_groups (name, slug, visible, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
		g.Name, g.Slug, g.Visible, g.SortOrder, g.CreatedAt, g.UpdatedAt)
	if err != nil {
		return err
	}
	g.ID, _ = res.LastInsertId()
	return nil
}

func (s *SQLiteStore) GetProjectGroupByID(ctx context.Context, id int64) (*models.ProjectGroup, error) {
	g := &models.ProjectGroup{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, name, slug, visible, sort_order, created_at, updated_at FROM project_groups WHERE id = ?`, id).
		Scan(&g.ID, &g.Name, &g.Slug, &g.Visible, &g.SortOrder, &g.CreatedAt, &g.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return g, err
}

func (s *SQLiteStore) GetProjectGroupBySlug(ctx context.Context, slug string) (*models.ProjectGroup, error) {
	g := &models.ProjectGroup{}
	err := s.db.QueryRowContext(ctx,
		`SELECT id, name, slug, visible, sort_order, created_at, updated_at FROM project_groups WHERE slug = ?`, slug).
		Scan(&g.ID, &g.Name, &g.Slug, &g.Visible, &g.SortOrder, &g.CreatedAt, &g.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return g, err
}

func (s *SQLiteStore) UpdateProjectGroup(ctx context.Context, g *models.ProjectGroup) error {
	g.UpdatedAt = time.Now().UTC()
	_, err := s.db.ExecContext(ctx,
		`UPDATE project_groups SET name=?, slug=?, visible=?, sort_order=?, updated_at=? WHERE id=?`,
		g.Name, g.Slug, g.Visible, g.SortOrder, g.UpdatedAt, g.ID)
	return err
}

func (s *SQLiteStore) DeleteProjectGroup(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM project_groups WHERE id=?`, id)
	return err
}

func (s *SQLiteStore) ListProjectGroups(ctx context.Context) ([]models.ProjectGroup, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, name, slug, visible, sort_order, created_at, updated_at FROM project_groups ORDER BY sort_order, name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var groups []models.ProjectGroup
	for rows.Next() {
		var g models.ProjectGroup
		if err := rows.Scan(&g.ID, &g.Name, &g.Slug, &g.Visible, &g.SortOrder, &g.CreatedAt, &g.UpdatedAt); err != nil {
			return nil, err
		}
		groups = append(groups, g)
	}
	return groups, rows.Err()
}

func (s *SQLiteStore) SetProjectGroup(ctx context.Context, projectID int64, groupID *int64) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE projects SET group_id=?, updated_at=datetime('now') WHERE id=?`, groupID, projectID)
	return err
}
