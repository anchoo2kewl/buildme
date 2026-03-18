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

func (s *SQLiteStore) ListProjectGroups(ctx context.Context, userID int64) ([]models.ProjectGroup, error) {
	var rows *sql.Rows
	var err error
	if userID == 0 {
		// super admin sees all
		rows, err = s.db.QueryContext(ctx,
			`SELECT id, name, slug, visible, sort_order, created_at, updated_at FROM project_groups ORDER BY sort_order, name`)
	} else {
		rows, err = s.db.QueryContext(ctx,
			`SELECT id, name, slug, visible, sort_order, created_at, updated_at FROM project_groups
			 WHERE id IN (SELECT group_id FROM group_members WHERE user_id = ?)
			 ORDER BY sort_order, name`, userID)
	}
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

// --- Group Members ---

func (s *SQLiteStore) AddGroupMember(ctx context.Context, m *models.GroupMember) error {
	m.CreatedAt = time.Now().UTC()
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO group_members (group_id, user_id, role, created_at) VALUES (?, ?, ?, ?)`,
		m.GroupID, m.UserID, m.Role, m.CreatedAt)
	return err
}

func (s *SQLiteStore) GetGroupMember(ctx context.Context, groupID, userID int64) (*models.GroupMember, error) {
	m := &models.GroupMember{}
	err := s.db.QueryRowContext(ctx,
		`SELECT group_id, user_id, role, created_at FROM group_members WHERE group_id=? AND user_id=?`,
		groupID, userID).Scan(&m.GroupID, &m.UserID, &m.Role, &m.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return m, err
}

func (s *SQLiteStore) UpdateGroupMemberRole(ctx context.Context, groupID, userID int64, role models.ProjectRole) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE group_members SET role=? WHERE group_id=? AND user_id=?`,
		role, groupID, userID)
	return err
}

func (s *SQLiteStore) RemoveGroupMember(ctx context.Context, groupID, userID int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM group_members WHERE group_id=? AND user_id=?`, groupID, userID)
	return err
}

func (s *SQLiteStore) ListGroupMembers(ctx context.Context, groupID int64) ([]models.GroupMember, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT gm.group_id, gm.user_id, gm.role, gm.created_at,
		        u.id, u.email, u.display_name, u.avatar_url, u.is_super_admin
		 FROM group_members gm
		 JOIN users u ON u.id = gm.user_id
		 WHERE gm.group_id = ?
		 ORDER BY gm.created_at`, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var members []models.GroupMember
	for rows.Next() {
		var m models.GroupMember
		u := &models.User{}
		if err := rows.Scan(&m.GroupID, &m.UserID, &m.Role, &m.CreatedAt,
			&u.ID, &u.Email, &u.DisplayName, &u.AvatarURL, &u.IsSuperAdmin); err != nil {
			return nil, err
		}
		m.User = u
		members = append(members, m)
	}
	return members, rows.Err()
}

func (s *SQLiteStore) GetUserGroupRole(ctx context.Context, userID int64, groupID int64) (models.ProjectRole, error) {
	var role models.ProjectRole
	err := s.db.QueryRowContext(ctx,
		`SELECT role FROM group_members WHERE user_id=? AND group_id=?`,
		userID, groupID).Scan(&role)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return role, err
}
