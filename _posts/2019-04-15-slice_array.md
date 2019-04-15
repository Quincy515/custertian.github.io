---
layout: post
title: "5.Go语言数组和切片"
date: 2019-04-15 09:20:38
image: "/assets/img/"
description: "Go语言数组和切片"
tags:
  - Go
categories:
  - Go入门
twitter_text: "Go语言数组和切片"
---

> 每日一句: A great many people think they are thinking when they are merely rearranging their prejudices.
>
> – William James, Psychologist
>
> 很多人觉得他们在思考，但实际上只是重新安排自己的偏见

#### [Part 1: 数组的声明](#part1)

#### [Part 2: 数组元素遍历](#part2)

#### [Part 3: 数组截取](#part3)

#### [Part 4: 切片内部结构](#part4)

#### [Part 5: 切片声明](#part5)

#### [Part 6: 切片共享存储](#part6)

#### [Part 7: 数组 vs 切片](#part7)

## <a name="part1"></a>数组的声明

`var a [3]int` // 声明并初始化为默认零值

`a[0] = 1`

`b := [3]int{1, 2, 3}` // 声明同时初始化

`c := [2][2]int{{1, 2}, {3, 4}}` // 多维数组初始化

**代码示例**

```golang
package array_test

import "testing"

func TestArrayInit(t *testing.T) {
  var arr [3]int
  arr1 := [4]int{1, 2, 3, 4}
  arr3 := [...]int{1, 3, 4, 5}
  arr1[1] = 5
  t.Log(arr[1], arr[2])
  t.Log(arr1, arr3)
}
```

**注意** `arr3 := [...]int{1, 3, 4, 5}` 这种初始化方式，不用自己算元素个数，在元素较多，或者修改程序增加元素时更为简便

**运行结果**

```bash
➜  array_test git:(master) ✗ go test array_test.go -v
=== RUN   TestArrayInit
--- PASS: TestArrayInit (0.00s)
    array_test.go:10: 0 0
    array_test.go:11: [1 5 3 4] [1 3 4 5]
```

## <a name="part2"></a>数组元素遍历

**与其他主要编程语言的差异**

```golang
func TestTravelArray(t *testing.T) {
  a := [...]int{1, 2, 3, 4}
  for idx/*索引*/, elem/*元素*/ := range a {
    fmt.Println(idx, elem)
  }
}
```

**代码示例**

```golang
package array_test

import "testing"

func TestArrayTravel(t *testing.T) {
  arr3 := [...]int{1, 3, 4, 5}
  for i:=0; i<len(arr3); i++ {
    t.Log(arr3[i])
  }
  for idx, e := range arr3 { // idx 为索引，e 为遍历的值
    t.Log(idx, e)
  }
  for _, e := range arr3 { // _ 使用下划线占位
    t.Log(e)
  }
}
```

**运行结果**

```bash
➜  array_test git:(master) ✗ go test array_test.go -v
=== RUN   TestArrayTravel
--- PASS: TestArrayTravel (0.00s)
    array_test.go:17: 1
    array_test.go:17: 3
    array_test.go:17: 4
    array_test.go:17: 5
    array_test.go:20: 0 1
    array_test.go:20: 1 3
    array_test.go:20: 2 4
    array_test.go:20: 3 5
    array_test.go:23: 1
    array_test.go:23: 3
    array_test.go:23: 4
    array_test.go:23: 5
```

## <a name="part3"></a>数组截取

`a[开始索引(包含),结束索引(不包含)]`

`a := [...]int{1, 2, 3, 4, 5}`

`a[1:2]` // 2

`a[1:3]` // 2, 3

`a[1:len(a)]` // 2, 3, 4, 5

`a[1:]` // 2, 3, 4, 5

`a[:3]` // 1, 2, 3

**代码示例**

```golang
package array_test

import "testing"

func TestArraySection(t *testing.T) {
  arr3 := [...]int{1, 2, 3, 4, 5}
  arr1_sec := arr3[:]
  t.Log(arr1_sec)
  arr2_sec := arr3[:3]
  t.Log(arr2_sec)
  arr3_sec := arr3[3:]
  t.Log(arr3_sec)
  // arr4_sec := arr3[:-1] 不支持负数
}
```

**运行结果**

```bash
➜  array_test git:(master) ✗ go test array_test.go -v
=== RUN   TestArraySection
--- PASS: TestArraySection (0.00s)
    array_test.go:30: [1 2 3 4 5]
    array_test.go:32: [1 2 3]
    array_test.go:34: [4 5]
```

## <a name="part4"></a>切片内部结构

切片内部是个`结构体`，`三`个基本元素

1. 第一个是`指针`，`指向`一片``连续的`存储空间`，就是一个`数组`
2. 第二个是 slice 切片里面可以访问的`元素个数`
3. 第三个是`指针`指向`数组`的`空间的长度`

`ptr *Elem`

`len int` len: 元素的个数

`cap int` cap: 内部数组的容量-是指后面对应的连续存储空间的大小，可以向 slice 中 append 元素，没有超过 cap 就不会引发 slice 扩容。len 以外没有被初始化，要进行追加操作

## <a name="part5"></a>切片声明

`var s0 []int`

`s0 = append(s0, 1)`

`s := []int{}`

`s1 := []int{1, 2, 3}`

`s2 := make([]int, 2, 4)`

**[]type**, **len**, **cap**

其中 **len** 个元素会被`初始化`为`默认零值`，`未初始化`元素`不可以访问`

**代码示例**

