exports.isLoggedIn = (req, res, next) => {
  if (req.user) {
    next()
  } else {
    res.send('로그인이 필요합니다.')
  }
}

exports.isNotLoggedIn = (req, res, next) => {
  if (!req.user) {
    next()
  } else {
    res.send('로그인 상태로는 접근할 수 없습니다.')
  }
}