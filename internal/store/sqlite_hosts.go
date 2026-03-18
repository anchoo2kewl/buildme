package store

import (
	"context"
	"database/sql"

	"github.com/anchoo2kewl/buildme/internal/models"
)

// --- Hosts ---

func (s *SQLiteStore) CreateHost(ctx context.Context, h *models.Host) error {
	res, err := s.db.ExecContext(ctx,
		`INSERT INTO hosts (name, hostname, api_key_hash, enabled, cpu_threshold, memory_threshold, disk_threshold)
		 VALUES (?, ?, ?, ?, ?, ?, ?)`,
		h.Name, h.Hostname, h.APIKeyHash, h.Enabled, h.CPUThreshold, h.MemoryThreshold, h.DiskThreshold)
	if err != nil {
		return err
	}
	h.ID, _ = res.LastInsertId()
	return nil
}

func (s *SQLiteStore) GetHostByID(ctx context.Context, id int64) (*models.Host, error) {
	return s.scanHost(s.db.QueryRowContext(ctx,
		`SELECT id, name, hostname, api_key_hash, enabled, cpu_threshold, memory_threshold, disk_threshold,
		        cpu_percent, memory_percent, disk_percent, net_in_bytes, net_out_bytes,
		        memory_total, memory_used, disk_total, disk_used,
		        agent_version, ip_address, os_info, username, uptime_secs,
		        last_heartbeat_at, created_at, updated_at
		 FROM hosts WHERE id = ?`, id))
}

func (s *SQLiteStore) GetHostByAPIKeyHash(ctx context.Context, hash string) (*models.Host, error) {
	return s.scanHost(s.db.QueryRowContext(ctx,
		`SELECT id, name, hostname, api_key_hash, enabled, cpu_threshold, memory_threshold, disk_threshold,
		        cpu_percent, memory_percent, disk_percent, net_in_bytes, net_out_bytes,
		        memory_total, memory_used, disk_total, disk_used,
		        agent_version, ip_address, os_info, username, uptime_secs,
		        last_heartbeat_at, created_at, updated_at
		 FROM hosts WHERE api_key_hash = ?`, hash))
}

func (s *SQLiteStore) scanHost(row *sql.Row) (*models.Host, error) {
	h := &models.Host{}
	err := row.Scan(&h.ID, &h.Name, &h.Hostname, &h.APIKeyHash, &h.Enabled,
		&h.CPUThreshold, &h.MemoryThreshold, &h.DiskThreshold,
		&h.CPUPercent, &h.MemoryPercent, &h.DiskPercent,
		&h.NetInBytes, &h.NetOutBytes,
		&h.MemoryTotal, &h.MemoryUsed, &h.DiskTotal, &h.DiskUsed,
		&h.AgentVersion, &h.IPAddress, &h.OSInfo, &h.Username, &h.UptimeSecs,
		&h.LastHeartbeatAt, &h.CreatedAt, &h.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return h, err
}

func (s *SQLiteStore) ListAllHosts(ctx context.Context) ([]models.Host, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, name, hostname, api_key_hash, enabled, cpu_threshold, memory_threshold, disk_threshold,
		        cpu_percent, memory_percent, disk_percent, net_in_bytes, net_out_bytes,
		        memory_total, memory_used, disk_total, disk_used,
		        agent_version, ip_address, os_info, username, uptime_secs,
		        last_heartbeat_at, created_at, updated_at
		 FROM hosts ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return s.scanHosts(rows)
}

func (s *SQLiteStore) ListHostsByProject(ctx context.Context, projectID int64) ([]models.Host, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT h.id, h.name, h.hostname, h.api_key_hash, h.enabled, h.cpu_threshold, h.memory_threshold, h.disk_threshold,
		        h.cpu_percent, h.memory_percent, h.disk_percent, h.net_in_bytes, h.net_out_bytes,
		        h.memory_total, h.memory_used, h.disk_total, h.disk_used,
		        h.agent_version, h.ip_address, h.os_info, h.username, h.uptime_secs,
		        h.last_heartbeat_at, h.created_at, h.updated_at
		 FROM hosts h
		 JOIN host_projects hp ON hp.host_id = h.id
		 WHERE hp.project_id = ?
		 ORDER BY h.name`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return s.scanHosts(rows)
}

func (s *SQLiteStore) scanHosts(rows *sql.Rows) ([]models.Host, error) {
	var hosts []models.Host
	for rows.Next() {
		var h models.Host
		if err := rows.Scan(&h.ID, &h.Name, &h.Hostname, &h.APIKeyHash, &h.Enabled,
			&h.CPUThreshold, &h.MemoryThreshold, &h.DiskThreshold,
			&h.CPUPercent, &h.MemoryPercent, &h.DiskPercent,
			&h.NetInBytes, &h.NetOutBytes,
			&h.MemoryTotal, &h.MemoryUsed, &h.DiskTotal, &h.DiskUsed,
			&h.AgentVersion, &h.IPAddress, &h.OSInfo, &h.Username, &h.UptimeSecs,
			&h.LastHeartbeatAt, &h.CreatedAt, &h.UpdatedAt); err != nil {
			return nil, err
		}
		hosts = append(hosts, h)
	}
	return hosts, rows.Err()
}

func (s *SQLiteStore) UpdateHost(ctx context.Context, h *models.Host) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE hosts SET name=?, hostname=?, enabled=?, cpu_threshold=?, memory_threshold=?, disk_threshold=?, updated_at=datetime('now')
		 WHERE id=?`,
		h.Name, h.Hostname, h.Enabled, h.CPUThreshold, h.MemoryThreshold, h.DiskThreshold, h.ID)
	return err
}

