package main

import (
	"fmt"
	"os"

	"github.com/rcarmo/webterm-go-port/webterm"
)

func main() {
	if err := webterm.RunCLI(os.Args[1:]); err != nil {
		_, _ = fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
