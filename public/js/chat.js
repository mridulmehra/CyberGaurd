const socket = io();

// Elements
const $messageForm = document.querySelector("#message-form");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocationButton = document.querySelector("#send-location");
const $messages = document.querySelector("#messages");

// Templates

const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationTemplate = document.querySelector(
  "#locmessage-template"
).innerHTML;
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


// server (emit) -> client (receive) - countUpdated
// client (emit) -> server (receive) - increment

socket.on("message", (message) => {
  // console.log(message);
  const html = Mustache.render(messageTemplate, {
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format("h:mm a"),
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoScroll();
});

socket.on("locationMessage", (url) => {
  // console.log(url.username);
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

// $messageForm.addEventListener("submit", (e) => {
//   e.preventDefault();

//   // disable form after submit
//   $messageFormButton.setAttribute("disabled", "disabled");

//   //disable

//   const message = $messageFormInput.value;

//   if (message === "") {
//     // enable form after submit
//     $messageFormButton.removeAttribute("disabled");
//     return;
//   }
//   socket.emit("sendMessage", message, (error) => {
//     // enable form after submit
//     $messageFormButton.removeAttribute("disabled");
//     // clear input
//     $messageFormInput.value = "";
//     // focus input
//     $messageFormInput.focus();
//     if (error) {
//       return console.log(error);
//     }
//     // console.log("Message Delivered");
//   });
// });

$messageForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  $messageFormButton.setAttribute("disabled", "disabled");

  const message = $messageFormInput.value.trim();
  if (message === "") {
    $messageFormButton.removeAttribute("disabled");
    return;
  }

  try {
    const response = await fetch("http://localhost:5000/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message })
    });

    let translatedMessage = message;
    if (response.ok) {
      const data = await response.json();
      translatedMessage = data.contents?.translated || message;
    } else {
      console.warn("Translation API failed. Sending original message.");
    }

    socket.emit("sendMessage", translatedMessage, (error) => {
      $messageFormButton.removeAttribute("disabled");
      $messageFormInput.value = "";
      $messageFormInput.focus();
      if (error) console.log(error);
    });

  } catch (error) {
    console.error("Translation API error:", error);
    socket.emit("sendMessage", message); // Fallback to original message
    $messageFormButton.removeAttribute("disabled");
  }
});


document.querySelector("#send-location").addEventListener("click", (e) => {
  e.preventDefault();
  const $sendLocationButton = document.querySelector("#send-location"); // Ensure it's defined inside the scope

  if (!navigator.geolocation) {
    return alert("Geolocation is not supported by your browser");
  }

  navigator.permissions?.query({ name: "geolocation" }).then((res) => {
    if (res.state === "denied") {
      return alert("Please allow permission to send location!");
    }
  }).catch(() => {
    console.warn("Geolocation permission check failed. Proceeding...");
  });

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

socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});

// document.querySelector("#increment").addEventListener("click", (e) => {
//   console.log("clicked");
//   socket.emit("increment");
// });
