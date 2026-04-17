const https = require('https');
const data = JSON.stringify({
  BudgetApp_Data: {},
  Investments_Data: [],
  CreditCards_Data: []
});
const options = {
  hostname: 'api.jsonbin.io',
  path: '/v3/b',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Master-Key': '$2a$10$IDuaPiEl3320Dwe4Wlugz.43C3Y2uyDJ9Q5zKCnmH8nKicJIJBiMa',
    'X-Bin-Name': 'JoseFamilyBudget'
  }
};
const req = https.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log(body));
});
req.write(data);
req.end();
