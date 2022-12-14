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
    res.send('로그아웃이 필요합니다.')
  }
}