import React from "react";

export default function RoleSelector({ role, setRole, onExit }) {
  return (
    <div>
      <h3>Choose Role</h3>
      <label>
        <input
          type="radio"
          checked={role === "customer"}
          onChange={() => setRole("customer")}
        />
        Customer
      </label>
      <br />
      <label>
        <input
          type="radio"
          checked={role === "agent"}
          onChange={() => setRole("agent")}
        />
        Agent
      </label>

      {role && (
        <>
          <br />
          <button onClick={onExit}>Exit</button>
        </>
      )}
    </div>
  );
}
