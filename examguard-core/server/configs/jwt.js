module.exports = {
  secret: process.env.JWT_SECRET || "crm_default_secret",
  expiresIn: process.env.JWT_EXPIRES_IN || "7d"
};