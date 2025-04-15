
```
brew install mkcert
brew install http-server
mkcert -install
mkcert localhost
http-server -S -C localhost.pem -K localhost-key.pem --cors
```