func (s *SQLiteStore) UpdateHostHeartbeat(ctx context.Context, id int64, h *models.Host) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE hosts SET cpu_percent=?, memory_percent=?, disk_percent=?,
		        net_in_bytes=?, net_out_bytes=?,
		        memory_total=?, memory_used=?, disk_total=?, disk_used=?,
		        agent_version=?, ip_address=?, os_info=?, username=?, hostname=?, uptime_secs=?,
		        last_heartbeat_at=datetime('now'), updated_at=datetime('now')
		 WHERE id=?`,
		h.CPUPercent, h.MemoryPercent, h.DiskPercent,
		h.NetInBytes, h.NetOutBytes,
		h.MemoryTotal, h.MemoryUsed, h.DiskTotal, h.DiskUsed,
		h.AgentVersion, h.IPAddress, h.OSInfo, h.Username, h.Hostname, h.UptimeSecs,
		id)
	return err
}

func (s *SQLiteStore) DeleteHost(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM hosts WHERE id = ?`, id)
	return err
}

// --- Host-Project Links ---

func (s *SQLiteStore) LinkHostProject(ctx context.Context, hostID, projectID int64, env string) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT OR REPLACE INTO host_projects (host_id, project_id, env) VALUES (?, ?, ?)`,
		hostID, projectID, env)
	return err
}

func (s *SQLiteStore) UnlinkHostProject(ctx context.Context, hostID, projectID int64) error {
	_, err := s.db.ExecContext(ctx,
		`DELETE FROM host_projects WHERE host_id = ? AND project_id = ?`,
		hostID, projectID)
	return err
}

func (s *SQLiteStore) GetHostProjectIDs(ctx context.Context, hostID int64) ([]int64, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT project_id FROM host_projects WHERE host_id = ? ORDER BY project_id`, hostID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (s *SQLiteStore) GetHostProjectNames(ctx context.Context, hostID int64) ([]string, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT p.name FROM projects p
		 JOIN host_projects hp ON hp.project_id = p.id
		 WHERE hp.host_id = ? ORDER BY p.name`, hostID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var names []string
	for rows.Next() {
		var n string
		if err := rows.Scan(&n); err != nil {
			return nil, err
		}
		names = append(names, n)
	}
	return names, rows.Err()
}

func (s *SQLiteStore) GetHostForProjectEnv(ctx context.Context, projectID int64, env string) (*models.Host, error) {
	return s.scanHost(s.db.QueryRowContext(ctx,
		`SELECT h.id, h.name, h.hostname, h.api_key_hash, h.enabled, h.cpu_threshold, h.memory_threshold, h.disk_threshold,
		        h.cpu_percent, h.memory_percent, h.disk_percent, h.net_in_bytes, h.net_out_bytes,
		        h.memory_total, h.memory_used, h.disk_total, h.disk_used,
		        h.agent_version, h.ip_address, h.os_info, h.username, h.uptime_secs,
		        h.last_heartbeat_at, h.created_at, h.updated_at
		 FROM hosts h
		 JOIN host_projects hp ON hp.host_id = h.id
		 WHERE hp.project_id = ? AND hp.env = ?`, projectID, env))
}

func (s *SQLiteStore) ListHostProjectLinks(ctx context.Context, hostID int64) ([]models.HostProject, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT host_id, project_id, env, created_at FROM host_projects WHERE host_id = ? ORDER BY project_id`, hostID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var links []models.HostProject
	for rows.Next() {
		var l models.HostProject
		if err := rows.Scan(&l.HostID, &l.ProjectID, &l.Env, &l.CreatedAt); err != nil {
			return nil, err
		}
		links = append(links, l)
	}
	return links, rows.Err()
}

// --- Host Metrics ---

func (s *SQLiteStore) CreateHostMetric(ctx context.Context, m *models.HostMetric) error {
	res, err := s.db.ExecContext(ctx,
		`INSERT INTO host_metrics (host_id, cpu_percent, memory_percent, disk_percent, net_in_bytes, net_out_bytes)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		m.HostID, m.CPUPercent, m.MemoryPercent, m.DiskPercent, m.NetInBytes, m.NetOutBytes)
	if err != nil {
		return err
	}
	m.ID, _ = res.LastInsertId()
	return nil
}

func (s *SQLiteStore) ListHostMetrics(ctx context.Context, hostID int64, limit int) ([]models.HostMetric, error) {
	if limit <= 0 || limit > 1000 {
		limit = 100
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, host_id, cpu_percent, memory_percent, disk_percent, net_in_bytes, net_out_bytes, created_at
		 FROM host_metrics WHERE host_id = ? ORDER BY created_at DESC LIMIT ?`, hostID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var metrics []models.HostMetric
	for rows.Next() {
		var m models.HostMetric
		if err := rows.Scan(&m.ID, &m.HostID, &m.CPUPercent, &m.MemoryPercent, &m.DiskPercent, &m.NetInBytes, &m.NetOutBytes, &m.CreatedAt); err != nil {
			return nil, err
		}
		metrics = append(metrics, m)
	}
	return metrics, rows.Err()
}
