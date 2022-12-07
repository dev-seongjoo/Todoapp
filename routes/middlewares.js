exports.isLoggedIn = (req, res, next) => {
  if (req.user) {
    next()
  } else {
    res.write("<script>alert('Login Please')</script>")
    res.write("<script>window.location='/auth/login'</script>");
  }
}

exports.isNotLoggedIn = (req, res, next) => {
  if (!req.user) {
    next()
  } else {
    res.write("<script>alert('Logout Please')</script>")
    res.write("<script>window.location='/page/home'</script>");
  }
}