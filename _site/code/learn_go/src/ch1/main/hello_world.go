package main

import (
  "fmt"
  "os"
)

func main() {
  if len(os.Args)>1 {
    fmt.Println("Hello World")
  }
  os.Exit(0)
}
