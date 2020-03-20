'use strict';

const express = require('express');
const https = require('https');
const HttpsProxyAgent = require('https-proxy-agent');
const app = express();

const referrerID = '0e1afb51-3ad8-4392-8aa2-13a8b0e7173b';
const threads = 200;
const timeout = 2000;
const proxyScrapeAPI = 'https://api.proxyscrape.com/?request=getproxies&proxytype=http&timeout=10000&country=all&ssl=all&anonymity=all';

var totalEarned = 0;
var done = false;

async function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      res.setEncoding('utf8');
      let body = ''; 
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
};

async function getProxy() {
  return (await httpGet(proxyScrapeAPI)).trim().split('\n');
}

function genString(length) {
  // https://gist.github.com/6174/6062387#gistcomment-2651745
  return [...Array(length)].map(_ => (~~(Math.random() * 36)).toString(36)).join('');
}

async function wait(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    let x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function run(proxy) {
  return new Promise(resolve => {
    let install_id = genString(11);
    let path = `/v0a${getRandomInt(750, 790)}/reg`;
    let ip = proxy.substr(0, proxy.indexOf(':'));
    let port = parseInt(proxy.substr(proxy.indexOf(':') + 1));
    
    let postData = JSON.stringify({
      key: `${genString(43)}=`,
      install_id: install_id,
      fcm_token: `${install_id}:APA91b${genString(134)}`,
      referrer: referrerID,
      warp_enabled: false,
      tos: new Date().toISOString().replace('Z', '+07:00'),
      type: 'Android',
      locale: 'vi_VN'
    });

    let options = {
      hostname: 'api.cloudflareclient.com',
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Host': 'api.cloudflareclient.com',
        'Accept': '*/*',
        'User-Agent': 'okhttp/3.12.1',
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      },
      agent: new HttpsProxyAgent('http://' + proxy),
      timeout: timeout,
      rejectUnauthorized: false,
      requestCert: false
    };

    let req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode != 200 || data.indexOf(referrerID) == -1) {
          resolve();
        } else {
          console.log('Earned 1GB using path ' + path + ' and proxy ' + proxy);
          ++totalEarned;
          resolve();
        }
      });
    });

    req.on('error', error => {
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

var proxies = [];

async function wrapRun(id_proxy) {
  await run(proxies[id_proxy]);
  if (id_proxy + threads < proxies.length) {
    wrapRun(id_proxy + threads);
    if (id_proxy + threads === proxies.length - 1) {
      done = true;
    }
  }
}

//process.on('uncaughtException', (err, origin) => {
//  console.log(err);
//  console.log(origin);
//});

app.set('port', (process.env.PORT || 5000));
app.get('/', (req, res) => {
  res.send(`Earned ${totalEarned} GB`);
});
app.listen(app.get('port'), () => {
  console.log(`running on port ${app.get('port')}`);
});

(async function(){
  while (true) {
    done = false;
    proxies = await getProxy();
    console.log(`Got ${proxies.length} proxies`);
    shuffle(proxies);
    for (let i = 0; i < Math.min(threads, proxies.length); i++) {
      wrapRun(i);
    }

    while (true) {
      if (done) {
        break;
      } else {
        await wait(5000);
      }
    }
  }
})();