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
    <div>
      <h3>Video Preview</h3>

      <div className="video-area">
        <video ref={localVideo} autoPlay muted playsInline />
        <video ref={remoteVideo} autoPlay playsInline />
      </div>

      {role === "customer" && (
        <button onClick={() => onToggleCamera(!localStream)}>
          {localStream ? "Stop Video" : "Share Video (Consent)"}
        </button>
      )}
    </div>
  );
}
