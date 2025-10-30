import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

const TerminalComponent = () => {
  const terminalRef = useRef(null);
  const fitAddon = useRef(null);

  useEffect(() => {
    const candidateId = localStorage.getItem("candidateId");
    const token = localStorage.getItem("access_token");

    if (!candidateId || !token || !terminalRef.current) {
      console.error("❌ Missing candidateId or token for terminal");
      return;
    }

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 16,
      fontFamily: "monospace",
      theme: { background: "#000000", foreground: "#00ff00" },
    });

    fitAddon.current = new FitAddon();
    term.loadAddon(fitAddon.current);
    term.open(terminalRef.current);
    fitAddon.current.fit();
    term.focus();

    term.writeln(`👋 Welcome ${candidateId}`);
    term.writeln(`Connecting to your terminal...`);

    // ✅ Connect via WebSocket with access_token
    // const socket = new WebSocket(`ws://localhost:4000?token=${token}`);
    const socket = new WebSocket(`wss://terminal.logicknots.com?token=${token}`);

    socket.onopen = () => term.writeln("\r\n✅ Connected!\r\n");
    socket.onmessage = (event) => term.write(event.data);
    term.onData((data) => socket.send(data));
    socket.onclose = () =>
      term.write("\r\n\x1b[31mConnection Closed\x1b[0m\r\n");

    // ✅ Resize handling
    const handleResize = () => fitAddon.current && fitAddon.current.fit();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      socket.close();
      term.dispose();
    };
  }, []);

  return <div ref={terminalRef} style={styles.terminalContainer}></div>;
};

const styles = {
  terminalContainer: {
    height: "100%",
    width: "100%",
    backgroundColor: "#000",
  },
};

export default TerminalComponent;
