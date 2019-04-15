---
layout: post
title: "4.Go语言条件和循环"
date: 2019-04-14 00:18:52
image: '/assets/img/'
description: 'Go语言编写结构化程序-条件和循环'
tags:
- Go
categories:
- Go入门
twitter_text: 'Go语言编写结构化程序-条件和循环'
---

> 每日一句: If you really want something, you have to be prepared to work very hard, take advantage of opportunity, and above all never give up.
>
> – Jane Goodall, Ethologist
>
> 如果很想要一件事情，得准备好非常努力，善用机会，最重要的是决不放弃

#### [Part 1: 循环](#part1)

#### [Part 2: if 条件](#part2)

#### [Part 3: switch条件](#part3)

## <a name="part1"></a>循环

与其他主要编程语言的差异

Go 语言的关键字非常的少，C的`37`个，C++有`84`个Go语言仅`25`个关键字

Go语言`仅`支持循环关键字`for`

`for` ~~不需要括号(~~ `j:= 7; j <= 9; j++` ~~)不需要括号~~

__代码示例__

`while条件循环 while (n<5)`

```golang
n := 0
for n < 5 {
  n++
  fmt.Println(n)
}
```

`无限循环 while(true)`

```golang
n := 0
for {
  ...
}
```

Go语言代码

```golang
package loop_test

import "testing"

func TestWhileLoop(t *testing.T) {
  n := 0
  /* while (n<5) */
  for n < 5 {
    t.Log(n)
    n++
  }
}
```

运行测试代码：`go test loop_test.go -v`

```bash
➜  4.loop_go git:(master) ✗ go test loop_test.go -v
=== RUN   TestWhileLoop
--- PASS: TestWhileLoop (0.00s)
    loop_test.go:9: 0
    loop_test.go:9: 1
    loop_test.go:9: 2
    loop_test.go:9: 3
    loop_test.go:9: 4
PASS
ok      command-line-arguments  0.006s
```

## <a name="part2"></a>if 条件

```golang
if condition {
  // code to be executed if condition is true
} else {
  // code to be executed if condition is false
}

if condition-1 {
  // code to be executed if condition-1 is true
} else if condition-2 {
  // code to be executed if condition-2 is true
} else {
  // code to be executed if both condition-1 and condition-2 are false
}
```

条件语句的 `condition` 必须要是 `bool值`，也`不`需要`前后括号`

__与其他主要编程语言的差异__

1. `condition` 表达式结果必须为`布尔值`
2. 支持`变量赋值`

`if var declaration; condition {`

`  // code to be executed if condition is true`

`}`

```golang
package condition_test

import "testing"

func TestIfMultiSec(t *testing.T) {
  if a := 1 == 1; a {
    t.Log("1==1")
  }
}
```

函数支持`多返回值`与if语句的结合使用

多返回值，`第一个变量`是函数本身的`返回值`，第二个是返回的`错误`

如果错误为空，执行什么操作

```golang
package condition_test

import "testing"

func TestIfMultiSec(t *testing.T) {
  if v, err := someFunc(); err==nil {
    t.Log("没有错误执行的操作")
  } else {
    t.Log("有错误执行的操作")
  }
}
```

## <a name="part3"></a>switch条件

```golang
switch os := runtime.GOOS; os {
  case "darwin":
    fmt.Println("OS X.")
    // break
  case "linux":
    fmt.Println("Linux.")
  default:
    // freebsd, openbsd,
    // plan9, windows...
    fmt.Printf("%s.", os)
}
```

__与其他主要编程语言的差异__

1. 条件表达式`__不限制__`为`__常量__`或者`__整数__`；
2. 单个 case 中，可以出现`__多个结果__`选项，使用逗号分隔；
3. 与 C 语言等规则相反，Go 语言不需要用 `__break__` 来明确退出一个 case；
4. 可以不设定 switch 之后的条件表达式，在此情况下，整个 switch 结构与多个 `__if...else...__`的操作逻辑作用等同

```golang
switch {
  case 0 <= Num && Num <= 3:
    fmt.Printf("0-3")
  case 4 <= Num && Num <= 6:
    fmt.Printf("4-6")
  case 7 <= Num && Num <= 9:
    fmt.Printf("7-9")
}
```

__代码示例__

单个 case 中，可以出现`__多个结果__`选项，使用逗号分隔

```golang
package condition_test

import "testing"

func TestSwitchMultiCase(t *testing.T) {
  for i:=0;i<5;i++{
    switch i {
    case 0, 2:
      t.Log("Even")
    case 1,3:
      t.Log("Odd")
    default:
      t.Log("it is not 0-3")
    }
  }
}
```

运行结果

```bash
=== RUN   TestSwitchMultiCase
--- PASS: TestSwitchMultiCase (0.00s)
    condition_test.go:20: Even
    condition_test.go:22: Odd
    condition_test.go:20: Even
    condition_test.go:22: Odd
    condition_test.go:24: it is not 0-3
```

`switch`当做连续的`if...else`语句

```golang
package condition_test

import "testing"

func TestSwitchCaseCondition(t *testing.T) {
  for i:= 0; i < 5; i++ {
    switch  {
    case i%2==0:
      t.Log("Even")
    case i%2==1:
      t.Log("Odd")
    default:
      t.Log("unknow")
    }
  }
}
```

运行结果

```bash
=== RUN   TestSwitchCaseCondition
--- PASS: TestSwitchCaseCondition (0.00s)
    condition_test.go:33: Even
    condition_test.go:35: Odd
    condition_test.go:33: Even
    condition_test.go:35: Odd
    condition_test.go:33: Even
PASS
```
