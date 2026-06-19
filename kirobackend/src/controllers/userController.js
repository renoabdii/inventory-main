const User = require('../models/User');
const { validatePassword } = require('../utils/passwordPolicy');
const { signUserToken } = require('../utils/token');

// Ganti password akun sendiri. Pengelolaan kasir hanya melalui /cashier-accounts.
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Password lama dan baru wajib diisi' });
    }

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      return res.status(400).json({ success: false, message: passwordCheck.message });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User tidak ditemukan' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Password saat ini salah' });
    }

    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.json({
      success: true,
      message: 'Password berhasil diubah',
      data: { token: signUserToken(user) },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { changePassword };
