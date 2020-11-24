# proxy-stream-drive
Google Drive Streaming Video Basic

HD cài đặt code:

1) Cài Nodejs trên VPS: https://hocvps.com/cai-dat-nodejs/
2) Upload code lên VPS và giải nén
3) Cài đặt pm2 với lênh: npm install pm2 -g
3) cd vào folder code chạy lệnh: npm install
4) Chạy app với lệnh: npm run pm2
5) Url defauld: ip:3000

End point:
- Home: ip:3000
- Getlink: ip:3000/sources?fileId={drive-id}
- Embed: ip:3000/embed.html?fileId={drive-id}

Chức năng cơ bản hiện có
- Proxy stream với link drive
- Cache link 6h
- Memory leak cơ bản
- Hỗ trợ iframe - getlink - encode
