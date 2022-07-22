const protocol = window.location.protocol === "http:" ? "ws://" : "wss://";
const address = protocol + window.location.host + window.location.pathname;
const socket = new WebSocket(address);
socket.onmessage = function (msg) {
    if (msg.data == "reload") window.location.reload();
};