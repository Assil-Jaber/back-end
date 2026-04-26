// Simple validation helpers (no external library needed)

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isStrongPassword(password) {
  // At least 6 characters, 1 uppercase, 1 lowercase, 1 number
  return (
    password.length >= 6 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

function isValidString(value, minLen = 1, maxLen = 255) {
  return (
    typeof value === "string" &&
    value.trim().length >= minLen &&
    value.trim().length <= maxLen
  );
}

function isPositiveInteger(value) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
}

module.exports = {
  isValidEmail,
  isStrongPassword,
  isValidString,
  isPositiveInteger,
};
