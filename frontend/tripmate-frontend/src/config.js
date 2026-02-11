// Backend API base URL.
// In production set REACT_APP_API_URL to your Railway backend URL
// (e.g. https://tripmate-backend.up.railway.app)
const API_URL = (process.env.REACT_APP_API_URL || "http://127.0.0.1:5000").replace(
  /\/$/,
  ""
);

export default API_URL;

