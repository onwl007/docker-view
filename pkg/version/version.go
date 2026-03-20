package version

var (
	version = "dev"
	commit  = "unknown"
	date    = "unknown"
)

func String() string {
	return version
}

func Commit() string {
	return commit
}

func Date() string {
	return date
}
