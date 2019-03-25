def reverseWords(s):
    a = s.split()
    b = []
    for i in a:
        b.append(i[::-1])
    ans = ' '.join(b)
    return ans


def test_reverseWords():
    x = "Let's take LeetCode contest"
    assert reverseWords(x) == "s'teL ekat edoCteeL tsetnoc"
