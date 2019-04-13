---
layout: post
title: "3.Go语言运算符"
date: 2019-04-13 01:54:43
image: '/assets/img/'
description: 'Go语言运算符'
tags:
- Go
categories:
- Go入门
twitter_text: 'Go语言运算符'
---

> 每日一句: Your imagination is your preview of life’s coming attractions.
>
> – Albert Einstein, Physicist

#### [Part 1: 算术运算符](#part1)

#### [Part 2: 比较运算符](#part2)

#### [Part 3: ⽤ == ⽐较数组](#part3)

#### [Part 4: 逻辑运算符](#part4)

#### [Part 5: 位运算符](#part5)

## <a name="part1"></a>算术运算符

运算符|描述|实例
---|---|---
**+**|相加|**A+B**输出结果30
**-**|相减|**A-B**输出结果-10
`*`|相乘|**`A*B`**输出结果200
**/**|相除|**B\A**输出结果2
**%**|求余|**B%A**输出结果0
**++**|自增|**A++**输出结果11
**--**|自减|**A--**输出结果9

Go语言没有前置`++`、`--`

## <a name="part2"></a>比较运算符

运算符|描述|实例
---|---|---
==|检查两个值是否相等，如果相等返回 True 否则返回 False|(A == B) 为 False
!=|检查两个值是否不相等，如果不相等返回 True 否则返回 False|(A != B) 为 True
>|检查左边值是否⼤于右边值，如果是返回 True 否则返回 False|(A > B) 为 False
<|检查左边值是否⼩于右边值，如果是返回 True 否则返回 False|(A < B) 为 True
>=|检查左边值是否⼤于等于右边值，如果是返回 True 否则返回 False|(A >= B) 为 False
<=|检查左边值是否⼩于等于右边值，如果是返回 True 否则返回 False|(A <= B) 为 True

## <a name="part3"></a>⽤ == ⽐较数组

1. 相同`维数`且含有相同`个数`元素的`数组`才可以比较
2. 每个`元素`都`相同`的`才相等`

```golang
package operator_test

import "testing"

func TestCompareArray(t *testing.T) {
  a := [...]int{1, 2, 3, 4}
  b := [...]int{1, 3, 2, 4}
  // c := [...]int{1, 2, 3, 4, 5}
  d := [...]int{1, 2, 3, 4}
  t.Log(a == b)
  // t.Log(a == c)
  t.Log(a == d)
}
```

元素相同顺序不同都是不相等的，不同维数是不可比较的

运行 `go test operator_test.go -v`

```bash
➜  3.operator_go git:(master) ✗ go test operator_test.go -v
=== RUN   TestCompareArray
--- PASS: TestCompareArray (0.00s)
    operator_test.go:16: false
    operator_test.go:18: true
```

## <a name="part4"></a>逻辑运算符

运算符|描述|实例
---|---|---
`&&`|逻辑 AND 运算符。 如果两边的操作数都是 True，则条件 True，否则为 False|`(A && B)` 为 False
`||`|逻辑 OR 运算符。 如果两边的操作数有⼀个 True，则条件 True，否则为 False|`(A || B)` 为 True
`!`|逻辑 NOT 运算符。 如果条件为 True，则逻辑 NOT 条件 False，否则为 True|`!(A && B)` 为 True

## <a name="part5"></a>位运算符

运算符|描述|实例
---|---|---
`&`|按位与运算符`"&"`是双⽬运算符。 其功能是参与运算的两数 各对应的⼆进位相与|`(A & B)` 结果为 12, ⼆进制为 0000 1100
`|`|按位或运算符`"|"`是双⽬运算符。 其功能是参与运算的两数 各对应的⼆进位相或|`(A | B)` 结果为 61, ⼆进制为 0011 1101
`^`|按位异或运算符`"^"`是双⽬运算符。 其功能是参与运算的两 数各对应的⼆进位相异或，当两对应的⼆进位相异时，结果|`(A ^ B)` 结果为 49, ⼆进制为 0011 0001
`<<`|左移运算符`”<<"`是双⽬运算符。左移 n 位就是乘以 2 的 n次⽅。 其功能把`"<<"`左边的运算数的各⼆进位全部左移若⼲位，由`"<<"`右边的数指定移动的位数，⾼位丢弃，低位补|`A << 2` 结果为 240 ，⼆进制为 1111 0000
`>>`|右移运算符`”>>"`是双⽬运算符。右移 n 位就是除以 2 的 n 次⽅。 其功能是把`">>"`左边的运算数的各⼆进位全部右移 若⼲位，`">>"`右边的数指定移动的位数|`A >> 2` 结果为 15 ，⼆进制为 0000 1111

与其他主要编程语⾔的差异

&^ 按位置零

- `1 &^ 0 -- 1`
- `1 &^ 0 -- 0`
- `0 &^ 1 -- 0`
- `0 &^ 0 -- 0`

```golang
package operator_test

import "testing"

const (
  Readable = 1 << iota
  Writeable
  Executable
)

func TestBitClear(t *testing.T) {
  a := 7 // 0111
  a = a &^ Readable
  a = a &^ Executable
  t.Log(a&Readable == Readable, a&Writeable == Writeable, a&Executable == Executable)
}
```

运行 `go test operator_test.go -v`

```bash
➜  3.operator_go git:(master) ✗ go test operator_test.go -v
=== RUN   TestBitClear
--- PASS: TestBitClear (0.00s)
    operator_test.go:25: false true false
PASS
```
