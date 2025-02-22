const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

// Example route for health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'API is running!' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
