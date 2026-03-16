document.getElementById('btn-login').addEventListener('click', async () => {
  const user = document.getElementById('login-username').value;
  const pass = document.getElementById('login-password').value;
  const errorMsg = document.getElementById('login-error');

  try {
    const response = await fetch('http://localhost:8000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    if (response.ok) {
      // Store the token in the sessionStorage
      sessionStorage.setItem('token', result.access.token);
      sessionStorage.setItem('username', result.username);
      sessionStorage.setItem('role', result.role);

      // navigate to the actual POS screen
      window.location.href = 'index.html';
    } else {
      errorMsg.innerText = result.detail || "Invalid Credentials";
    }
  } catch (err) {
    error.innerText = "Cannot connect to server. Is Python running?";
  }
});