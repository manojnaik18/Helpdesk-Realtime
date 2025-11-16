import React, { useEffect, useRef, useState } from "react";
import RoleSelector from "./components/RoleSelector";
import ChatPanel from "./components/ChatPanel";
import VideoPanel from "./components/VideoPanel";

const SIGNALING_URL = "ws://localhost:8080";
const ROOM_ID = "helpdesk-room-1";

export default function App() {
  const [role, setRole] = useState(null);
  const [messages, setMessages] = useState([]);
  const [peers, setPeers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const wsRef = useRef(null);
  const pcRef = useRef(null);

  const [iceServers, setIceServers] = useState([]);

  // CONNECT TO SIGNALING SERVER
  useEffect(() => {
    if (!role) return;

    const socket = new WebSocket(SIGNALING_URL);

    socket.onopen = () => {
      setConnected(true);
      socket.send(
        JSON.stringify({
          type: "join",
          roomId: ROOM_ID,
          role
        })
      );
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleSignalMessage(data);
    };

    socket.onclose = () => setConnected(false);

    wsRef.current = socket;
  }, [role]);

  // SEND SIGNAL
  function sendSignal(data) {
    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }

  // HANDLE SIGNAL MESSAGES
  function handleSignalMessage(data) {
    switch (data.type) {
      case "server-info":
        if (data.iceServers) {
          const list = data.iceServers.split(",").map((x) => ({ urls: x.trim() }));
          setIceServers(list);
        }
        break;

      case "joined":
        setPeers(data.peers);
        break;

      case "peer-joined":
        setPeers((prev) => [...prev, { peerId: data.peerId, role: data.role }]);
        break;
      
      case "peer-left":
        setPeers((prev) => prev.filter(p => p.peerId !== data.peerId));
        break;

      case "message":
        setMessages((prev) => [...prev, { from: data.from, text: data.text }]);
        break;

      case "offer":
        handleOffer(data);
        break;

      case "answer":
        handleAnswer(data);
        break;

      case "ice-candidate":
        handleIceCandidate(data);
        break;
    }
  }

  async function ensurePeerConnection() {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection({
      iceServers:
        iceServers.length > 0 ? iceServers : [{ urls: "stun:stun.l.google.com:19302" }]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: "ice-candidate",
          roomId: ROOM_ID,
          from: role,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      const stream = new MediaStream();
      stream.addTrack(event.track);
      setRemoteStream(stream);
    };

    pcRef.current = pc;
    return pc;
  }

  // CUSTOMER: Toggle Camera
  async function toggleCamera(on) {
    if (on) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      setLocalStream(stream);

      const pc = await ensurePeerConnection();

      // ADD TRACKS ONLY ONCE
      const senders = pc.getSenders();

      stream.getTracks().forEach((track) => {
        const exists = senders.some((s) => s.track === track);
        if (!exists) {
          pc.addTrack(track, stream);
        }
      });

      // SEND OFFER
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendSignal({
        type: "offer",
        roomId: ROOM_ID,
        from: role,
        sdp: offer
      });
    } else {
      // STOP STREAM
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
        setLocalStream(null);
      }

      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    }
  }

  async function handleOffer(data) {
    const pc = await ensurePeerConnection();

    await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    sendSignal({
      type: "answer",
      roomId: ROOM_ID,
      from: role,
      sdp: answer
    });
  }

  async function handleAnswer(data) {
    if (!pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
  }

  async function handleIceCandidate(data) {
    if (data.candidate && pcRef.current) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch {}
    }
  }

  function sendChat(text) {
    sendSignal({
      type: "message",
      roomId: ROOM_ID,
      from: role,
      text
    });

    setMessages((prev) => [...prev, { from: role, text }]);
  }

  function handleExit() {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setRole(null);
    setMessages([]);
    setPeers([]);
    setRemoteStream(null);
    setConnected(false);
  }

  return (
    <div className="app">
      {!role ? (
        <RoleSelector role={role} setRole={setRole} />
      ) : (
        <>
          <div className="left">
            <RoleSelector role={role} setRole={setRole} onExit={handleExit} />
            <ChatPanel messages={messages} onSend={sendChat} />
          </div>

          <div className="right">
            <VideoPanel
              role={role}
              localStream={localStream}
              remoteStream={remoteStream}
              onToggleCamera={toggleCamera}
            />

            <h4>Peers :</h4>
            <ul>
              {peers.map((p) => (
                <li key={p.peerId}>
                  {p.peerId} — {p.role}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
