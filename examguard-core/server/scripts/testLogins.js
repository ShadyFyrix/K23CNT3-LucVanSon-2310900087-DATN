const http = require('http');

function loginUser(email, pass, label) {
  const postData = JSON.stringify({ email, password: pass });
  const req = http.request({
    hostname: 'localhost',
    port: 3011,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
  }, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      const json = JSON.parse(body);
      const user = json.data?.user;
      const role = user?.role?.name || user?.role;
      console.log('[' + label + '] Status: ' + res.statusCode + ' | Name: ' + user?.fullName + ' | Role: ' + role);
    });
  });
  req.write(postData);
  req.end();
}

loginUser('admin@examguard.edu.vn', '123456', 'Admin');
loginUser('anguyen@examguard.edu.vn', '123456', 'Teacher / Proctor');
loginUser('son.luc@sinhvien.edu.vn', '123456', 'Candidate (Lục Văn Sơn)');
