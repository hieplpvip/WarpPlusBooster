import urllib.request, random, json, datetime, threading, time, os
from flask import Flask
app = Flask(__name__)

referrerID = '0e1afb51-3ad8-4392-8aa2-13a8b0e7173b' # put your referrer ID here
num_of_threads = 100
timeout = 10 # timeout in seconds
proxyScrapeAPI = 'https://api.proxyscrape.com/?request=getproxies&proxytype=http&timeout=10000&country=all&ssl=all&anonymity=all'

totalEarned = 0

lock = threading.Lock()

def genString(length):
  letters = '0123456789abcdefghijklmnopqrstuvwxyz'
  return ''.join(random.choice(letters) for i in range(length))

def getProxy():
  response = urllib.request.urlopen(proxyScrapeAPI)
  return response.read().decode('utf8').strip().split('\r\n')

def register(threadName, proxy):
  install_id = genString(11)
  path = 'v0a{}/reg'.format(random.randint(100, 999))

  postData = json.dumps({
    'key': '{}='.format(genString(43)),
    'install_id': install_id,
    'fcm_token': '{}:APA91b{}'.format(install_id, genString(134)),
    'referrer': referrerID,
    'warp_enabled': False,
    'tos': datetime.datetime.now().astimezone().isoformat(),
    'type': 'Android',
    'locale': 'vi_VN'
  }, separators = (',', ':')).encode('utf8')

  headers = {
    'Host': 'api.cloudflareclient.com',
    'Accept': '*/*',
    'User-Agent': 'okhttp/3.12.1',
    'Content-Type': 'application/json',
    'Content-Length': str(len(postData))
  }

  try:
    req = urllib.request.Request('https://api.cloudflareclient.com/' + path, headers = headers, data = postData)
    req.set_proxy(proxy, 'http')
    response = urllib.request.urlopen(req, timeout = timeout)

    if response.getcode() == 200 and referrerID in response.read().decode('utf8'):
      print('{}: Earned 1GB using path {} and proxy {}'.format(threadName, path, proxy))
      global totalEarned
      with lock:
        totalEarned += 1
  except Exception:
    pass

def registerWrapper(threadName, proxies, id):
  while id < len(proxies):
    register(threadName, proxies[id])
    id += num_of_threads

@app.route('/')
def main():
  global totalEarned
  return 'Earned {}GB'.format(totalEarned)

def mainRun():
  while True:
    print('Scraping proxies...')
    proxies = getProxy()
    print('Got {} proxies'.format(len(proxies)))

    threads = []
    for i in range(num_of_threads):
      thread = threading.Thread(target = registerWrapper, args = ('Thread-{}'.format(i + 1), proxies, i))
      thread.start()
      threads.append(thread)

    for x in threads:
      x.join()

if __name__ == '__main__':
  thread = threading.Thread(target = mainRun)
  thread.start()

  port = int(os.environ.get('PORT', 5000))
  app.run(host = '0.0.0.0', port = port)