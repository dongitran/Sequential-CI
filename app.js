const axios = require('axios');

async function authenticateUser() {
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  const data = {
    strategy: 'keycloak',
    email: 'a@a.com',
    password: '123456'
  };

  try {
    const response = await axios.post('https://localhost', data, { headers });
    const { accessToken, authentication: { keycloakToken } } = response.data;
    return { accessToken, keycloakToken };
  } catch (error) {
    throw new Error(error.response.data || error.message);
  }
}

// Sử dụng function authenticateUser()
authenticateUser()
  .then(result => {
    console.log('Authentication result:', result);
  })
  .catch(error => {
    console.error('Authentication error:', error);
  });
