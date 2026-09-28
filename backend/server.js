import app from "./src/app.js";
import "dotenv/config";

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