```golang
package slice_test

import "testing"

func TestSliceInit(t *testing.T) {
  var s0 []int // 声明slice[]不需要指明长度，是可变长的
  t.Log(len(s0), cap(s0))
  s0 = append(s0, 1)
  t.Log(len(s0), cap(s0)) // 长度和容量的变化

  s1 := []int{1, 2, 3, 4}
  t.Log(len(s1), cap(s1))

  s2 := make([]int, 3, 5) // len表示已初始化的可访问元素
  t.Log(len(s2), cap(s2))
  t.Log(s2[0], s2[1], s2[2])
  s2 = append(s2, 1)
  t.Log(s2[0], s2[1], s2[2], s2[3])
  t.Log(len(s2), cap(s2))
}
```

**运行结果**

```bash
➜  slice_test git:(master) ✗ go test slice_test.go -v
=== RUN   TestSliceInit
--- PASS: TestSliceInit (0.00s)
    slice_test.go:7: 0 0
    slice_test.go:9: 1 1
    slice_test.go:12: 4 4
    slice_test.go:15: 3 5
    slice_test.go:16: 0 0 0
    slice_test.go:18: 0 0 0 1
    slice_test.go:19: 4 5
PASS
ok      command-line-arguments  (cached)
```

## <a name="part6"></a>切片共享存储

![](/assets/img/post/2.slice.png)

`切片`是如何实现`可变长`的

**代码示例**

```golang
package slice_test

import "testing"

func TestSliceGrowing(t *testing.T) {
  s := []int{}
  for i := 0; i < 10; i++ {
    s = append(s, i)
    t.Log(len(s), cap(s))
  }
}
```

**运行结果**

```bash
➜  slice_test git:(master) ✗ go test slice_test.go -v
=== RUN   TestSliceGrowing
--- PASS: TestSliceGrowing (0.00s)
    slice_test.go:26: 1 1
    slice_test.go:26: 2 2
    slice_test.go:26: 3 4
    slice_test.go:26: 4 4
    slice_test.go:26: 5 8
    slice_test.go:26: 6 8
    slice_test.go:26: 7 8
    slice_test.go:26: 8 8
    slice_test.go:26: 9 16
    slice_test.go:26: 10 16
```

当`存储空间不足`时，容量的`变化`是前一个`容量x2`的`增长`

**注意** `s = append(s, i)` 伴随着`自增长`的是`存储空间`的`复制`

所以`切片`的方便之处主要来自于`自动增长`，但切片的自动增长会导致`内存分配`和`数据复制`，以及未来相关的`GC开销`。

`slice`结构体源码 _\$GOROOT/src/runtime/slice.go_

<https://github.com/golang/go/blob/master/src/runtime/slice.go>

```golang
	newcap := old.cap
	doublecap := newcap + newcap
	if cap > doublecap {
		newcap = cap
	} else {
		if old.len < 1024 {
			newcap = doublecap
		} else {
			// Check 0 < newcap to detect overflow
			// and prevent an infinite loop.
			for 0 < newcap && newcap < cap {
				newcap += newcap / 4
			}
			// Set newcap to the requested cap when
			// the newcap calculation overflowed.
			if newcap <= 0 {
				newcap = cap
			}
		}
	}
```

> - 首先判断，如果新申请容量（cap）大于 2 倍的旧容量（old.cap），最终容量（newcap）就是新申请的容量（cap）
> - 否则判断，如果旧切片的长度小于 1024，则最终容量(newcap)就是旧容量(old.cap)的两倍，即（newcap=doublecap）
> - 否则判断，如果旧切片长度大于等于 1024，则最终容量（newcap）从旧容量（old.cap）开始循环增加原来的 1/4，即（newcap=old.cap,for {newcap += newcap/4}）直到最终容量（newcap）大于等于新申请的容量(cap)，即（newcap >= cap）
> - 如果最终容量（cap）计算值溢出，则最终容量（cap）就是新申请容量（cap）

**切片共享存储结构**

多个 slice 指向同一片连续的存储空间

**代码示例**

```golang
func TestSliceShareMemory(t *testing.T) {
  year := []string{"Jan", "Feb", "Mar", "Apr",
    "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
  Q2 := year[3:6]
  t.Log(Q2, len(Q2), cap(Q2))
  summer := year[5:8]
  t.Log(summer, len(summer), cap(summer))
}
```

**运行结果**

```bash
➜  slice_test git:(master) ✗ go test slice_test.go -v
=== RUN   TestSliceShareMemory
--- PASS: TestSliceShareMemory (0.00s)
    slice_test.go:34: [Apr May Jun] 3 9
    slice_test.go:36: [Jun Jul Aug] 3 7
    slice_test.go:38: [Apr May Unknow]
    slice_test.go:39: [Jan Feb Mar Apr May Unknow Jul Aug Sep Oct Nov Dec]
PASS
```

## <a name="part7"></a>数组 vs 切片

1. 容器是否可伸缩
2. 是否可以进行比较

```golang
func TestSliceComparing(t *testing.T) {
  a := []int{1, 2, 3, 4}
  b := []int{1, 2, 3, 4}
  if a==b {
    t.Log("equal")
  }
}
```

`if a==b` invalid operation: a == b (slice can only be compared to nil)

`切片`变量可以和`nil比较`，可以判断该变量`是否初始化`

**代码示例**

```golang
func TestSliceNil(t *testing.T) {
  var a []int
  var b = make([]int, 0, 0)
  c := []int{}
  t.Log(a, len(a), cap(a))
  t.Log(b, len(b), cap(b))
  t.Log(c, len(c), cap(c))
  t.Log(a==nil, b==nil, c==nil)
}
```

**运行结果**

```bash
➜  slice_test git:(master) ✗ go test slice_test.go -v
=== RUN   TestSliceNil
--- PASS: TestSliceNil (0.00s)
    slice_test.go:54: [] 0 0
    slice_test.go:55: [] 0 0
    slice_test.go:56: [] 0 0
    slice_test.go:57: true false false
```
