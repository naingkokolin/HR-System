import express, { type Request, type Response, urlencoded } from "express";

const app = express();
app.use(express.json());
app.use(urlencoded());

app.get("/", (req: Request, res: Response) => res.send("hello world"));

app.listen(3000, () => console.log("app is running on port 3000"));
