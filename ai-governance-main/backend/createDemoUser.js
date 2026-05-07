async function createAdmin() {
  try {
    const response = await fetch('http://localhost:3001/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: "Demo User",
        email: "demo@rakfort.com",
        password: "governance.demo@Rakfort",
        role: "admin"
      })
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Expected JSON but received ${response.headers.get('content-type') || 'unknown content type'} ` +
        `with status ${response.status}:\n${text.slice(0, 500)}`
      );
    }

    console.log('Status:', response.status);
    console.log('Data:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

createAdmin();
