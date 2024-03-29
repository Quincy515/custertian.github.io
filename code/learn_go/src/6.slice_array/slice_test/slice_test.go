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

func TestSliceGrowing(t *testing.T) {
  s := []int{}
  for i := 0; i < 10; i++ {
    s = append(s, i)
    t.Log(len(s), cap(s))
  }
}

func TestSliceShareMemory(t *testing.T) {
  year := []string{"Jan", "Feb", "Mar", "Apr",
    "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"}
  Q2 := year[3:6]
  t.Log(Q2, len(Q2), cap(Q2))
  summer := year[5:8]
  t.Log(summer, len(summer), cap(summer))
  summer[0] = "Unknow"
  t.Log(Q2)
  t.Log(year)
}

func TestSliceComparing(t *testing.T) {
  a := []int{1, 2, 3, 4}
  // b := []int{1, 2, 3, 4}
  if a==nil {
    t.Log("equal")
  }
}

func TestSliceNil(t *testing.T) {
  var a []int
  var b = make([]int, 0, 0)
  c := []int{}
  t.Log(a, len(a), cap(a))
  t.Log(b, len(b), cap(b))
  t.Log(c, len(c), cap(c))
  t.Log(a==nil, b==nil, c==nil)
}
