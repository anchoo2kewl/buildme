package version

import (
	"fmt"
	"os"
	"runtime"
	"strings"
	"time"
)

var (
	Version   = "dev"
	GitCommit = "unknown"
	BuildTime = "unknown"
	startedAt = time.Now()
)

type Info struct {
	Version   string `json:"version"`
	GitCommit string `json:"git_commit"`
	BuildTime string `json:"build_time"`
	GoVersion string `json:"go_version,omitempty"`
	Platform  string `json:"platform,omitempty"`
}

func Get() Info {
	return Info{
		Version:   Version,
		GitCommit: GitCommit,
		BuildTime: BuildTime,
	}
}

type RuntimeInfo struct {
	Hostname string `json:"hostname"`
	PID      int    `json:"pid"`
	Port     int    `json:"port,omitempty"`
	Uptime   int64  `json:"uptime_seconds"`
	Started  string `json:"started_at"`
}

type ResourceMetrics struct {
	MemoryAllocMB  float64 `json:"memory_alloc_mb"`
	HeapInuseMB    float64 `json:"heap_inuse_mb"`
	StackInuseMB   float64 `json:"stack_inuse_mb"`
	Goroutines     int     `json:"goroutines"`
	NumGC          uint32  `json:"num_gc"`
	GCPauseTotalMS float64 `json:"gc_pause_total_ms"`
	GCLastPauseMS  float64 `json:"gc_last_pause_ms"`
}

type DatabaseInfo struct {
	Type string `json:"type"`
}

type ContainerMetrics struct {
	MemoryUsageMB float64 `json:"memory_usage_mb,omitempty"`
	MemoryLimitMB float64 `json:"memory_limit_mb,omitempty"`
	CPUUsageNs    int64   `json:"cpu_usage_ns,omitempty"`
}

type VersionResponse struct {
	Backend   Info              `json:"backend"`
	Runtime   RuntimeInfo       `json:"runtime"`
	Resources ResourceMetrics   `json:"resources"`
	Database  DatabaseInfo      `json:"database"`
	Container *ContainerMetrics `json:"container,omitempty"`
}

func GetFull(port int) VersionResponse {
	hostname, _ := os.Hostname()

	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	var lastPauseNs uint64
	if mem.NumGC > 0 {
		idx := (mem.NumGC + 255) % 256
		lastPauseNs = mem.PauseNs[idx]
	}

	resp := VersionResponse{
		Backend: Info{
			Version:   Version,
			GitCommit: GitCommit,
			BuildTime: BuildTime,
			GoVersion: runtime.Version(),
			Platform:  fmt.Sprintf("%s/%s", runtime.GOOS, runtime.GOARCH),
		},
		Runtime: RuntimeInfo{
			Hostname: hostname,
			PID:      os.Getpid(),
			Port:     port,
			Uptime:   int64(time.Since(startedAt).Seconds()),
			Started:  startedAt.UTC().Format(time.RFC3339),
		},
		Resources: ResourceMetrics{
			MemoryAllocMB:  float64(mem.Alloc) / 1024 / 1024,
			HeapInuseMB:    float64(mem.HeapInuse) / 1024 / 1024,
			StackInuseMB:   float64(mem.StackInuse) / 1024 / 1024,
			Goroutines:     runtime.NumGoroutine(),
			NumGC:          mem.NumGC,
			GCPauseTotalMS: float64(mem.PauseTotalNs) / 1e6,
			GCLastPauseMS:  float64(lastPauseNs) / 1e6,
		},
		Database: DatabaseInfo{
			Type: "sqlite",
		},
	}

	if cm := readContainerMetrics(); cm != nil {
		resp.Container = cm
	}

	return resp
}

// readContainerMetrics reads cgroup stats when running inside a container.
func readContainerMetrics() *ContainerMetrics {
	cm := &ContainerMetrics{}
	hasData := false

	// cgroup v2
	if val := readCgroupInt("/sys/fs/cgroup/memory.current"); val > 0 {
		cm.MemoryUsageMB = float64(val) / 1024 / 1024
		hasData = true
	} else if val := readCgroupInt("/sys/fs/cgroup/memory/memory.usage_in_bytes"); val > 0 {
		// cgroup v1
		cm.MemoryUsageMB = float64(val) / 1024 / 1024
		hasData = true
	}

	if val := readCgroupInt("/sys/fs/cgroup/memory.max"); val > 0 && val < 1<<62 {
		cm.MemoryLimitMB = float64(val) / 1024 / 1024
		hasData = true
	} else if val := readCgroupInt("/sys/fs/cgroup/memory/memory.limit_in_bytes"); val > 0 && val < 1<<62 {
		cm.MemoryLimitMB = float64(val) / 1024 / 1024
		hasData = true
	}

	// CPU usage (cgroup v2: usage_usec in cpu.stat)
	if content, err := os.ReadFile("/sys/fs/cgroup/cpu.stat"); err == nil {
		for _, line := range strings.Split(string(content), "\n") {
			if strings.HasPrefix(line, "usage_usec ") {
				var usec int64
				fmt.Sscanf(line, "usage_usec %d", &usec)
				cm.CPUUsageNs = usec * 1000
				hasData = true
				break
			}
		}
	} else if val := readCgroupInt("/sys/fs/cgroup/cpuacct/cpuacct.usage"); val > 0 {
		cm.CPUUsageNs = val
		hasData = true
	}

	if !hasData {
		return nil
	}
	return cm
}

func readCgroupInt(path string) int64 {
	data, err := os.ReadFile(path)
	if err != nil {
		return 0
	}
	s := strings.TrimSpace(string(data))
	var val int64
	fmt.Sscanf(s, "%d", &val)
	return val
}
