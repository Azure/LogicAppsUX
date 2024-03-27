import proc from 'child_process';
proc.exec('mkcert --help', function (err) {
  if (err) {
    console.error(
      '\x1b[31m%s\x1b[0m',
      'mkcert not found, Please install mkcert first. Instructions can be found at: https://github.com/FiloSottile/mkcert'
    );
  } else {
    proc.exec('mkcert -cert-file "local-cert.pem" -key-file "local-key.pem" "localhost"');
  }
});
