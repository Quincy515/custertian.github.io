---
layout: post
title: "1.如何“玩”算法"
date: 2019-03-30 00:42:14
image: '/assets/img/'
description: '28天玩转算法-1-1-如何"玩"算法'
tags:
- 算法的乐趣
- Algorithms
categories:
- 玩转算法
twitter_text: '28天玩转算法-1-1-如何"玩"算法'
---
> “Find a group of people who challenge and inspire you; spend a lot of time with them, and it will change your life.”
>
> – Amy Poehler, Actress
>
>「找一群會刺激並鼓舞你的人，花很多時間和他們在一起，這將改變你的人生。」– 艾米·波勒 (女演員)

#### [Part 1: 如何“玩”算法](#part1)

#### [Part 2: 数据模型](#part2)

#### [Part 3: 把问题抽象成数据模型](#part3)
1. [信息数字化](#part3-1)
1. [类比和转化](#part3-2)
1. [数学问题的建模](#part3-3)
1. [图论算法的建模](#part3-4)

#### [Part 4: 总结](#part4)

# <a name="part1"></a>如何"玩"算法

`玩`算法就是要能够做到以下三点：

1. 对遇到的`特殊问题`要能够`自己设计出算法实现`。(可能是一个智力游戏题目，也可能是工作中遇到的实际问题)
2. 对于原理公开和知名的算法，要能`将算法原理翻译成具体的算法代码`。(如二部图匹配的匈牙利算法、大整数乘法的Karatsuba算法)
3. 对已有`具体实现的算法`，要能够`设计出合适的数学模型`，将算法应用到实际问题中。(如遗传算法、SIFT图像识别算法)

# <a name="part2"></a>数据模型

**数据模型** - `编程语言`利用`数据结构`可以直接描述的`数学模型`，是数学模型的一种表达形式

一个完整的算法实现应包括：

1. `数据模型`
2. `算法逻辑主体`
3. `输入输出`

这三个组成的核心是数据模型，把`问题`的描述建立`数据模型`的能力是“玩”算法的关键

`解决实际问题`的能力体现在:

1. 不能针对`特有的问题`设计出解决问题的`算法实现`。(如没有现成的方法可用)
2. 不能用已有的`通用算法`解决`具体问题`。(如遗传算法，通常需要结合实际问题的数据)

这种能力就是 `经验`和`方法集`的问题，`多练习`、`多思考`、`学会总结和归纳`，是提高`建模能力`的关键。

# <a name="part3"></a>把问题抽象成数据模型
## <a name="part3-1"></a> 信息数字化

自然语言描述的信息|_-问题->_|数字化信息
---|---|---
"甲、乙、丙、丁”或“A、B、C、D" |_-建模->_| 1, 2, 3, 4
"大于、等于、小于"|_-通用->_|正数、0、负数
"布尔值的真和假"|_-思考->_|1、0
"有和无"|_-转化->_|1、0

**例1**: 四个人用编号1~4来代表，其中编号为2的人有喝酒的习惯

我们可以用数据模型这样来描述: `people[2].drink=1;`

**例2**: 警察抓了 A、B、C、D 四名罪犯，其中一个是小偷

> A说：“我不是小偷” `x!=0`
>
> B说：“C是小偷” `x=2`
>
> C说：“小偷肯定是D” `x=3`
>
> D说：“C是在冤枉人” `x!=3`

已知4人中，1人说了真话，1人说了假话，请判断谁是小偷？

描述是真，则表示为1，描述是假，表示为0，我么假设小偷的编号是x

对于四个人的描述，数字化的结果是：

`int dis_a = (x != 0) ? 1 : 0;`

`int dis_b = (x == 2) ? 1 : 0;`

`int dis_c = (x == 3) ? 1 : 0;`

`int dis_d = 1 - dis_c;`

依次假设 x 是 A、B、C、D (0~3的编号数值),对每次假设对应的 dis_a、dis_b、dis_c和dis_d的值求和，若结果为3，则表示假设是对的，x对应的值就是小偷的编号。如此将自然语言的信息数字化后，算法就可以非常简单地实现了。

```c
void who_is_thief() {
  for (int x = 0; x < 4; x++) {
    int dis_a = (x != 0) ? 1 : 0;
    int dis_b = (x == 2) ? 1 : 0;
    int dis_c = (x == 3) ? 1 : 0;
    int dis_d = 1 - dis_c;

    if ((dis_a + dis_b + dis_c + dis_d) == 3) {
      char thief = 'A' + x;
      std:cout << "The thief is " << thief << std::endl;
      break;
    }
  }
}
```

## <a name="part3-2"></a> 类比和转化

把`未知的问题`转化成`已知问题`，然后再用`已知`的`方法`解决`已知问题`，是`解决未知问题`的基础手段

### 算法几何的例子

**经典算法几何问题**: 判断n个矩形之间是否存在包含关系

**一般思路**: n个矩形两两进行包含判断，需要`n*(n-1)`次矩形包含判断,时间复杂度是`O(n^2)`

**区间树的查询问题**:
1. 首先根据`矩形`的`几何位置`，利用`水平边`和`垂直边`分别构造`两棵区间树`。(根据矩形的几何特征，只需要处理一条水平边和一条垂直边即可)
2. 将`n个矩形`的`水平边`作为`被查找元素`，依次在`水平边区间树中`查找，如果找到其他矩形的`水平边`完整`覆盖被查找矩形`的`水平边`，则在`垂直边区间树`上进一步判断该矩形的`垂直边被覆盖`的情况
3. 如果存在`被查找矩形`的`水平边`和`垂直边`都被`同一个矩形`的`水平边`和`垂直边覆盖`，则说明这两个矩形`存在包含关系`

**对比**: 采用区间树的算法复杂度是`O(nlg(n))`,额外的`开销`是`建立区间树`的开销，但只要`n足够大`，这个算法仍然比简单的比较法高效

### 项目管理的例子

**问题**: 一个工程项目分解为一系列的具体活动，这些活动之间一般有着复杂的依赖关系，如何安排这些活动的开始顺序？

**有向图拓扑排序算法**: `图的顶点`就是活动，顶点之间的`有向边`代表`活动`之间的`前后关系`

**问题描述**: 一个工程分解出的这么多活动，每个活动的时间都不一样，如何确定工程的最短完工时间？

**有向图的关键路径算法**: 工程的最短完工时间取决于这些活动中`时间最长`的那条`关键活动路径`。`顶点`代表`时间`，`边`代表`活动`，`边`的`权重`代表`活动时间`，找出`关键路径`

## <a name="part3-3"></a> 数学问题的建模

**求n次二项式的展开式系数问题**

对这个问题建模时需要的考量

$$ (a + b)^n = C_n^0a^n + C_n^1a^{n-1}b + C_n^2a^{n-2}b^{2} + ... + C_n^{n-1}ab^{n-1} + C_n^nb^n $$

> 从这个展开式可以看出展开后的多项式项数与n相关(n+1项),受限于存储空间的限制，在考数据模型的时候需要限制n的最大值。再观察每个展开项可知，需要存储的数据多项式系数、a的幂和b的幂三个属性，因此，定义的数据结构要有相对应的条目这些属性，可以这么定义每一项的数据结构：

```c
typedef struct
{
    int c;
    int am;
    int bm;
}ITEM;
```

根据展开式的特点，需要一个列表存储各项的数据，显然这个列表不存在频繁删除和插入操作，可以选择用数组作为数据模型。这个例子模型限制n的最大值是32，当然，这个值可以根据问题域和存储空间的限制来综合考虑，最终定义的数据模型就是：

`ITEM items[N];`

杨辉三角递推计算示意图

$ (a+b)^0 $&emsp;&emsp;&emsp;&emsp;&emsp;1&emsp;&emsp;&emsp;&emsp;&emsp;

$ (a+b)^1 $&emsp;&emsp;&emsp;&emsp;1&emsp;1&emsp;&emsp;&emsp;&emsp;

$ (a+b)^2 $&emsp;&emsp;&emsp;1&emsp;2&emsp;1&emsp;&emsp;&emsp;&emsp;

$ (a+b)^3 $&emsp;&emsp;1&emsp;3&emsp;3&emsp;1&emsp;&emsp;&emsp;

$ (a+b)^4 $&emsp;1&emsp;4&emsp;6&emsp;4&emsp;1&emsp;&emsp;&emsp;

$ (a+b)^5 $&emsp;&emsp;&emsp;&emsp;........&emsp;&emsp;&emsp;&emsp;

`item`中系数`c`的计算采用杨辉三角的递推公式计算，避免使用 $ C_n^k $ 公式计算，这样做的话计算量太大了。

杨辉三角的递推关系如上图，第n阶系数的首项和末项都是1，其他`n-2`项系数可以从第`n-1`阶的系数递推 `i` 计算出来，其递推计算关系是：

$$ C_n = C_n^1 +C_{n-1}^1, n = 2,3,...,n-1 $$

am 和 bm 则比较简单，一个是从 n 到 0 递减，一个是从 0 到 n 递增

根据定义的数据模型 `items`，求二项式展开式各项系数和幂的算法实现也就水到渠成了

```c
if (n==0)
{
    items[0] = {1, 0, 0};
    return;
}
for (unsigned int i = 1; i <= n; i++) // 从第一阶开始递推到第n阶
{
    unsigned int nc = i + 1; //每一阶的项数
    items[nc - 1] = {1, 0, i}; // 末项
    // 倒着递推第2项到第n-1项的值，实际下标范围是[1, nc-2],不需要额外的存储空间转存items数组
    for (unsigned int j = nc -2; j > 0; j--)
    {
        unsigned int c = items[j].c + items[j-1].c;
        items[j] = {c, i-j, j};
    }
    items[0] = {1, i, 0}; // 末项
}
```

计算机也无法直接表示大小和不等于这样的关系，对于不等式的建模，通常是转换成减法，然后对结果进行正、负的判断。对于方程也是一样的，通常将方程转换成 `f(x)=0` 的形成模型，模型会比较简单。

## <a name="part3-4"></a> 图论算法的建模

描述图的数据结构最常用的是

# <a name="part4"></a>总结