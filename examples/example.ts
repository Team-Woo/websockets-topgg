import { TopWebsocket } from "../src/index";

console.log("Starting example...");


const topWebsocket = new TopWebsocket("45c7a3af-9f8f-4e09-aa51-66c21c1a6e8f", {
  name: "Hello",
});

topWebsocket.connect();

topWebsocket.on("ready", (data) => {
  console.log("Websocket is ready");
  topWebsocket.getUser("136583532972605441").catch((error) => {
    console.error("Error fetching user:", error);
  });
});

topWebsocket.on("disconnected", (disconnection) => {
  console.log("Disconnected from WebSocket", disconnection);
});

topWebsocket.on("error", (error) => {
  console.error("Error:", error);
});

topWebsocket.on("vote", async (vote) => {
  console.log(`User: ${vote.user.id} just voted!`);

});

topWebsocket.on("test", async (vote) => {
  console.log(`User: ${vote.user.id} just tested!`);
});

topWebsocket.on("reminder", async (reminder) => {
  console.log(`User: ${reminder.user.id} can vote again!`);
});
