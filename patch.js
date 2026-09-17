const fs = require('fs');
let code = fs.readFileSync('server/lib/targetSafety.js', 'utf8');
code = code.replace(
  "const value = /^https?:\\/\\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;",
  "if (rawUrl.includes('://') && !/^https?:\\/\\//i.test(rawUrl)) { throw new HttpError(400, 'Target must be a valid HTTP or HTTPS URL.'); }\n  const value = /^https?:\\/\\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;"
);
fs.writeFileSync('server/lib/targetSafety.js', code);
