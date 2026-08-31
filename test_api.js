const http = require("http");

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/export/detailed-results?category_id=all&target_type=teacher&target_id=all&class_id=42991697-46c2-445a-87bf-f964b7df3ee6",
  method: "GET",
  headers: {
    "Cookie": "sb-user-role=teacher; sb-user-id=172b2bad-67e0-4569-8d13-5dc1cdb328a5"
  }
};

const req = http.request(options, (res) => {
  console.log("STATUS:", res.statusCode);
  console.log("HEADERS:", res.headers);
  let body = "";
  res.on("data", (chunk) => body += chunk.toString("utf8"));
  res.on("end", () => {
    if (res.headers["content-type"] && res.headers["content-type"].includes("application/json")) {
      console.log("BODY:", body);
    } else {
      console.log("BODY length:", body.length);
    }
  });
});

req.on("error", (e) => {
  console.error(`problem with request: ${e.message}`);
});
req.end();
