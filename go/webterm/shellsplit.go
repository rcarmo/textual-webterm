package webterm

import "github.com/google/shlex"

func shlexSplitImpl(command string) ([]string, error) {
	return shlex.Split(command)
}
