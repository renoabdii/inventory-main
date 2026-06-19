const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length < 8) {
    return { valid: false, message: 'Password minimal 8 karakter' };
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return { valid: false, message: 'Password harus mengandung huruf dan angka' };
  }
  return { valid: true, message: '' };
};

module.exports = { validatePassword };
