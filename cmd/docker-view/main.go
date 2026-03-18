package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/wanglei/docker-view/internal/cli"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := cli.NewRootCommand().ExecuteContext(ctx); err != nil {
		log.Fatal(err)
	}
}
