export const getPasswordError = (password: string) => {
  if (password.length < 8) return "Password minimal 8 karakter";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password harus mengandung huruf dan angka";
  }
  return null;
};
