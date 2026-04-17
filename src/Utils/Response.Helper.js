module.exports = {
  success: function (data) {
    return { success: data };
  },
  error: function (code, message) {
    return { error: { code: code, message: message } };
  }
};
