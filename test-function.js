const url = "https://adtugmhftcjzswxtbyue.supabase.co/functions/v1/create-auth-user";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkdHVnbWhmdGNqenN3eHRieXVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYxMjc5MSwiZXhwIjoyMDg1MTg4NzkxfQ.YEcrEb6xFE0D2nH9EwSwuwAn6_uEsIIfPlpmQ9y9llM";

fetch(url, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${anonKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    fullName: "Isaac Berchie Osei",
    personalEmail: null,
    unitId: "f22eb90c-a366-466d-a3c0-d6392a52d4f8",
    positionId: "973794bf-8d7c-453e-8ae0-740ec5af6f21"
  })
}).then(async res => {
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}).catch(console.error);
