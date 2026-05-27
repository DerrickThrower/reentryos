const req = {
  name: "Test Client",
  release_date: "2026-05-30",
  city: "San Francisco",
  state: "CA",
  phone_number: "555-555-5555",
  has_id: false,
  housing_status: "none",
  medical_conditions: "Asthma",
  prior_charges: "None"
};

fetch('http://localhost:3000/api/intake/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(req)
})
.then(res => {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  function read() {
    reader.read().then(({done, value}) => {
      if (done) return;
      console.log(decoder.decode(value, {stream: true}));
      read();
    });
  }
  read();
})
.catch(console.error);
