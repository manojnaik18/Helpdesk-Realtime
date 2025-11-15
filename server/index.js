import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;
const ICE_SERVERS = process.env.ICE_SERVERS || "";

const wss = new WebSocketServer({ port: PORT });
console.log(`Signaling server running on ws://localhost:${PORT}`);

const rooms = new Map();
const clients = new Map();

function send(ws, obj) {
  try {
    ws.send(JSON.stringify(obj));
  } catch (err) {
    console.error("send error", err);
  }
}

wss.on("connection", (ws) => {
  const id = uuidv4();
  clients.set(ws, { id, ws, roomId: null, role: null });

  console.log("Client connected:", id);

  // Send ice server info
  send(ws, { type: "server-info", iceServers: ICE_SERVERS });

  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message.toString());
    } catch {
      return;
    }

    const meta = clients.get(ws);

    switch (data.type) {
      case "join": {
        const { roomId, role } = data;
        meta.roomId = roomId;
        meta.role = role;

        if (!rooms.has(roomId)) rooms.set(roomId, new Set());
        rooms.get(roomId).add(ws);

        // notify others
        rooms.get(roomId).forEach((peer) => {
          if (peer !== ws) {
            send(peer, {
              type: "peer-joined",
              peerId: meta.id,
              role: meta.role
            });
          }
        });

        // send existing peers to new client
        const peers = [];
        rooms.get(roomId).forEach((peer) => {
          if (peer !== ws) {
            const pmeta = clients.get(peer);
            peers.push({ peerId: pmeta.id, role: pmeta.role });
          }
        });

        send(ws, {
          type: "joined",
          roomId,
          peers
        });

        break;
      }

      case "offer":
      case "answer":
      case "ice-candidate":
      case "message": {
        const { roomId, to } = data;
        if (!rooms.has(roomId)) return;

        rooms.get(roomId).forEach((peer) => {
          if (peer !== ws && peer.readyState === WebSocket.OPEN) {
            const pmeta = clients.get(peer);
            if (!to || pmeta.id === to) {
              send(peer, data);
            }
          }
        });
        break;
      }
    }
  });

  ws.on("close", () => {
    const meta = clients.get(ws);
    if (meta && rooms.has(meta.roomId)) {
      rooms.get(meta.roomId).delete(ws);

      // notify others
      rooms.get(meta.roomId).forEach((peer) => {
        send(peer, {
          type: "peer-left",
          peerId: meta.id
        });
      });
    }
    clients.delete(ws);
  });
});
