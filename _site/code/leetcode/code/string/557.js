// export default (str) => {
//   // 字符串按空格进行分隔，保存数组，数组的元素的先后顺序就是单词的顺序
//   let arr = str.split(' ')
//   let result = arr.map(item => {
//     // 对数组进行遍历，然后每个元素进行反转
//     return item.split('').reverse().join('') // 按字符分隔
//   })
//   return result.join(' ')
// }

// export default (str) => {
//   // 1. 字符串按空格进行分隔，保存数组，数组的元素的先后顺序就是单词的顺序
//   // 2. 对数组进行遍历，然后每个元素进行反转
//   return str.split(' ').map(item => {
//     return item.split('').reverse().join('')
//   }).join(' ')
// }

// export default (str) => {
//   return str.split(/\s/g).map(item => {
//     return item.split('').reverse().join('')
//   }).join(' ')
// }

export default (str) => {
  return str.match(/[\w']+/g).map(item => {
    return item.split('').reverse().join('')
  }).join(' ')
}
