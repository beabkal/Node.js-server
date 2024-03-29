const http = require("http");
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs").promises;

const logEvents = require("./logEvents");
const EventEmitter = require("events");
class Emitter extends EventEmitter {}

// initialize Emitter object
const myEmitter = new Emitter();

myEmitter.on("log", (msg, filePath) => logEvents(msg, filePath));

// This will use the port provided by the env when hosted, but will use 3500 for now on the local machine
const PORT = process.env.PORT || 3500;

const serveFile = async (filePath, contentType, response) => {
  try {
    const rawData = await fs.promises.readFile(
      filePath,
      !contentType.includes("image") ? "utf-8" : ""
    );
    const data =
      contentType === "application/json" ? JSON.parse(rawData) : rawData;
    response.writeHead(filePath.includes("404.html") ? 404 : 200, {
      "Content-Type": contentType,
    });
    response.end(
      contentType === "application/json" ? JSON.stringify(data) : data
    );
  } catch (err) {
    console.log(err);
    myEmitter.emit("log", `${err.name}:${err.message}`, "errLog.txt");
    response.statusCode = 500;
    response.end();
  }
};

// creating a minimal server

const server = http.createServer((req, res) => {
  console.log(req.url, req.method);
  myEmitter.emit("log", `${req.url}\t${req.method}`, "reqLog.txt");

  const extension = path.extname(req.url);

  let contentType;

  switch (extension) {
    case ".css":
      contentType = "text/css";
      break;
    case ".js":
      contentType = "text/javascript";
      break;
    case ".json":
      contentType = "application/json";
      break;
    case ".jpg":
      contentType = "image/jpeg";
      break;
    case ".png":
      contentType = "image/png";
      break;
    case ".txt":
      contentType = "text/plain";
      break;
    default:
      contentType = "text/html";
  }

  // this is a chain ternary statement incase you're wondering
  let filePath =
    contentType == "text/html" && req.url == "/"
      ? path.join(__dirname, "views", "index.html")
      : contentType == "text/html" && req.url.slice(-1) == "/"
      ? path.join(__dirname, "views", req.url, "index.html")
      : contentType == "text/html"
      ? path.join(__dirname, "views", req.url)
      : path.join(__dirname, req.url);

  // this adds an extension to a request if we requested a file without the extesion
  // for example if we typed ../about it should return ../about.html
  if (!extension && req.url.slice(-1) !== "/") filePath += ".html";

  const fileExists = fs.existsSync(filePath);

  if (fileExists) {
    //serve the file
    serveFile(filePath, contentType, res);
  } else {
    switch (path.parse(filePath).base) {
      case "old-page.html":
        res.writeHead(301, { Location: "/new-page.html" });
        res.end();
        break;

      case "www-page.html":
        res.writeHead(301, { Location: "/" });
        res.end();
        break;
      default:
        serveFile(path.join(__dirname, "views", "404.html"), "text/html", res);
        break;
    }
  }
});

server.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
