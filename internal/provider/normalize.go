package provider

import "github.com/anchoo2kewl/buildme/internal/models"

// NormalizeGitHubStatus maps GitHub Actions status+conclusion to BuildStatus.
func NormalizeGitHubStatus(status, conclusion string) models.BuildStatus {
	switch status {
	case "queued", "waiting", "pending":
		return models.BuildStatusQueued
	case "in_progress":
		return models.BuildStatusRunning
	case "completed":
		switch conclusion {
		case "success":
			return models.BuildStatusSuccess
		case "failure":
			return models.BuildStatusFailure
		case "cancelled":
			return models.BuildStatusCancelled
		case "timed_out":
			return models.BuildStatusError
		case "skipped":
			return models.BuildStatusSkipped
		default:
			return models.BuildStatusError
		}
	}
	return models.BuildStatusQueued
}

// NormalizeTravisStatus maps Travis CI status to BuildStatus.
func NormalizeTravisStatus(state string) models.BuildStatus {
	switch state {
	case "created", "received", "queued":
		return models.BuildStatusQueued
	case "started":
		return models.BuildStatusRunning
	case "passed":
		return models.BuildStatusSuccess
	case "failed":
		return models.BuildStatusFailure
	case "canceled":
		return models.BuildStatusCancelled
	case "errored":
		return models.BuildStatusError
	}
	return models.BuildStatusQueued
}

// NormalizeCircleCIStatus maps CircleCI status to BuildStatus.
func NormalizeCircleCIStatus(status string) models.BuildStatus {
	switch status {
	case "not_run", "queued":
		return models.BuildStatusQueued
	case "running":
		return models.BuildStatusRunning
	case "success", "fixed":
		return models.BuildStatusSuccess
	case "failed", "failing":
		return models.BuildStatusFailure
	case "canceled":
		return models.BuildStatusCancelled
	case "error", "infrastructure_fail", "timedout":
		return models.BuildStatusError
	}
	return models.BuildStatusQueued
}
