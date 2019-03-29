export default (str) => {
  // 建立数结构，只做入不出，所以堆栈队列都可以，用来保存数据
  let r = []
  // 给定任意子输入都返回第一个符合条件的子串
  let match = (str) => {
    // 使用正则表达式获取字符串开头的字符
    let j = str.match(/^(0+|1+)/)[0]
    // 利用“异或”运算将字符反转并复制相同个数
    let o = (j[0] ^ 1).toString().repeat(j.length) // 长度相等并取反
    // 合并上面两个字符串，创建正则表达式
    let reg = new RegExp(`^(${j}${o})`) // 使用正则对象生成动态规则的正则
    // 与传入的字符串进行比对，返回第一个比对成功的子串
    if (reg.test(str)) {
      return RegExp.$1
    } else {
      return ''
    }
  }
  // for 控制程序运行流程
  for (let i = 0, len = str.length - 1; i < len; i++) {
    let sub = match(str.slice(i))
    if (sub) {
      r.push(sub)
    }
  }
  return r
}
