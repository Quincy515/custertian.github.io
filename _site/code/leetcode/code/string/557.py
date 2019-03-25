# class Solution:
#     def reverseWords(self, s: str) -> str:
#         """
#         :type s: str
#         :rtype: str
#         """
#         a = s.split()
#         b = []
#         for i in a:
#             b.append(i[::-1])
#         ans = ' '.join(b)
#         return ans


class Solution(object):
    def reverseWords(self, s):
        """
        :type s: str
        :rtype: str
        """
        return " ".join(map(lambda x: x[::-1], s.split(" ")))
