import React, { useEffect, useRef } from "react";

export default function VideoPanel({ role, localStream, remoteStream, onToggleCamera }) {
  const localVideo = useRef();
  const remoteVideo = useRef();

  useEffect(() => {
    if (localVideo.current) {
      localVideo.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideo.current) {
      remoteVideo.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="video-panel">
      <h3>Video Preview</h3>

      <div className="video-area">
        <div className="video-container">
          <h5 className="video-title">{role === "customer" ? "Customer (You)" : "Agent (You)"}</h5>
          <video ref={localVideo} autoPlay muted playsInline />
        </div>
        <div className="video-container">
          <h5 className="video-title">{role === "customer" ? "Agent" : "Customer"}</h5>
          <video ref={remoteVideo} autoPlay playsInline />
        </div>
      </div>

      {role === "customer" && (
        <button onClick={() => onToggleCamera(!localStream)}>
          {localStream ? "Stop Video" : "Share Video (Consent)"}
        </button>
      )}
    </div>
  );
}
