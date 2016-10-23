module.exports = {
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 465,
  secureConnection: true,
  name: "gmail",
  auth: {
    user: "rcarubbi",
    pass: "kungfu123"
  },
  ignoreTLS: false,
  debug: false,
  maxConnections: 5 // Default is 5
}