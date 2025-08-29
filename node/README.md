
# Node Reviews Router

## Install
```
cd node
npm i
```

## Mount in your main Express app
```js
// in server.js (example)
const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use('/api/reviews', require('./node/reviews_router')); // adjust path as needed
```

## Endpoints
- `GET /api/reviews` — list (approved first)
- `POST /api/reviews` — submit (pending by default) body: `{ name, stars(1..5), content }`
- `POST /api/reviews/admin` — approve or reject (send `{id, action:'approve'|'reject'}`) — protect with your auth
