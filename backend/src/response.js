const success = (res, data, message) => {
  res.json({ success: true, data, message });
};

const failure = (res, message, status = 400) => {
  res.status(status).json({ success: false, data: null, message });
};

module.exports = { success, failure };

