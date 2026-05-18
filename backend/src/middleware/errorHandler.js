const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err.message);
  if (process.env.NODE_ENV === 'development') console.error(err.stack);

  return res.status(500).json({
    success: false,
    message: 'เกิดข้อผิดพลาดภายในระบบ',
    ...(process.env.NODE_ENV === 'development' && { detail: err.message }),
  });
};

module.exports = errorHandler;
