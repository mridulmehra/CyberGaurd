const socket = io();

// Elements
const $messageForm = document.querySelector("#message-form");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocationButton = document.querySelector("#send-location");
const $messages = document.querySelector("#messages");

// Templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationTemplate = document.querySelector("#locmessage-template").innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

// Options
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const autoScroll = () => {
  const $newMessage = $messages.lastElementChild;
  if (!$newMessage) return;

  const newMessageStyle = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyle.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  const visibleHeight = $messages.offsetHeight;
  const containerHeight = $messages.scrollHeight;
  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = containerHeight;
  }
};

// Receive Messages
socket.on("message", (message) => {
  const html = Mustache.render(messageTemplate, {
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoScroll();
});

socket.on("locationMessage", (url) => {
  const html = Mustache.render(locationTemplate, {
    username: url.username,
    url: url.url,
    createdAt: moment(url.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoScroll();
});

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room: room,
    users: users,
  });
  document.querySelector("#sidebar").innerHTML = html;
});

// Message Sending
$messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  $messageFormButton.setAttribute("disabled", "disabled");

  const message = $messageFormInput.value.trim();
  if (message === "") {
    $messageFormButton.removeAttribute("disabled");
    return;
  }

  let translatedMessage = message;
  try {
    console.log("Sending message to translation API...");
    const response = await fetch("https://cybergaurd-backend.onrender.com/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    if (response.ok) {
      const data = await response.json();
      translatedMessage = data.contents?.translated || message;
    } else {
      console.warn("Translation API failed. Sending original message.");
    }
  } catch (error) {
    console.error("Translation API error:", error);
  }

  // Ensure message is sent even if translation fails
  socket.emit("sendMessage", translatedMessage, (error) => {
    $messageFormButton.removeAttribute("disabled");
    $messageFormInput.value = "";
    $messageFormInput.focus();
    if (error) console.log(error);
  });
});

// Location Sharing
document.querySelector("#send-location").addEventListener("click", (e) => {
  e.preventDefault();

  if (!navigator.geolocation) {
    return alert("Geolocation is not supported by your browser");
  }

  try {
    navigator.permissions?.query({ name: "geolocation" }).then((res) => {
      if (res.state === "denied") {
        return alert("Please allow permission to send location!");
      }
    }).catch(() => {
      console.warn("Geolocation permission check failed. Proceeding...");
    });
  } catch (error) {
    console.warn("Geolocation permission query not supported");
  }

  navigator.geolocation.getCurrentPosition((position) => {
    $sendLocationButton.setAttribute("disabled", "disabled");

    socket.emit(
      "sendLocation",
      {
        Latitude: position.coords.latitude,
        Longitude: position.coords.longitude,
      },
      () => {
        $sendLocationButton.removeAttribute("disabled");
      }
    );
  }, (error) => {
    alert(`Error getting location: ${error.message}`);
  });
});

// Join Room
socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});
