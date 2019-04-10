export default (str) => {
  // 建立电话号码键盘映射-电话号码的数字对应的字母与输入的下标对应
  let map = ['', 1, 'abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz']
  // 把输入字符串按单字符分隔变成数组 234=>[2,3,4]
  let num = str.split('') // 输入的字符串分隔成数组
  // 保存键盘映射后的字母内容，如23=>['abc','def']
  let code = []
  num.forEach(item => {
    if (map[item]) {
      code.push(map[item])
    }
  })
  // 第一步完成了把输入的字符串变成映射后的数组
  // 第二步做组合运算
  let comb = (arr) => {
    // 临时变量用来保存两个组合的结果
    let tmp = []
    // 最外层的循环是遍历第一个元素，里层的循环是遍历第二个元素
    for (let i = 0, il = arr[0].length; i < il; i++) {
      for (let j = 0, jl = arr[1].length; j < jl; j++) {
        tmp.push(`${arr[0][i]}${arr[1][j]}`)
      }
    }
    arr.splice(0, 2, tmp)
    if (arr.length > 1) {
      comb(arr)
    } else {
      return tmp
    }
    return arr[0]
  }
  return comb(code)
}

